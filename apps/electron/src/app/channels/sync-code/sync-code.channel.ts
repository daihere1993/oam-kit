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
import { SyncCodeError } from '@oam-kit/utility/errors';
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

export default class SyncCodeChannel extends IpcChannelBase {
  logName = 'SyncCode';
  handlers = [{ name: IpcChannel.SYNC_CODE, fn: this.handle }];

  private project: Project;
  private ipcService: IpcService;
  private changedFiles: ChangedFiles;
  private ssh: NodeSSH = new NodeSSH();
  private nsbAccount: { username: string; password: string };

  startup(): void {
    const gModel = this.store.get<GeneralModel>(MODEL_NAME.GENERAL);
    gModel.subscribe<Profile>('profile', (profile) => {
      if (this.nsbAccount && this.nsbAccount.username !== profile.nsbAccount.username) {
        if (this.ssh && this.ssh.isConnected()) {
          this.ssh.dispose();
        }
      }
      this.nsbAccount = profile.nsbAccount;
    });

    // W/A: to fix "Exception has occurred: Error: read ECONNRESET"
    process.on('uncaughtException', (err) => {
      console.error(err.stack);
    });
  }

  private async handle(ipcService: IpcService, request: IpcRequest<SyncCodeReqData>) {
    this.ipcService = ipcService;
    this.project = request.data.project;

    try {
      await this.nextStep(SyncCodeStep.CONNECT_TO_SERVER, this.connectServer);
      await this.nextStep(SyncCodeStep.CREATE_DIFF, this.createDiff);
      await this.nextStep(SyncCodeStep.DIFF_ANALYZE, this.diffAnalyze);
      await this.nextStep(SyncCodeStep.CLEAN_UP, this.cleanup);
      await this.nextStep(SyncCodeStep.UPLOAD_DIFF, this.uploadPatchToServer);
      await this.nextStep(SyncCodeStep.APPLY_DIFF, this.applyPatchToServer);
    } catch (error) {
      if (error.step) {
        ipcService.replyNokWithData<SyncCodeResData>({ step: error.step }, error.message);
      } else {
        ipcService.replyNokWithNoData(error.message, IpcResErrorType.Exception);
      }
    }
  }

  private async nextStep(step: SyncCodeStep, handler: () => Promise<void>) {
    try {
      this.logger.info(`${step}: start.`);
      await handler.call(this);
      this.ipcService.replyOkWithData<SyncCodeResData>({ step });
    } catch (error) {
      throw new SyncCodeError(this.logger, step, error.message);
    } finally {
      this.logger.info(`${step}: done.`);
    }
  }

  private async connectServer() {
    if (!this.ssh.isConnected()) {
      await this.ssh.connect({
        host: this.project.serverAddr,
        username: this.nsbAccount.username,
        password: this.nsbAccount.password,
        algorithms: sftp_algorithms,
      });
    }
    // Check if remote prject exists
    await isRemotePathExist(this.ssh, this.project.remotePath);
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

  private async createDiff(): Promise<void> {
    await this.beforeDiffCreated();

    return new Promise((resolve) => {
      const cmd = this.isSvn ? `svn di > ${DIFF_PATH}` : `git diff > ${DIFF_PATH}`;
      shell.cd(this.project.localPath).exec(cmd, (code, stdout, stderr) => {
        if (code === 0) {
          resolve();
        } else {
          throw  new Error(stderr);
        }
      });
    });
  }

  private async addOrRemoveSvnFiles(): Promise<void> {
    let cmd: string;
    const newFiles = await this.getCertainTypeSvnFiles(SvnFileType.NEW);
    const missingFiles = await this.getCertainTypeSvnFiles(SvnFileType.MISSING);

    if (newFiles.length === 0 && missingFiles.length === 0) {
      return Promise.resolve();
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
          resolve();
        } else {
          const err = new Error(`beforeDiffCreated() failed: ${stderr}, ${code}.`);
          err.name = SyncCodeStep.CREATE_DIFF;
          throw err;
        }
      });
    });
  }

  private async addUntrackedGitFiles(): Promise<void> {
    return new Promise((resolve) => {
      shell.cd(this.project.localPath).exec('git ls-files --others --exclude-standard', (code, stdout) => {
        if (code === 0) {
          const untrackedFiles = stdout.replace(/\n/g, ' ');
          shell.cd(this.project.localPath).exec(`git add -N ${untrackedFiles}`, () => {
            resolve();
          });
        }
      });
    });
  }

  /**
   * diffAnalysis() would collect each type(normal, new, deleted, renamed) of files,
   * which would be useful for revertting server's changes
   */
  private async diffAnalyze(): Promise<any> {
    this.changedFiles = await getChangedFiles(DIFF_PATH, this.isSvn);
  }

  private async uploadPatchToServer(): Promise<any> {
    return this.ssh.putFile(path.join(DIFF_PATH), `${this.project.remotePath}/${moduleConf.diffName}`);
  }

  /**
   * Notice: the older svn don't have command `svn patch`
   */
  private async applyPatchToServer() {
    let cmd: string;

    if (this.isSvn) {
      cmd = `svn patch ${moduleConf.diffName}`;
    } else {
      cmd = `git apply ${moduleConf.diffName}`;

      if (Object.keys(this.changedFiles).length) {
        // git add "new file" and "renamed file"
        cmd += '  && git add -N ';
        for (const [filePath, changedType] of Object.entries(this.changedFiles)) {
          if (changedType === ChangedFileType.NEW || changedType === ChangedFileType.RENAME) {
            cmd += filePath + ' ';
          }
        }
        cmd.trim();
      }
    }

    return this.ssh.execCommand(cmd, { cwd: this.project.remotePath }).then(({ stdout }) => {
      if (stdout.includes('conflicts:') || stdout.includes('rejected hunk')) {
        Promise.reject(stdout);
      }
    });
  }

  private async cleanup(): Promise<void> {
    let cmd: string;

    if (this.isSvn) {
      cmd = 'svn revert -R .';
      if (Object.keys(this.changedFiles).length) {
        cmd += ' && rm -rf ';
        for (const [filePath, changedType] of Object.entries(this.changedFiles)) {
          if (changedType === ChangedFileType.NEW) {
            cmd += filePath + ' ';
          }
        }
        cmd.trim();
      }
    } else {
      cmd = 'git reset --hard';
    }

    return this.ssh.execCommand(cmd, { cwd: this.project.remotePath }).then(({ stderr }) => {
      if (stderr) {
        Promise.reject(stderr);
      } else {
        Promise.resolve();
      }
    });
  }

  private get isSvn(): boolean {
    return this.project.versionControl === RepositoryType.SVN;
  }
}
