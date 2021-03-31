import axios from 'axios';
import { IpcChannelInterface } from '@electron/app/interfaces';
import { modelConfig, Profile, ReviewBoard, Store } from '@oam-kit/store';
import { IpcChannel, IPCRequest, IPCResponse } from '@oam-kit/ipc';
import { IpcMainEvent } from 'electron/main';
import { assert } from 'console';

const SVN_COMMIT_TMP = 'http://biedronka.emea.nsn-net.net/r/{RB_ID}/rb_svncommit/ajax/commit/';
const GET_REVIEW_REQUEST_TMP = 'http://biedronka.emea.nsn-net.net/api/review-requests/{RB_ID}/';
const IS_COMMIT_ALLOWED_TMP = 'http://biedronka.emea.nsn-net.net/r/{RB_ID}/rb_svncommit/ajax/is_commit_allowed/';
const SETUP_SVN_CREDENTIALS = 'http://biedronka.emea.nsn-net.net/r/{RB_ID}/rb_svncommit/ajax/encrypt_svn_credentials/';
const SETUP_RBSESSION_URL = 'http://biedronka.emea.nsn-net.net/api/extensions/rbchecklist.extension.Checklist/checklists/';

type PartialRb = Partial<ReviewBoard> & { diffset_revision?: string };

export class RbBase_ {
  protected getRbId(link: string): number {
    const rbId = parseInt(link.match(/\/?(\d+)/)[1]);
    if (Number.isNaN(rbId)) {
      throw new Error(`[oam-kit][getRbId] Can't get RB id from ${link}`);
    }
    return rbId;
  }

  protected isCustomError(error: Error) {
    return error.message.includes('[oam-kit]');
  }

  protected reverseStr(s: string): string {
    return [...s].reverse().join('');
  }

  protected getUrlFromTmp(tmp: string, source: any): string {
    if (typeof source === 'object') {
      tmp.replace(/{(\w+)}/g, (...args) => source[args[1]]);
    } else {
      return tmp.replace(/{(\w+)}/, () => source.toString());
    }
  }
}

export class RbChannel extends RbBase_ implements IpcChannelInterface {
  handlers = [
    { name: IpcChannel.GET_PARTIAL_RB_REQ, fn: this.getPartialRbInfo },
    { name: IpcChannel.IS_RB_READY_REQ, fn: this.isRbReady },
    { name: IpcChannel.SVN_COMMIT_REQ, fn: this.svnCommit },
  ];

  private cookies = '';
  // Cache partialrb for corresponding rb id
  private cachedPartialRb: { [key: string]: PartialRb } = {};

  constructor(private store: Store) {
    super();
  }

  public async getPartialRbInfo(event: IpcMainEvent, req: IPCRequest<string>) {
    const res: IPCResponse<PartialRb> = {};
    const rbId = this.getRbId(req.data);
    try {
      res.isSuccessed = true;
      if (this.haveCachedPartialRb(rbId)) {
        res.data = this.cachedPartialRb[rbId];
      } else {
        await this.initPartialRb(req.data);
        res.data = this.cachedPartialRb[rbId];
      }
    } catch (error) {
      let err = error;
      if (!this.isCustomError(error)) {
        err = new Error(`[oam-kit][getPartialRb] ${error.message}`);
      }
      res.isSuccessed = false;
      res.error = { name: 'getPartialRbInfo', message: err.message };
    } finally {
      event.reply(req.responseChannel, res);
    }
  }

  /**
   * There several steps in there:
   * 1. Set up svn authentication.
   * 2. Send commit request to commit code.
   * 3. Check the committment result.
   * 4. Get the committment revision if it is successful.
   * 5. Response the revision to the front-end.
   */
  public async svnCommit(event: IpcMainEvent, req: IPCRequest<string>) {
    const res: IPCResponse<string> = {};
    try {
      const link = req.data;
      const rbId = this.getRbId(link);
      await this.setupAuthentication(rbId)
      const { message } = await this.sendSvnCommitReq(link);
      this.checkCommitResult(message);
      const revision = await this.getRevision(rbId);
      res.isSuccessed = true;
      res.data = revision;
    } catch (error) {
      let err = error;
      if (!this.isCustomError(error)) {
        err = new Error(`[oam-kit][svnCommit] ${error.message}`);
      }
      res.isSuccessed = false;
      res.error = { name: 'svnCommit', message: err.message };
    } finally {
      event.reply(req.responseChannel, res);
    }
  }

  private async sendSvnCommitReq(link: string) {
    try {
      const url = this.getUrlFromTmp(SVN_COMMIT_TMP, this.getRbId(link));
      const rb = this.cachedPartialRb[this.getRbId(link)];
      const { data } = await axios.post(url, `commit_scope=only_this&diffset_revision=${rb.diffset_revision}`, {
        headers: {
          Referer: link,
          Cookie: this.cookies,
          'X-Requested-With': 'XMLHttpRequest',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      return data;
    } catch(error) {
      let message = error.message;
      if (error.isAxiosError) {
        message = JSON.stringify(error.response.data);
      }
      throw new Error(message);
    }
  }

  /**
   * Check if those mandatory requirement before code committment like: ship number, CI passed, test case have done.
   */
  public async isRbReady(event: IpcMainEvent, req: IPCRequest<string>) {
    const res: IPCResponse<boolean> = {};
    const link = req.data;
    const rbId = this.getRbId(link);
    const url = this.getUrlFromTmp(IS_COMMIT_ALLOWED_TMP, rbId);
    try {
      const { data } = await axios.get(url, { headers: { Referer: link } });
      if (Object.prototype.hasOwnProperty.call(data, 'message')) {
        throw new Error(data.message);
      } else if (Object.prototype.hasOwnProperty.call(data, 'error')) {
        throw new Error(data.error);
      } else {
        res.data = true;
        res.isSuccessed = true;
        this.cachedPartialRb[rbId] = this.cachedPartialRb[rbId] || {};
        this.cachedPartialRb[rbId].diffset_revision = data.diffset_revision;
      }
    } catch (error) {
      let message = error.message;
      if (error.isAxiosError) {
        message = JSON.stringify(error.response.data);
      }
      // if (!this.isCustomError(error)) {
      //   err = new Error(`[oam-kit][isRbReady] ${error.message}`);
      // }
      res.isSuccessed = false;
      res.error = { name: 'isRbReady', message: message };
    } finally {
      event.reply(req.responseChannel, res);
    }
  }

  /**
   * There are different response messages corresponded to different results:
   * 1. Success: {"message": "Review was successfully committed to svn repository"}
   * 2. No authentication: {"message": "No SVN credentials were set by administrator."}
   * 3. Faild: any response except above two
   */
  private checkCommitResult(message: string) {
    if (message.includes('Review was successfully committed to svn repository')) {
      return true;
    }
    throw new Error(message);
  }

  private async getRevision(rbId: number) {
    const { close_description } = await this.getInfoFromReviewRequest(rbId, ['close_description']);
    return (close_description as string).match(/@r(\d+)/)[1].trim();
  }

  private haveCachedPartialRb(rbId: number): boolean {
    return !!(
      rbId in this.cachedPartialRb &&
      this.cachedPartialRb[rbId].repo &&
      this.cachedPartialRb[rbId].repo.repository &&
      this.cachedPartialRb[rbId].branch
    );
  }

  private async initPartialRb(link: string) {
    try {
      const rbId = this.getRbId(link);
      const fields = ['summary', 'links'];
      const info = await this.getInfoFromReviewRequest(rbId, fields);
      const latestDiffUrl = info?.links.latest_diff.href;
      const repoInfoUrl = info?.links.repository.href + 'info/';
      this.cachedPartialRb[rbId] = this.cachedPartialRb[rbId] || {};
      Object.assign(this.cachedPartialRb[rbId], {
        link,
        name: info.summary.match(/(.+):/)[1],
        branch: (await this.getBranchForSpecificRb(latestDiffUrl)),
        repo: {
          name: info?.links.repository.title.toUpperCase(),
          repository: await this.getRepositoryForSpecificRb(repoInfoUrl),
        },
      });
    } catch (error) {
      if (!this.isCustomError(error)) {
        throw new Error(`[oam-kit][initPartialRb] ${error.message}`);
      } else {
        throw error;
      }
    }
  }

  private async getInfoFromReviewRequest(rbId: number, fields: string[]) {
    try {
      const ret: any = {};
      const url = this.getUrlFromTmp(GET_REVIEW_REQUEST_TMP, rbId);
      const { data } = await axios.get(url);
      if (data.stat === 'ok') {
        const reviewRequest = data.review_request;
        for (const field of fields) {
          if (Object.prototype.hasOwnProperty.call(reviewRequest, field)) {
            ret[field] = reviewRequest[field];
          } else {
            console.debug(`[oam-kit][getInfoFromReviewRequest] couldn't find ${field} in review_request`);
          }
        }
        return ret;
      } else {
        throw new Error(`[oam-kit][getInfoFromReviewRequest] data.state is not ok, row response: ${data}`);
      }
    } catch (error) {
      let message = error.message;
      if (error.isAxiosError) {
        message = JSON.stringify(error.response.data);
      }
      throw new Error(message);
      // if (!this.isCustomError(error)) {
      //   throw new Error(`[oam-kit][getInfoFromReviewRequest] ${error.message}`);
      // } else {
      //   throw error;
      // }
    }
  }

  private hasBeenInited(rbId: number): boolean {
    return !!(rbId in this.cachedPartialRb && this.cachedPartialRb[rbId].branch && this.cachedPartialRb[rbId].repo);
  }

  /**
   * Get corresponding branch name for specific rb.
   * @param latestDiffUrl like: http://biedronka.emea.nsn-net.net/api/review-requests/81760/diffs/4
   * @returns like: 5G21A
   */
  private async getBranchForSpecificRb(latestDiffUrl: string): Promise<string> {
    try {
      const { data } = await axios.get(latestDiffUrl);
      if (data.stat === 'ok') {
        const branch = this.getBranchFromBasedir(data.diff?.basedir);
        return branch;
      }
    } catch (error) {
      let message = error.message;
      if (error.isAxiosError) {
        message = JSON.stringify(error.response.data);
      }
      throw new Error(message);
      // if (!this.isCustomError(error)) {
      //   throw new Error(`[oam-kit][getBranchForSpecificRb] ${error.message}`);
      // } else {
      //   throw error;
      // }
    }
  }

  /**
   * Get corresponding repository for specific rb
   * @param repoInfoUrl like: http://biedronka.emea.nsn-net.net/api/repositories/18/info/
   * @returns like: BTS_SC_MOAM_LTE
   */
  private async getRepositoryForSpecificRb(repoInfoUrl: string): Promise<string> {
    try {
      const { data } = await axios.get(repoInfoUrl);
      if (data.stat === 'ok') {
        return this.getRepositoryFromUrl(data.info?.url);
      }
    } catch (error) {
      let message = error.message;
      if (error.isAxiosError) {
        message = JSON.stringify(error.response.data);
      }
      throw new Error(message);
      // if (!this.isCustomError(error)) {
      //   throw new Error(`[oam-kit][getRepositoryForSpecificRb] ${error.message}`);
      // } else {
      //   throw error;
      // }
    }
  }

  private getRepositoryFromUrl(url: string): string {
    return this.reverseStr(this.reverseStr(url).match(/(\w+)\//)[1]);
  }

  /**
   *  get branch from basedir, like: from "/mantanence/5G21A" to get "5G21A"
   */
  private getBranchFromBasedir(basedir: string): string {
    return basedir.includes('/') ? this.reverseStr(this.reverseStr(basedir).match(/(\w+)\//)[1]) : basedir;
  }

  private async setupAuthentication(rbId: number) {
    await this.setupRbSessionId(rbId);
    await this.setupSvnCredentials(rbId);
  }

  private async setupSvnCredentials(rbId: number) {
    const profileModel = this.store.get<Profile>(modelConfig.profile.name);
    const profile = profileModel.data as Profile;
    const url = this.getUrlFromTmp(SETUP_SVN_CREDENTIALS, rbId);
    try {
      const { data } = await axios.post(url, `svn_username=${profile.username}&svn_password=${profile.password}`, {
        headers: {
          Cookie: this.cookies,
          'X-Requested-With': 'XMLHttpRequest',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      for (const [key, value] of Object.entries(data)) {
        this.cookies += `${key}=${value};`;
      }
      assert(this.cookies.includes('svn_username'));
      assert(this.cookies.includes('svn_password'));
    } catch (error) {
      let message = error.message;
      if (error.isAxiosError) {
        message = JSON.stringify(error.response.data);
      }
      throw new Error(message);
      // if (!this.isCustomError(error)) {
      //   throw new Error(`[oam-kit][setupSvnCredentials] ${error.message}`);
      // } else {
      //   throw error;
      // }
    }
  }

  private async setupRbSessionId(rbId: number) {
    const profileModel = this.store.get<Profile>(modelConfig.profile.name);
    const profile = profileModel.data as Profile;
    try {
      const { headers } = await axios.post(SETUP_RBSESSION_URL, `review_request_id=${rbId}`, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${profile.username}:${profile.password}`).toString('base64')}`,
        },
      });
      this.cookies += headers['set-cookie'][0].match(/(.+?);/)[0];
      assert(this.cookies.includes('rbsessionid'));
    } catch (error) {
      let message = error.message;
      if (error.isAxiosError) {
        message = JSON.stringify(error.response.data);
      }
      throw new Error(message);
      // if (!this.isCustomError(error)) {
      //   throw new Error(`[oam-kit][setupRbSessionId] ${error.message}`);
      // } else {
      //   throw error;
      // }
    }
  }
}
