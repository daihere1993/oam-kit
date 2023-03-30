import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { NodeSSH } from 'node-ssh';
import { getUserDataDir, isRemotePathExist } from '@oam-kit/utility/backend';
import { GitRepo, Repository, SvnRepo } from './repository';
import { ChangedFile } from './changed-file';
import { Channel, Path, Req } from '@oam-kit/decorators';
import { Preferences, Project, RepositoryType, IpcRequest } from '@oam-kit/shared-interfaces';
import { StoreService } from '../../services/store.service';
import { sftp_algorithms } from '../../common/contants/electron-config';
import { AsyncCallTimeoutError, asyncCallWithTimout } from '@oam-kit/utility/common';
import Logger from '@electron/app/core/logger';

const logger = Logger.for('SyncCodeChannel');
const PATCH_PREFIX = 'oamkit';
const LOCAL_DATA_PATH = getUserDataDir();

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

  @Path('')
  public async startSync(@Req request: IpcRequest) {
    this._changedFiles = [];
    this._revertFiles = [];
    this._syncType = SyncType.whole;
    this._project = request.data.project;
    this._repo =
      this._project.versionControl === RepositoryType.SVN
        ? new SvnRepo(this._ssh, this._project.localPath, this._project.remotePath)
        : new GitRepo(this._ssh, this._project.localPath, this._project.remotePath);

    await this.connectServer();
    await this.projectValidation();
    await this.createLocalPatch();
    await this.analyzePatches();
    await this.cleanup();
    await this.uploadPatchToServer();
    await this.applyPatchToServer();
  }

  private async connectServer() {
    try {
      logger.info('connectServer: start');
      if (!this._ssh.isConnected()) {
        const sshInfo = this._storeService.getModel<Preferences>('preferences').get('ssh');
        const connectArgs = {
          host: this._project.serverAddr,
          username: sshInfo.username,
          privateKeyPath: sshInfo.privateKeyPath,
          algorithms: sftp_algorithms,
        };
        await asyncCallWithTimout(this._ssh.connect(connectArgs), 10000, 1, this._ssh.dispose.bind(this._ssh));
      }
      logger.info('connectServer: end');
    } catch (error) {
      if (error instanceof AsyncCallTimeoutError) {
        throw new Error(`Connect to server(${this._project.serverAddr}) timeout`);
      } else {
        throw error;
      }
    }
  }

  private async projectValidation() {
    logger.info('projectValidation: start');
    // Check if remote prject path exists
    const _isRemotePathExist = await isRemotePathExist(this._ssh, this._project.remotePath);
    if (!_isRemotePathExist) {
      throw new Error(`Remote path(${this._project.remotePath}) not exist`);
    }
    logger.info('projectValidation: end');
  }

  private async createLocalPatch(): Promise<void> {
    logger.info('createLocalPatch: start');
    await this._repo.beforePatchCreated(false);
    this._repo.createDiff(this.localOriginalPatchPath, false);
    logger.info('createLocalPatch: end');
  }

  private async analyzePatches(): Promise<any> {
    logger.info('analyzePatches: start');
    this._changedFiles = await this.getChangedFiles();

    // assemble new diff if is partial sychronization
    if (this._syncType === SyncType.partial) {
      const diff = this._repo.assemblePatch(this._changedFiles);
      await promisify(fs.writeFile)(this.assembledPatchPath, diff);
    }
    logger.info('analyzePatches: end');
  }

  private async cleanup(): Promise<void> {
    logger.info('cleanup: start');

    let specificCmd: string;
    if (this._syncType === SyncType.whole && this._repo instanceof GitRepo) {
      specificCmd = 'git reset --hard';
    }

    const revertFiles = [].concat(this._revertFiles);
    this._changedFiles.forEach((file) => {
      if (file.isNeedToRevert) {
        revertFiles.push(file);
      }
    });

    if (revertFiles.length) {
      this._repo.cleanup(revertFiles, true, specificCmd);
    }
    logger.info('cleanup: end');
  }

  private async uploadPatchToServer(): Promise<any> {
    logger.info('uploadPatchToServer: start');
    if (this._syncType === SyncType.whole || this._syncType === SyncType.partial) {
      this._ssh.putFile(this.localFinalPatchPath, this.remotePatchPath);
    }
    logger.info('uploadPatchToServer: end');
  }

  private async applyPatchToServer() {
    logger.info('applyPatchToServer: start');
    if (this._syncType === SyncType.whole || this._syncType === SyncType.partial) {
      await this._repo.applyPatch(this._changedFiles, this.patchName, true);
    }
    logger.info('applyPatchToServer: end');
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
