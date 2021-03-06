import axios, { AxiosError } from 'axios';
import { assert } from 'console';
import Logger from '../../utils/logger';
import { IpcMainEvent } from 'electron/main';
import { IpcChannelInterface } from '@electron/app/interfaces';
import { IpcChannel, IPCRequest, IPCResponse } from '@oam-kit/utility/types';
import { GeneralModel, ReviewBoard } from '@oam-kit/utility/types';
import { Store } from '@electron/app/store';
import { MODEL_NAME } from '@oam-kit/utility/overall-config';
import { Model } from '@oam-kit/utility/model';

const logger = Logger.for('RbChannel');

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
  private hasAuthenticationReady = false;
  private gModel: Model<GeneralModel>;
  // Cache partialrb for corresponding rb id
  private cachedPartialRb: { [key: string]: PartialRb } = {};

  constructor(private store: Store) {
    super();
    this.gModel = this.store.get<GeneralModel>(MODEL_NAME.GENERAL);
    // if user account got changed, need to resetup anthentication
    this.gModel.subscribe('profile', () => {
      this.hasAuthenticationReady = false;
    });
  }

  public async getPartialRbInfo(event: IpcMainEvent, req: IPCRequest<string>) {
    logger.info('[getPartialRbInfo] start.');
    const res: IPCResponse<PartialRb> = {};
    const rbId = this.getRbId(req.data);
    try {
      res.isSuccessed = true;
      if (this.isCachedRb(rbId)) {
        res.data = this.cachedPartialRb[rbId];
      } else {
        res.data = await this.getPartialRbByAjax(req.data);
        logger.info('[getPartialRbInfo] success.');
      }
    } catch (error) {
      res.isSuccessed = false;
      res.error = { message: error.message };
      logger.error('[getPartialRbInfo] failed: %s', error);
    } finally {
      event.reply(req.responseChannel, res);
    }
  }

  /**
   * Check if those mandatory requirements before code commitment like: ship number, CI passed, test case have done.
   */
  public async isRbReady(event: IpcMainEvent, req: IPCRequest<string>) {
    logger.info('[isRbReady] start.');
    const res: IPCResponse<{ ready: boolean; message?: string }> = {};
    const link = req.data;
    const rbId = this.getRbId(link);
    const url = this.getUrlFromTmp(IS_COMMIT_ALLOWED_TMP, rbId);
    try {
      const { data } = await axios.get(url, { headers: { Referer: link } });
      res.isSuccessed = true;
      res.data = { ready: true };

      // if there is a "message" field in data which means RB is not ready.
      if (Object.prototype.hasOwnProperty.call(data, 'message')) {
        res.data.ready = false;
        res.data.message = data.message;
      } else if (Object.prototype.hasOwnProperty.call(data, 'error')) {
        throw new Error(data.error);
      } else {
        this.cachedPartialRb[rbId] = this.cachedPartialRb[rbId] || {};
        // store diffset_revision which would be used in svn commit request
        this.cachedPartialRb[rbId].diffset_revision = data.diffset_revision;
      }
      logger.info('[isRbReady] success.');
    } catch (error) {
      let message = error.message;
      if (error.isAxiosError && error.response) {
        const { status, data } = error.response;
        message = `${status}, ${JSON.stringify(data)}`;
      }
      res.isSuccessed = false;
      res.error = { message };
      logger.error('[isRbReady] failed: %s', error);
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
    logger.info('[svnCommit] start.');
    const res: IPCResponse<{ revision?: string; message?: string }> = {};
    try {
      const link = req.data;
      const rbId = this.getRbId(link);
      if (!this.hasAuthenticationReady) {
        await this.setupAuthentication(rbId);
      }
      const { message } = await this.sendSvnCommitReq(link);
      this.checkCommitResult(message);
      const revision = await this.getRevision(rbId);
      res.isSuccessed = true;
      res.data = { revision };
      logger.info('[svnCommit] success.');
    } catch (error) {
      // if the error is AxiosError and the status is 400
      // which means commit message in invalid
      if (error.isAxiosError && error.response?.status === 400) {
        error as AxiosError;
        res.isSuccessed = true;
        res.data = { message: (error as AxiosError).response.data?.message };
        logger.error('[svnCommit] there are some commit message issue: %s', error);
      } else {
        res.isSuccessed = false;
        res.error = { message: error.message };
        logger.error('[svnCommit] failed: %s', error);
      }
    } finally {
      event.reply(req.responseChannel, res);
    }
  }

  private async sendSvnCommitReq(link: string) {
    try {
      logger.info('[sendSvnCommitReq] start.');
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
      this.cookies = '';
      logger.info('[sendSvnCommitReq] success.');
      return data;
    } catch (error) {
      logger.error('[sendSvnCommitReq] failed: %s', error);
      throw error;
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
    const { close_description } = await this.getPartialInfo(rbId, ['close_description']);
    return (close_description as string).match(/@r(\d+)/)[1].trim();
  }

  private isCachedRb(rbId: number): boolean {
    return !!(
      rbId in this.cachedPartialRb &&
      this.cachedPartialRb[rbId].repo &&
      this.cachedPartialRb[rbId].repo.repository &&
      this.cachedPartialRb[rbId].branch
    );
  }

  private async getPartialRbByAjax(link: string): Promise<PartialRb> {
    const rbId = this.getRbId(link);
    const fields = ['summary', 'links'];
    const info = await this.getPartialInfo(rbId, fields);
    const latestDiffUrl = info?.links.latest_diff.href;
    const repoInfoUrl = info?.links.repository.href + 'info/';
    const partialRb = {
      link,
      name: info.summary,
      branch: await this.getBranchForSpecificRb(latestDiffUrl),
      repo: {
        name: info?.links.repository.title.toUpperCase(),
        repository: await this.getRepositoryForSpecificRb(repoInfoUrl),
      },
    };
    this.cachedPartialRb[rbId] = partialRb;
    return partialRb;
  }

  private async getPartialInfo(rbId: number, fields: string[]) {
    try {
      logger.info('[getInfoFromReviewRequest] start, rbid: %d, fields: %s', rbId, fields);
      const ret: any = {};
      const url = this.getUrlFromTmp(GET_REVIEW_REQUEST_TMP, rbId);
      const { data } = await axios.get(url);
      if (data.stat === 'ok') {
        const reviewRequest = data.review_request;
        for (const field of fields) {
          if (Object.prototype.hasOwnProperty.call(reviewRequest, field)) {
            ret[field] = reviewRequest[field];
          } else {
            logger.warn("[getInfoFromReviewRequest] couldn't find %s in review_request", field);
          }
        }
        logger.info('[getInfoFromReviewRequest] success');
        return ret;
      } else {
        throw new Error(`[oam-kit][getInfoFromReviewRequest] data.state is not ok, row response: ${data}`);
      }
    } catch (error) {
      const message = error.message;
      logger.info('[getInfoFromReviewRequest] failed: %s', error);
      throw new Error(message);
    }
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
        return this.getBranchFromBasedir(data.diff?.basedir);
      }
    } catch (error) {
      const message = error.message;
      throw new Error(message);
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
      const message = error.message;
      throw new Error(message);
    }
  }

  /**
   * From "https://wrscmi.inside.nsn.com/isource/svnroot/BTS_SC_MOAM_LTE" to get "BTS_SC_MOAM_LTE"
   */
  private getRepositoryFromUrl(url: string): string {
    return this.reverseStr(this.reverseStr(url).match(/(\w+)\//)[1]);
  }

  /**
   *  get branch from basedir
   *  1. from "trunk" or "trunk/" to get "trunk"
   *  2. from "/mantanence/5G21A" to get "5G21A"
   */
  private getBranchFromBasedir(basedir: string): string {
    if (basedir.includes('trunk') || basedir.includes('TRUNK')) {
      return 'trunk';
    } else {
      const tmp = this.reverseStr(basedir).match(/(\w+)\//);
      if (tmp) {
        return this.reverseStr(tmp[1]);
      }
      logger.warn(`couldn't parse branch name for ${basedir}`);
      return basedir;
    }
  }

  private async setupAuthentication(rbId: number) {
    await this.setupRbSessionId(rbId);
    await this.setupSvnCredentials(rbId);
    this.hasAuthenticationReady = true;
  }

  private async setupSvnCredentials(rbId: number) {
    logger.info('[setupSvnCredentials] start');
    const nsbAccount = this.gModel.get('profile').nsbAccount;
    const svnAccount = this.gModel.get('profile').svnAccount;
    const url = this.getUrlFromTmp(SETUP_SVN_CREDENTIALS, rbId);
    try {
      const { data } = await axios.post(url, `svn_username=${nsbAccount.username}&svn_password=${svnAccount.password}`, {
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
      logger.info('[setupSvnCredentials] success.');
    } catch (error) {
      const message = error.message;
      logger.info('[setupSvnCredentials] failed: %s', error);
      throw new Error(message);
    }
  }

  /**
   * To get seesion id by invoke "checklists" request,
   * the seesionid exists in the response header of "set-cookie"
   */
  private async setupRbSessionId(rbId: number) {
    const nsbAccount = this.gModel.get('profile').nsbAccount;
    try {
      const { headers } = await axios.post(SETUP_RBSESSION_URL, `review_request_id=${rbId}`, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Authorization: `Basic ${Buffer.from(`${nsbAccount.username}:${nsbAccount.password}`).toString('base64')}`,
        },
      });
      this.cookies += headers['set-cookie'][0].match(/(.+?);/)[0];
      assert(this.cookies.includes('rbsessionid'));
    } catch (error) {
      const message = error.message;
      throw new Error(message);
    }
  }
}
