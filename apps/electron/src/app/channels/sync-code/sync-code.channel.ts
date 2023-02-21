import fs from 'fs';
import path from 'path';
import { promisify } from 'util';
import { NodeSSH } from 'node-ssh';
import { getUserDataPath, isRemotePathExist } from '@oam-kit/utility/backend';
import { GitRepo, Repository, SvnRepo } from './repository';
import { ChangedFile } from './changed-file';
import { Channel, IpcEvent, Path, Req } from '@oam-kit/decorators';
import { Preferences, Project, RepositoryType, IpcResponse, IpcResponseCode, IpcRequest, SyncCodeStep } from '@oam-kit/shared-interfaces';
import { StoreService } from '../../services/store.service';
import { sftp_algorithms } from '../../common/contants/electron-config';
import { IpcMainEvent } from 'electron';
import { IpcException } from '../../common/exceptions/ipc.exception';
import Logger from '../../../app/core/logger';

const logger = Logger.for('sync-code');
const PATCH_PREFIX = 'oamkit';
const LOCAL_DATA_PATH = getUserDataPath();

enum SyncType {
  whole,
  partial,
  revert,
  skip,
}

@Channel('sync_code')
export class SyncCodeChannel {
  private _project: Project;
  private _repo: Repository;
  private _syncType: SyncType;
  private _changedFiles: ChangedFile[];
  private _revertFiles: ChangedFile[];
  private _ssh: NodeSSH = new NodeSSH();
  private _nsbAccount: { username: string; password: string };

  private get localFinalPatchPath() {
    if (this._syncType === SyncType.partial) {
      return this.assembledPatchPath;
    }
    return this.localOriginalPatchPath;
  }

  private get assembledPatchPath() {
    return path.join(LOCAL_DATA_PATH, `${PATCH_PREFIX}_${this._project.name}_assenmbled.diff`);
  }

  private get patchName() {
    return `${PATCH_PREFIX}_${this._project.name}.diff`;
  }

  private get localOriginalPatchPath() {
    return path.join(LOCAL_DATA_PATH, this.patchName);
  }

  private get remotePatchPath() {
    return `${this._project.remotePath}/${this.patchName}`;
  }

  constructor(private _storeService: StoreService) {
    // W/A: to fix "Exception has occurred: Error: read ECONNRESET"
    process.on('uncaughtException', (err) => {
      logger.error(err.stack);
    });
  }

  private async nextStep(step: SyncCodeStep, event: IpcMainEvent, handler: () => Promise<void>) {
    try {
      logger.info(`${step}: start.`);
      const res: IpcResponse = { code: IpcResponseCode.success, data: {step} };

      if (this._syncType === SyncType.skip) {
        logger.info(`${step}: skip this step due to nothing change`);
        event.reply('/sync_code', res);
        return Promise.resolve();
      }

      await handler.call(this);
      event.reply('/sync_code', res);
    } catch (error) {
      const message = error.message || error;
      const ipcError = new IpcException(message);
      ipcError['step'] = step;
      throw ipcError;
    } finally {
      logger.info(`${step}: done.`);
    }
  }
  
  @Path('')
  public async startSync(@Req request: IpcRequest, @IpcEvent event: IpcMainEvent) {
    this._changedFiles = [];
    this._revertFiles = [];
    this._syncType = SyncType.whole;
    this._project = request.data.project;
    this._nsbAccount = this._storeService
      .getModel<Preferences>('preferences')
      .get('profile').nsbAccount;
    this._repo =
      this._project.versionControl === RepositoryType.SVN
        ? new SvnRepo(this._ssh, this._project.localPath, this._project.remotePath)
        : new GitRepo(this._ssh, this._project.localPath, this._project.remotePath);

    try {
      await this.nextStep(SyncCodeStep.CONNECT_TO_SERVER, event, this.connectServer);
      await this.nextStep(SyncCodeStep.CREATE_DIFF, event, this.createLocalPatch);
      await this.nextStep(SyncCodeStep.DIFF_ANALYZE, event, this.analyzePatches);
      await this.nextStep(SyncCodeStep.CLEAN_UP, event, this.cleanup);
      await this.nextStep(SyncCodeStep.UPLOAD_DIFF, event, this.uploadPatchToServer);
      await this.nextStep(SyncCodeStep.APPLY_DIFF, event, this.applyPatchToServer);
    } catch (error) {
      const res: IpcResponse = { code: IpcResponseCode.exception, data: null, description: error.message };
      if (error.step) {
        res.data = { step: error.step };
      }
      event.reply('/sync_code', res);
    }
  }

  private async connectServer() {
    if (!this._ssh.isConnected()) {
      await this._ssh.connect({
        host: this._project.serverAddr,
        username: this._nsbAccount.username,
        password: this._nsbAccount.password,
        algorithms: sftp_algorithms,
      });
    }

    // Check if remote prject path exists
    await isRemotePathExist(this._ssh, this._project.remotePath);
  }

  private async createLocalPatch(): Promise<void> {
    await this._repo.beforePatchCreated(false);
    return this._repo.createDiff(this.localOriginalPatchPath, false);
  }

  private async analyzePatches(): Promise<any> {
    this._changedFiles = await this.getChangedFiles();

    // assemble new diff if is partial sychronization
    if (this._syncType === SyncType.partial) {
      const diff = this._repo.assemblePatch(this._changedFiles);
      await promisify(fs.writeFile)(this.assembledPatchPath, diff);
      return;
    }
  }


  private async cleanup(): Promise<void> {
    let specificCmd: string;
    if (this._syncType === SyncType.whole && this._repo instanceof GitRepo) {
      specificCmd = 'git reset --hard';
    }

    const revertFiles = [].concat(this._revertFiles);
    this._changedFiles.forEach(file => {
      if (file.isNeedToRevert) {
        revertFiles.push(file);
      }
    });

    if (revertFiles.length) {
      return this._repo.cleanup(revertFiles, true, specificCmd);
    }
  }

  private async uploadPatchToServer(): Promise<any> {
    if (this._syncType === SyncType.whole || this._syncType === SyncType.partial) {
      return this._ssh.putFile(this.localFinalPatchPath, this.remotePatchPath);
    }
  }

  private async applyPatchToServer() {
    if (this._syncType === SyncType.whole || this._syncType === SyncType.partial) {
      return this._repo.applyPatch(this._changedFiles, this.patchName, true);
    }
  }

  private async getChangedFiles() {
    let remoteChangeFiles = await this._repo.getRemoteChangedFiles();
    const localChangedFiles = await this.getLocalChangedFiles();

    // means remote repository is clean
    if (remoteChangeFiles.length === 0) {
      if (localChangedFiles.length === 0) {
        this._syncType = SyncType.skip;  
      } else {
        this._syncType = SyncType.whole;
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
        this._revertFiles.push(changedFile);
      }
    }

    if (partialChangedFiles.length) {
      if (haveSameChangeContent) {
        this._syncType = SyncType.partial;
      }
    } else {
      if (this._revertFiles.length) {
        this._syncType = SyncType.revert;
      } else {
        this._syncType = SyncType.skip;
      }
    }

    return partialChangedFiles;
  }

  private async getLocalChangedFiles() {
    const currentDiff = (await promisify(fs.readFile)(this.localOriginalPatchPath)).toString();
    return await this._repo.diffChecker.getChangedFiles(currentDiff);
  }
}