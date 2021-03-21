import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Repo } from '@oam-kit/store';

const GET_REVIEW_REQUEST_TMP = 'http://biedronka.emea.nsn-net.net/api/review-requests/{RB_ID}';
const IS_COMMIT_ALLOWED_TMP = 'http://biedronka.emea.nsn-net.net/r/{RB_ID}/rb_svncommit/ajax/is_commit_allowed/';

interface ArchiveInfo {
  branch?: string;
  repo?: Repo;
  latestDiffUrl?: string;
  repoInfoUrl?: string;
}

@Injectable({providedIn: 'root'})
export class LockInfoService {
  // Cache branch and repo info with corresponding rb id
  private archive: { [key: string]: ArchiveInfo } = {};
  
  constructor(private httpService: HttpClient) {}
  
  public async getBranchByRbLink(link: string): Promise<string> {
    const rbId = this.getRbId(link);
    if (rbId in this.archive && this.archive[rbId].branch) {
      return Promise.resolve(this.archive[rbId].branch);
    }
    this.initArchive(rbId);
    const latestDiffUrl = this.archive[rbId].latestDiffUrl;
    
    const data = await this.httpService.get(latestDiffUrl).toPromise() as any;
    if (data.stat === 'ok') {
      // get branch from basedir, like: from "/mantanence/5G21A" to get "5G21A"
      const branch = this.getBranchFromBasedir(data.diff?.basedir);
      this.archive[rbId].branch = branch;
      return branch;
    } else {
      throw new Error(`Get latest diff failed: ${latestDiffUrl}`);
    }
  }

  public async getRepoByRbLink(link: string): Promise<Repo> {
    const rbId = this.getRbId(link);
    if (rbId in this.archive && this.archive[rbId].repo && this.archive[rbId].repo.repository) {
      return Promise.resolve(this.archive[rbId].repo);
    }
    this.initArchive(rbId);
    const repoInfoUrl = this.archive[rbId].latestDiffUrl;
    const data = await this.httpService.get(repoInfoUrl).toPromise() as any;
    if (data.stat === 'ok') {
      const repository = this.getRepositoryFromUrl(data.info?.url);
      this.archive[rbId].repo.repository = repository;
      return this.archive[rbId].repo;
    } else {
      throw new Error(`Get repo info failed: ${repoInfoUrl}`);
    }
  }

  // public async isRbReady(link: string): Promise<{ ready: boolean, log: string }> {
  //   const rbId = this.getRbId(link);
  //   const url = this.getUrlFromTmp(IS_COMMIT_ALLOWED_TMP, rbId);
  //   const data = await this.httpService.get(url).toPromise();
    
  // }

  private getRepositoryFromUrl(url: string): string {
    return this.reverseStr(this.reverseStr(url).match(/(\w+)\//)[1]);
  }

  private getBranchFromBasedir(basedir: string): string {
    return this.reverseStr(this.reverseStr(basedir).match(/(\w+)\//)[1]);
  }

  private reverseStr(s: string): string {
    return [...s].reverse().join('');
  }

  private initArchive(rbId: number) {
    if (rbId in this.archive && this.archive[rbId].latestDiffUrl && this.archive[rbId].repoInfoUrl) {
      return;
    }
    const reviewRequestUrl = this.getUrlFromTmp(GET_REVIEW_REQUEST_TMP, rbId);
    this.httpService.get(reviewRequestUrl).subscribe((data: any) => {
      if (data.stat === 'ok') {
        const reviewRequest = data.review_request;
        this.archive[rbId] = this.archive[rbId] || {};
        this.archive[rbId].latestDiffUrl = reviewRequest?.links.latest_diff;
        this.archive[rbId].repoInfoUrl = reviewRequest?.links.repository + '/info';
        this.archive[rbId].repo = this.archive[rbId].repo || { name: reviewRequest?.links.repository.title, repository: '' };
      } else {
        throw new Error(`Get review request failed: ${reviewRequestUrl}`);
      }
    });
  }

  private getUrlFromTmp(tmp: string, source: any): string {
    if (typeof source === 'object') {
      tmp.replace(/{(\w)}/g, (...args) => source[args[1]]);
    } else {
      return tmp.replace(/{(\w)}/, () => source.toString());
    }
  }

  private getRbId(link: string): number {
    const rbId = parseInt(link.match(/\/(\d+)/)[1]);
    if (Number.isNaN(rbId)) {
      throw new Error(`Can't get RB id from ${link}`);
    }
    return rbId;
  }
}