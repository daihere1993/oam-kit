import * as path from 'path';
import * as shell from 'shelljs';
import * as fs from 'fs';
import { NodeSSH } from 'node-ssh';
import { promisify } from 'util';
import { IpcChannelInterface } from '@electron/app/interfaces';
import { GeneralModel, Project, IpcChannel, IPCRequest, IPCResponse, Profile } from '@oam-kit/utility/types';
import { Store } from '@electron/app/store';
import { SyncCodeStep } from '@oam-kit/sync-code';
import { IpcMainEvent } from 'electron';
import { getUserDataPath } from '@electron/app/utils';
import { MODEL_NAME, modules as modulesConf, sftp_algorithms } from '@oam-kit/utility/overall-config';
import Logger from '@electron/app/utils/logger';

const logger = Logger.for('SyncCode');
const moduleConf = modulesConf.syncCode;
const userDataPath = getUserDataPath();
const DIFF_PATH = path.join(userDataPath, moduleConf.diffName);

type IpcResponse_ = IPCResponse<SyncCodeStep>;

export class SyncCodeChannel implements IpcChannelInterface {
  handlers = [{ name: IpcChannel.SYNC_CODE_REQ, fn: this.handle }];

  private project: Project;
  private addedFiles: string[];
  private ssh: NodeSSH = new NodeSSH();
  private nsbAccount: { username: string; password: string };

  constructor(private store: Store) {
    const gModel = this.store.get<GeneralModel>(MODEL_NAME.GENERAL);
     gModel.subscribe<Profile>('profile', (profile) => {
      this.nsbAccount = profile.nsbAccount;
     });
  }

  private handle(event: IpcMainEvent, request: IPCRequest<Project>): void {
    this.project = request.data;
    this.connectServer(event)
      .then(this.createDiff.bind(this, event))
      .then(this.diffAnalysis.bind(this, event))
      .then(this.uploadPatchToServer.bind(this, event))
      .then(this.applyPatchToServer.bind(this, event))
      .catch((err) => {
        logger.error(`${err.name} failed: ${err.message}`);
        event.reply(IpcChannel.SYNC_CODE_RES, {
          isSuccessed: false,
          error: { name: err.name, message: err.message },
        });
      });
  }

  private async connectServer(event: IpcMainEvent): Promise<any> {
    logger.info('connectServer: start.');

    try {
      if (this.ssh.isConnected()) {
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
      logger.error(error);
      error.name = SyncCodeStep.CONNECT_TO_SERVER;
      throw error;
    } finally {
      logger.info('connectServer: done.');
      const res: IpcResponse_ = { isSuccessed: true, data: SyncCodeStep.CONNECT_TO_SERVER };
      event.reply(IpcChannel.SYNC_CODE_RES, res);
    }
  }

  private async createDiff(event: IpcMainEvent): Promise<any> {
    logger.info('createDiff: start.');
    return new Promise((resolve) => {
      shell.cd(this.project.localPath).exec(`svn di > ${DIFF_PATH}`, (code, stdout, stderr) => {
        if (code === 0) {
          logger.info('createDiff: done.');
          event.reply(IpcChannel.SYNC_CODE_RES, { isSuccessed: true, data: SyncCodeStep.CREATE_DIFF });
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
    logger.info('diffAnalysis: start.');
    const diff = (await promisify(fs.readFile)(DIFF_PATH)).toString();
    const changedFiles = this.getChangedFiles(diff);
    this.addedFiles = this.getAddedFiles(changedFiles);
    logger.info('diffAnalysis: done.');
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

  private async uploadPatchToServer(event: IpcMainEvent): Promise<any> {
    logger.info('uploadPatchToServer: start.');
    return (
      this.ssh
        // Upload diff file into target remote by ssh
        .putFile(path.join(DIFF_PATH), `${this.project.remotePath}/${moduleConf.diffName}`)
        .then(() => {
          logger.info('uploadPatchToServer: done.');
          const res: IpcResponse_ = { isSuccessed: true, data: SyncCodeStep.UPLOAD_DIFF };
          event.reply(IpcChannel.SYNC_CODE_RES, res);
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
  private async applyPatchToServer(event: IpcMainEvent): Promise<any> {
    logger.info('applyPatchToServer: start.');
    const command = this.preparePatchCmd();
    return this.ssh.execCommand(command, { cwd: this.project.remotePath }).then(({ stdout, stderr }) => {
      if (stderr) {
        const error = new Error(`Apply patch to server failed: ${stdout}`);
        error.name = SyncCodeStep.APPLY_DIFF;
        throw error;
      }
      logger.info('applyPatchToServer: done.');
      event.reply(IpcChannel.SYNC_CODE_RES, { isSuccessed: true, data: SyncCodeStep.APPLY_DIFF });
    });
  }

  private preparePatchCmd() {
    let cmd = `svn revert -R .`;

    if (this.addedFiles.length > 0) {
      cmd += ' && rm -rf ';
      for (const file of this.addedFiles) {
        cmd += `${file} `;
      }
    }
    cmd += `&& svn patch ${moduleConf.diffName}`;
    return cmd;
  }
}
