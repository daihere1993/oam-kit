import * as path from 'path';
import * as shell from 'shelljs';
import * as fs from 'fs';
import { NodeSSH } from 'node-ssh';
import { promisify } from 'util';
import {
  GeneralModel,
  Project,
  IpcChannel,
  IpcRequest,
  Profile,
  RepositoryType,
  SyncCodeReqData,
  SyncCodeStep,
  SyncCodeResData,
  IpcResErrorType,
} from '@oam-kit/utility/types';
import { getUserDataPath } from '@electron/app/utils';
import { MODEL_NAME, modules as modulesConf, sftp_algorithms } from '@oam-kit/utility/overall-config';
import Logger from '@electron/app/utils/logger';
import { IpcService } from '@electron/app/utils/ipcService';
import { IpcChannelBase } from '../ipcChannelBase';

const moduleConf = modulesConf.syncCode;
const userDataPath = getUserDataPath();
const DIFF_PATH = path.join(userDataPath, moduleConf.diffName);

interface CustomError extends Error {
  failedStep: SyncCodeStep;
}

export default class SyncCodeChannel extends IpcChannelBase {
  logger = Logger.for('SyncCode');
  handlers = [{ name: IpcChannel.SYNC_CODE, fn: this.handle }];

  private project: Project;
  private addedFiles: string[];
  private ssh: NodeSSH = new NodeSSH();
  private nsbAccount: { username: string; password: string };
  private doesUserChange = false;

  startup(): void {
    const gModel = this.store.get<GeneralModel>(MODEL_NAME.GENERAL);
    gModel.subscribe<Profile>('profile', (profile) => {
      if (this.nsbAccount && this.nsbAccount.username !== profile.nsbAccount.username) {
        this.doesUserChange = true;
      }
      this.nsbAccount = profile.nsbAccount;
    });
  }

  private handle(ipcService: IpcService, request: IpcRequest<SyncCodeReqData>): void {
    this.project = request.data.project;
    this.connectServer(ipcService)
      .then(this.createDiff.bind(this, ipcService))
      .then(this.diffAnalysis.bind(this, ipcService))
      .then(this.uploadPatchToServer.bind(this, ipcService))
      .then(this.applyPatchToServer.bind(this, ipcService))
      .then(this.cleanup.bind(this, ipcService))
      .catch((err: CustomError) => {
        if (err.failedStep) {
          ipcService.replyNokWithData<SyncCodeResData>({ step: err.failedStep }, err.message);
        } else {
          ipcService.replyNokWithNoData(err.message, IpcResErrorType.Exception);
        }
      });
  }

  private async connectServer(ipcService: IpcService): Promise<any> {
    this.logger.info('connectServer: start.');

    try {
      if (this.ssh.isConnected() && !this.doesUserChange) {
        this.doesUserChange = false;
        return Promise.resolve();
      } else {
        await this.ssh.connect({
          host: this.project.serverAddr,
          username: this.nsbAccount.username,
          password: this.nsbAccount.password,
          algorithms: sftp_algorithms,
        });
      }
    } catch (error) {
      this.logger.error(error);
      error.failedStep = SyncCodeStep.CONNECT_TO_SERVER;
      throw error;
    } finally {
      this.logger.info('connectServer: done.');
      ipcService.replyOkWithData<SyncCodeResData>({ step: SyncCodeStep.CONNECT_TO_SERVER });
    }
  }

  private async createDiff(ipcService: IpcService): Promise<any> {
    this.logger.info('createDiff: start.');

    const cmd = this.isSvnVersionControl ? `svn di > ${DIFF_PATH}` : `git diff > ${DIFF_PATH}`;

    return new Promise((resolve) => {
      shell.cd(this.project.localPath).exec(cmd, (code, stdout, stderr) => {
        if (code === 0) {
          this.logger.info('createDiff: done.');
          ipcService.replyOkWithData<SyncCodeResData>({ step: SyncCodeStep.CREATE_DIFF });
          resolve(null);
        } else {
          const err = new Error(`Create patch failed: ${stderr}, ${code}.`);
          err.name = SyncCodeStep.CREATE_DIFF;
          throw err;
        }
      });
    });
  }

  /**
   * Analyze diff to do below things:
   * 1. To get files which are created from scratch.
   * (Notice: due to command 'svn revert -R .' can't delete new created file
   * thus we need to know which files are new then execute 'rm ${file name}' to delete those files before apply the new diff.)
   */
  private async diffAnalysis(): Promise<any> {
    this.logger.info('diffAnalysis: start.');
    const diff = (await promisify(fs.readFile)(DIFF_PATH)).toString();
    const changedFiles = this.getChangedFiles(diff);
    this.addedFiles = this.getAddedFiles(changedFiles);
    this.logger.info('diffAnalysis: done.');
  }

  private getAddedFiles(origins: string[]): string[] {
    const addedFiles = [];
    for (const origin of origins) {
      if (origin.includes('(nonexistent)')) {
        addedFiles.push(origin.split('\t')[0]);
      }
    }
    return addedFiles;
  }

  private getChangedFiles(diff: string): string[] {
    const origins = [];
    const sections = diff.split('--- ');
    for (let i = 1; i < sections.length; i++) {
      const sec = sections[i];
      origins.push(sec.split('\r')[0]);
    }
    return origins;
  }

  private async uploadPatchToServer(ipcService: IpcService): Promise<any> {
    this.logger.info('uploadPatchToServer: start.');
    return (
      this.ssh
        // Upload diff file into target remote by ssh
        .putFile(path.join(DIFF_PATH), `${this.project.remotePath}/${moduleConf.diffName}`)
        .then(() => {
          this.logger.info('uploadPatchToServer: done.');
          ipcService.replyOkWithData<SyncCodeResData>({ step: SyncCodeStep.UPLOAD_DIFF });
        })
        .catch((err: Error) => {
          const error = new Error(`Upload patch to server failed: ${err.message}`);
          error.name = SyncCodeStep.UPLOAD_DIFF;
          throw error;
        })
    );
  }

  /**
   * Notice: the older svn don't have command `svn patch`
   */
  private async applyPatchToServer(): Promise<any> {
    this.logger.info('applyPatchToServer: start.');
    const cmd = this.preparePatchCmd();
    return this.ssh.execCommand(cmd, { cwd: this.project.remotePath }).then(({ stdout }) => {
      if (stdout.includes('conflicts:') || stdout.includes('rejected hunk')) {
        const error = new Error(`Apply patch to server failed: ${stdout}`);
        error.name = SyncCodeStep.APPLY_DIFF;
        throw error;
      }
      this.logger.info('applyPatchToServer: done.');
    });
  }

  private preparePatchCmd() {
    let cmd = this.isSvnVersionControl ? `svn revert -R .` : `git checkout .`;

    if (this.addedFiles.length > 0) {
      cmd += ' && rm -rf ';
      for (const file of this.addedFiles) {
        cmd += `${file} `;
      }
    }
    cmd += this.isSvnVersionControl ? ` && svn patch ` : ` && git apply `;
    cmd += moduleConf.diffName;
    return cmd;
  }

  private async cleanup(ipcService: IpcService) {
    const cmd = this.isSvnVersionControl ? `` : `git clean -fd`;
    // const cmd = this.isSvnVersionControl ? `svn st | grep '^?' | awk '{print $2}' | xargs rm -rf` : `git clean -fd`;
    return this.ssh.execCommand(cmd, { cwd: this.project.remotePath }).then(({ stderr }) => {
      if (stderr) {
        this.logger.error(`Cleanup failed, %s`, stderr);
      }
      this.logger.info('Cleanup: done.');
      ipcService.replyOkWithData<SyncCodeResData>({ step: SyncCodeStep.APPLY_DIFF });
    });
  }

  private get isSvnVersionControl(): boolean {
    return this.project.versionControl === RepositoryType.SVN;
  }
}
