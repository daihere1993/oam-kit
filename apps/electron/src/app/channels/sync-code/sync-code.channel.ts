import * as path from 'path';
import * as shell from 'shelljs';
import { NodeSSH } from 'node-ssh';
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
  ChangedFileType,
  ChangedFiles,
} from '@oam-kit/utility/types';
import { getChangedFiles, getUserDataPath, isRemotePathExist } from '@electron/app/utils';
import { MODEL_NAME, modules as modulesConf, sftp_algorithms } from '@oam-kit/utility/overall-config';
import { IpcService } from '@electron/app/utils/ipcService';
import { IpcChannelBase } from '../ipcChannelBase';

const moduleConf = modulesConf.syncCode;
const userDataPath = getUserDataPath();
const DIFF_PATH = path.join(userDataPath, moduleConf.diffName);

enum SvnFileType {
  NEW,
  MISSING,
}

interface CustomError extends Error {
  failedStep: SyncCodeStep;
}

export default class SyncCodeChannel extends IpcChannelBase {
  logName = 'SyncCode';
  handlers = [{ name: IpcChannel.SYNC_CODE, fn: this.handle }];

  private project: Project;
  private changedFiles: ChangedFiles;
  private ssh: NodeSSH = new NodeSSH();
  private nsbAccount: { username: string; password: string };
  private isUserChanged = false;

  startup(): void {
    const gModel = this.store.get<GeneralModel>(MODEL_NAME.GENERAL);
    gModel.subscribe<Profile>('profile', (profile) => {
      if (this.nsbAccount && this.nsbAccount.username !== profile.nsbAccount.username) {
        this.isUserChanged = true;
      }
      this.nsbAccount = profile.nsbAccount;
    });
  }

  private handle(ipcService: IpcService, request: IpcRequest<SyncCodeReqData>): void {
    this.project = request.data.project;
    this.connectServer(ipcService)
      .then(this.createDiff.bind(this, ipcService))
      .then(this.diffAnalysis.bind(this, ipcService))
      .then(this.cleanup.bind(this, ipcService))
      .then(this.uploadPatchToServer.bind(this, ipcService))
      .then(this.applyPatchToServer.bind(this, ipcService))
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
      if (!this.ssh.isConnected() || this.isUserChanged) {
        await this.ssh.connect({
          host: this.project.serverAddr,
          username: this.nsbAccount.username,
          password: this.nsbAccount.password,
          algorithms: sftp_algorithms,
        });
      } else {
        this.isUserChanged = false;
      }
      // Check if remote prject exists
      await isRemotePathExist(this.ssh, this.project.remotePath);
      this.logger.info('connectServer: done.');
      ipcService.replyOkWithData<SyncCodeResData>({ step: SyncCodeStep.CONNECT_TO_SERVER });
    } catch (error) {
      this.logger.error(error);
      error.failedStep = SyncCodeStep.CONNECT_TO_SERVER;
      throw error;
    }
  }

  private async getCertainTypeSvnFiles(type: SvnFileType): Promise<string[]> {
    const files: string[] = [];

    return new Promise((resolve) => {
      shell.cd(this.project.localPath).exec('svn st', (code, stdout, stderr) => {
        if (code === 0) {
          let flag: string;
          if (type === SvnFileType.MISSING) {
            flag = '!';
          } else if (type === SvnFileType.NEW) {
            flag = '?';
          }

          const rows = stdout.split('\n');
          for (const row of rows) {
            if (row.startsWith(flag)) {
              const re = new RegExp(`\\${flag}(.*)`);
              files.push(row.match(re)[1].trim());
            }
          }
          resolve(files);
        } else {
          const err = new Error(`getCertainSvnFiles() ${stderr}, ${code}.`);
          err.name = SyncCodeStep.CREATE_DIFF;
          throw err;
        }
      });
    });
  }

  private beforeDiffCreated() {
    if (this.isSvn) {
      return this.addOrRemoveSvnFiles();
    } else {
      return this.addUntrackedGitFiles();
    }
  }

  private async createDiff(ipcService: IpcService): Promise<any> {
    this.logger.info('createDiff: start.');

    await this.beforeDiffCreated();

    const cmd = this.isSvn ? `svn di > ${DIFF_PATH}` : `git diff > ${DIFF_PATH}`;

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

  private async addOrRemoveSvnFiles() {
    let cmd: string;
    const newFiles = await this.getCertainTypeSvnFiles(SvnFileType.NEW);
    const missingFiles = await this.getCertainTypeSvnFiles(SvnFileType.MISSING);

    if (newFiles.length === 0 && missingFiles.length === 0) {
      return Promise.resolve(null);
    }

    if(newFiles.length) {
      cmd = 'svn add ';
      for (const newFile of newFiles) {
        cmd += newFile + ' ';
      }
      cmd.trim();
    }

    if (missingFiles.length) {
      cmd += cmd ? ' && svn rm ' : 'svn rm ';
      for (const missingFile of missingFiles) {
        cmd += missingFile + ' ';
      }
      cmd.trim();
    }

    return new Promise((resolve) => {
      shell.cd(this.project.localPath).exec(cmd, (code, stdout, stderr) => {
        if (code === 0) {
          resolve(null);
        } else {
          const err = new Error(`beforeDiffCreated() failed: ${stderr}, ${code}.`);
          err.name = SyncCodeStep.CREATE_DIFF;
          throw err;
        }
      });
    });
  }

  private async addUntrackedGitFiles() {
    return new Promise((resolve) => {
      shell.cd(this.project.localPath).exec('git ls-files --others --exclude-standard', (code, stdout) => {
        if (code === 0) {
          const untrackedFiles = stdout.replace(/\n/g, ' ');
          shell.cd(this.project.localPath).exec(`git add -N ${untrackedFiles}`, () => {
            resolve(null);
          });
        }
      });
    });
  }

  /**
   * diffAnalysis() would collect each type(normal, new, deleted, renamed) of files,
   * which would be useful for revertting server's changes
   */
  private async diffAnalysis(): Promise<any> {
    this.logger.info('diffAnalysis: start.');
    this.changedFiles = await getChangedFiles(DIFF_PATH, this.isSvn);
    this.logger.info('diffAnalysis: done.');
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
  private async applyPatchToServer(ipcService: IpcService): Promise<any> {
    this.logger.info('applyPatchToServer: start.');

    let cmd: string;

    if (this.isSvn) {
      cmd = `svn patch ${moduleConf.diffName}`;
    } else {
      cmd = `git apply ${moduleConf.diffName} && `;
      // git add "new file" and "renamed file"
      cmd += 'git add -N ';
      for (const [filePath, changedType] of Object.entries(this.changedFiles)) {
        if (changedType === ChangedFileType.NEW || changedType === ChangedFileType.RENAME) {
          cmd += filePath + ' ';
        }
      }
      cmd.trim();
    }

    return this.ssh.execCommand(cmd, { cwd: this.project.remotePath }).then(({ stdout }) => {
      if (stdout.includes('conflicts:') || stdout.includes('rejected hunk')) {
        const error = new Error(`Apply patch to server failed: ${stdout}`);
        error.name = SyncCodeStep.APPLY_DIFF;
        throw error;
      }
      this.logger.info('applyPatchToServer: done.');
      ipcService.replyOkWithData<SyncCodeResData>({ step: SyncCodeStep.APPLY_DIFF });
    });
  }

  private async cleanup() {
    let cmd: string;

    if (this.isSvn) {
      cmd = 'svn revert -R . && rm -rf ';
      for (const [filePath, changedType] of Object.entries(this.changedFiles)) {
        if (changedType === ChangedFileType.NEW) {
          cmd += filePath + ' ';
        }
      }
      cmd.trim();
    } else {
      cmd = 'git reset --hard';
    }

    return this.ssh.execCommand(cmd, { cwd: this.project.remotePath }).then(({ stderr }) => {
      if (stderr) {
        this.logger.error(`Cleanup failed, %s`, stderr);
      }
      this.logger.info('Cleanup: done.');
    });
  }

  private get isSvn(): boolean {
    return this.project.versionControl === RepositoryType.SVN;
  }
}
