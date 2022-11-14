import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
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
} from '@oam-kit/utility/types';
import { getUserDataPath, isRemotePathExist } from '@electron/app/utils';
import { SyncCodeError } from '@oam-kit/utility/errors';
import { MODEL_NAME, sftp_algorithms } from '@oam-kit/utility/overall-config';
import { IpcService } from '@electron/app/utils/ipcService';
import { IpcChannelBase } from '../ipcChannelBase';
import { GitRepo, Repository, SvnRepo } from './repository';
import { ChangedFile } from './changedFile';

const LOCAL_DATA_PATH = getUserDataPath();
const PATCH_PREFIX = 'oamkit';

enum SyncType {
  whole,
  partial,
  revert,
  none,
}

export default class SyncCodeChannel extends IpcChannelBase {
  logName = 'SyncCode';
  handlers = [{ name: IpcChannel.SYNC_CODE, fn: this.handle }];

  private project: Project;
  private repo: Repository;
  private syncType: SyncType;
  private changedFiles: ChangedFile[];
  private revertFiles: ChangedFile[];
  private ssh: NodeSSH = new NodeSSH();
  private nsbAccount: { username: string; password: string };

  private get localFinalPatchPath() {
    if (this.syncType === SyncType.partial) {
      return this.assembledPatchPath;
    }
    return this.localOriginalPatchPath;
  }

  private get assembledPatchPath() {
    return path.join(LOCAL_DATA_PATH, `${PATCH_PREFIX}_${this.project.name}_assenmbled.diff`);
  }

  private get patchName() {
    return `${PATCH_PREFIX}_${this.project.name}.diff`;
  }

  private get localOriginalPatchPath() {
    return path.join(LOCAL_DATA_PATH, this.patchName);
  }

  private get remotePatchPath() {
    return `${this.project.remotePath}/${this.patchName}`;
  }

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

  private async nextStep(step: SyncCodeStep, ipcService: IpcService, handler: () => Promise<void>) {
    try {
      this.logger.info(`${step}: start.`);

      if (this.syncType === SyncType.none) {
        this.logger.info(`${step}: skip this step due to nothing change`);
        ipcService.replyOkWithData<SyncCodeResData>({ step });
        return Promise.resolve();
      }

      await handler.call(this);
      ipcService.replyOkWithData<SyncCodeResData>({ step });
    } catch (error) {
      const message = error.message || error;
      throw new SyncCodeError(this.logger, step, message);
    } finally {
      this.logger.info(`${step}: done.`);
    }
  }

  private async handle(ipcService: IpcService, request: IpcRequest<SyncCodeReqData>) {
    this.changedFiles = [];
    this.revertFiles = [];
    this.syncType = SyncType.whole;
    this.project = request.data.project;
    this.repo =
      this.project.versionControl === RepositoryType.SVN
        ? new SvnRepo(this.ssh, this.project.localPath, this.project.remotePath)
        : new GitRepo(this.ssh, this.project.localPath, this.project.remotePath);

    try {
      await this.nextStep(SyncCodeStep.CONNECT_TO_SERVER, ipcService, this.connectServer);
      await this.nextStep(SyncCodeStep.CREATE_DIFF, ipcService, this.createLocalPatch);
      await this.nextStep(SyncCodeStep.DIFF_ANALYZE, ipcService, this.analyzePatches);
      await this.nextStep(SyncCodeStep.CLEAN_UP, ipcService, this.cleanup);
      await this.nextStep(SyncCodeStep.UPLOAD_DIFF, ipcService, this.uploadPatchToServer);
      await this.nextStep(SyncCodeStep.APPLY_DIFF, ipcService, this.applyPatchToServer);
    } catch (error) {
      if (error.step) {
        ipcService.replyNokWithData<SyncCodeResData>({ step: error.step }, error.message);
      } else {
        ipcService.replyNokWithNoData(error.message, IpcResErrorType.Exception);
      }
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

    // Check if remote prject path exists
    await isRemotePathExist(this.ssh, this.project.remotePath);
  }

  private async createLocalPatch(): Promise<void> {
    await this.repo.beforePatchCreated(false);
    return this.repo.createDiff(this.localOriginalPatchPath, false);
  }

  private async analyzePatches(): Promise<any> {
    this.changedFiles = await this.getChangedFiles();

    // assemble new diff if is partial sychronization
    if (this.syncType === SyncType.partial) {
      const diff = this.repo.assemblePatch(this.changedFiles);
      await promisify(fs.writeFile)(this.assembledPatchPath, diff);
      return;
    }
  }


  private async cleanup(): Promise<void> {
    let specificCmd: string;
    if (this.syncType === SyncType.whole && this.repo instanceof GitRepo) {
      specificCmd = 'git reset --hard';
    }

    const revertFiles = [].concat(this.revertFiles);
    this.changedFiles.forEach(file => {
      if (file.isNeedToRevert) {
        revertFiles.push(file);
      }
    });

    if (revertFiles.length) {
      return this.repo.cleanup(revertFiles, true, specificCmd);
    }
  }

  private async uploadPatchToServer(): Promise<any> {
    if (this.syncType === SyncType.whole || this.syncType === SyncType.partial) {
      return this.ssh.putFile(this.localFinalPatchPath, this.remotePatchPath);
    }
  }

  private async applyPatchToServer() {
    if (this.syncType === SyncType.whole || this.syncType === SyncType.partial) {
      return this.repo.applyPatch(this.changedFiles, this.patchName, true);
    }
  }

  private async getChangedFiles() {
    let remoteChangeFiles = await this.repo.getRemoteChangedFiles();
    const localChangedFiles = await this.getLocalChangedFiles();

    // means remote repository is clean
    if (remoteChangeFiles.length === 0) {
      if (localChangedFiles.length === 0) {
        this.syncType = SyncType.none;  
      } else {
        this.syncType = SyncType.whole;
      }
      return localChangedFiles;
    }

    let haveSameChangeContent = false;
    const partialChangedFiles: ChangedFile[] = [];

    for (const lcf of localChangedFiles) {
      let matched = false;
      remoteChangeFiles = remoteChangeFiles.filter((rcf) => {
        const isSameFile = lcf.path === rcf.path;
        const isSameChangeContent = lcf.isSameChange(rcf);

        if (isSameChangeContent) {
          matched = true;
          haveSameChangeContent = true;
        } else if (isSameFile) {
          matched = true;
          lcf.isNeedToRevert = true;
          partialChangedFiles.push(lcf);
        }

        return !isSameFile;
      });

      if (!matched) {
        partialChangedFiles.push(lcf);
      }
    }

    // left remoteChangeFiles should all be reverted
    if (remoteChangeFiles.length) {
      for (const changedFile of remoteChangeFiles) {
        changedFile.content = null;
        this.revertFiles.push(changedFile);
      }
    }

    if (partialChangedFiles.length) {
      if (haveSameChangeContent) {
        this.syncType = SyncType.partial;
      }
    } else {
      if (this.revertFiles.length) {
        this.syncType = SyncType.revert;
      } else {
        this.syncType = SyncType.none;
      }
    }

    return partialChangedFiles;
  }

  private async getLocalChangedFiles() {
    const currentDiff = (await promisify(fs.readFile)(this.localOriginalPatchPath)).toString();
    return await this.repo.diffChecker.getChangedFiles(currentDiff);
  }
}
