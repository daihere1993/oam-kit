import * as path from 'path';
import * as shell from 'shelljs';
import * as fs from 'fs';
import * as SftpClient from 'ssh2-sftp-client';
import { promisify } from 'util';
import { IpcChannelInterface } from '@electron/app/interfaces';
import { GeneralModel, Project, IpcChannel, IPCRequest, IPCResponse } from '@oam-kit/utility/types';
import { Store } from '@electron/app/store';
import { SyncCodeStep } from '@oam-kit/sync-code';
import { IpcMainEvent } from 'electron';
import { getUserDataPath } from '@electron/app/utils';
import { MODEL_NAME, modules as modulesConf } from '@oam-kit/utility/overall-config';

const moduleConf = modulesConf.syncCode;
const userDataPath = getUserDataPath();
const DIFF_PATH = path.join(userDataPath, moduleConf.diffName);

type IpcResponse_ = IPCResponse<SyncCodeStep>;

export class SyncCodeChannel implements IpcChannelInterface {
  handlers = [{ name: IpcChannel.SYNC_CODE_REQ, fn: this.handle }];

  private store: Store;
  private project: Project;
  private addedFiles: string[];
  private sftpClient: SftpClient;

  constructor(store: Store) {
    this.store = store;
    this.sftpClient = new SftpClient();
  }

  private handle(event: IpcMainEvent, request: IPCRequest<Project>): void {
    this.project = request.data;
    this.connectServer(event)
      .then(this.createDiff.bind(this, event))
      .then(this.diffAnalysis.bind(this, event))
      .then(this.uploadPatchToServer.bind(this, event))
      .then(this.applyPatchToServer.bind(this, event))
      .catch((err) => {
        console.log(`${err.name} failed: ${err.message}`);
        event.reply(IpcChannel.SYNC_CODE_RES, {
          isSuccessed: false,
          error: { name: err.name, message: err.message },
        });
      });
  }

  private async connectServer(event: IpcMainEvent): Promise<any> {
    console.debug('connectServer: start.');
    return this.sftpClient
      .cwd()
      .catch(() => {
        return this.connectServer_();
      })
      .then(() => {
        console.debug('connectServer: done.');
        const res: IpcResponse_ = { isSuccessed: true, data: SyncCodeStep.CONNECT_TO_SERVER };
        event.reply(IpcChannel.SYNC_CODE_RES, res);
      });
  }

  private async connectServer_(): Promise<any> {
    const gModel = this.store.get<GeneralModel>(MODEL_NAME.GENERAL);
    const nsbAccount = gModel.get('profile').nsbAccount;
    return this.sftpClient
      .connect({
        host: this.project.serverAddr,
        username: nsbAccount.username,
        password: nsbAccount.password,
      })
      .catch((err: Error) => {
        err.name = SyncCodeStep.CONNECT_TO_SERVER;
        throw err;
      });
  }

  private async createDiff(event: IpcMainEvent): Promise<any> {
    console.debug('createDiff: start.');
    return new Promise((resolve) => {
      shell.cd(this.project.localPath).exec(`svn di > ${DIFF_PATH}`, (code, stdout, stderr) => {
        if (code === 0) {
          console.debug('createDiff: done.');
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
   * (Notice: due to command 'svn revert -R .' can't delete new created file thus we need to know which files are new then execute 'rm ${file name}' to delete those files before apply the new diff.)
   */
  private async diffAnalysis(): Promise<any> {
    console.debug('diffAnalysis: start.');
    const diff = (await promisify(fs.readFile)(DIFF_PATH)).toString();
    const changedFiles = this.getChangedFiles(diff);
    this.addedFiles = this.getAddedFiles(changedFiles);
    console.debug('diffAnalysis: done.');
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
      origins.push(sec.split('\r')[0]);``
    }
    return origins;
  }

  private async uploadPatchToServer(event: IpcMainEvent): Promise<any> {
    console.debug('uploadPatchToServer: start.');
    return this.sftpClient
      // Upload diff file into target remote by ssh
      .fastPut(path.join(DIFF_PATH), `${this.project.remotePath}/${moduleConf.diffName}`)
      .then(() => {
        console.debug('uploadPatchToServer: done.');
        const res: IpcResponse_ = { isSuccessed: true, data: SyncCodeStep.UPLOAD_DIFF };
        event.reply(IpcChannel.SYNC_CODE_RES, res);
      })
      .catch((err: Error) => {
        const error = new Error(`Upload patch to server failed: ${err.message}`);
        error.name = SyncCodeStep.UPLOAD_DIFF;
        throw error;
      });
  }

  /**
   * Notice: the older svn don't have command `svn patch`
   */
  private async applyPatchToServer(event: IpcMainEvent): Promise<any> {
    console.debug('applyPatchToServer: start.');
    const { client } = this.sftpClient as any;
    return new Promise((resolve) => {
      let command = `cd ${this.project.remotePath} && svn revert -R .`;

      if (this.addedFiles.length > 0) {
        command += ' && rm -rf ';
        for (const file of this.addedFiles) {
          command += `${file} `;
        }
      }
      command += `&& svn patch ${moduleConf.diffName}`;

      client.exec(command, (err: any, stream: any) => {
        if (err) {
          const error = new Error(`Apply patch to server failed: ${err.message}`);
          error.name = SyncCodeStep.APPLY_DIFF;
          throw error;
        }

        stream
          .on('close', () => {
            console.debug('applyPatchToServer: done.');
            event.reply(IpcChannel.SYNC_CODE_RES, { isSuccessed: true, data: SyncCodeStep.APPLY_DIFF });
            resolve(null);
          })
          .on('data', () => {
            // const output = data.toString();
            // console.debug(`Output: ${output}`);
          })
          .stderr.on('data', (data: any) => {
            const error = new Error(`Apply patch to server failed: ${data}`);
            error.name = SyncCodeStep.APPLY_DIFF;
            throw error;
          });
      });
    });
  }
}
