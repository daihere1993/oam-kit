import { IpcChannel, IpcRequest, RepositoryType, KnifeGeneratorReqData, KnifeGeneratorResData } from '@oam-kit/utility/types';
import commandExists from 'command-exists';
import downloadsFolder from 'downloads-folder';
import * as shell from 'shelljs';
import * as fs from 'fs';
import * as path from 'path';
import { zip } from 'zip-a-folder';
import { IpcService } from '@electron/app/utils/ipcService';
import { IpcChannelBase } from '../ipcChannelBase';

export default class KnifeGeneratorChannel extends IpcChannelBase {
  logName = 'KnifeGeneratorChannel';
  handlers = [{ name: IpcChannel.KNIFE_GENERATOR, fn: this.generateKnife }];

  get _downloadsFolderPath(): string {
    return downloadsFolder();
  }

  get _rootPath(): string {
    const rootPath = path.join(downloadsFolder(), 'oam_tmp_folder');
    if (!fs.existsSync(rootPath)) {
      fs.mkdirSync(rootPath);
    }
    return rootPath;
  }

  public async generateKnife(ipcService: IpcService, req: IpcRequest<KnifeGeneratorReqData>) {
    try {
      const isValidEnv = await this.checkEnvironment();
      if (isValidEnv) {
        const repositoryType = this.getRepositoryType(req.data.projectPath);
        const isGit = repositoryType === RepositoryType.GIT;
        if (await this.isValidVersion(req.data.projectPath, req.data.targetVersion, isGit)) {
          const changedFiles = await this.getChangedFiles(req.data.projectPath, isGit);
          await this.createZipFile(changedFiles, req.data.projectPath);
          ipcService.replyOkWithData<KnifeGeneratorResData>({ knifePath: path.join(this._downloadsFolderPath, 'knife.zip') });
        }
      }
    } catch (error) {
      const message = `Failed due to ${error.message}`;
      ipcService.replyNokWithNoData(message);
    }
  }

  /**
   * To check if current environment including "git" and "svn" commands, if not, end current process
   */
  public async checkEnvironment() {
    let isValid: boolean;
    this.logger.info('checkEnvironment: start.');
    try {
      isValid = !!(await commandExists('svn')) && !!(await commandExists('git'));
    } catch (error) {
      isValid = false;
    }
    if (!isValid) {
      const message = `there there is no 'svn' or 'git' command, please make sure 'svn' and 'git' command have been installed`;
      throw new Error(message);
    }
    this.logger.info('checkEnvironment: done.');
    return true;
  }

  public getRepositoryType(projectPath: string): RepositoryType {
    if (this.isGitRepository(projectPath)) {
      return RepositoryType.GIT;
    } else if (this.isSvnRepository(projectPath)) {
      return RepositoryType.SVN;
    }
  }

  public isGitRepository(projectPath: string): boolean {
    return fs.existsSync(`${projectPath}\\.git`);
  }

  public isSvnRepository(projectPath: string): boolean {
    let isSvnRepository: boolean;
    try {
      isSvnRepository = !!this.execCmd(projectPath, 'svn info');
    } catch (error) {
      isSvnRepository = false;
    }
    return isSvnRepository;
  }

  public async isValidVersion(projectPath: string, targetRevision: string, isGit: boolean): Promise<boolean> {
    this.logger.info('isValidVersion: start.');
    const getVersionCmd = isGit ? 'git rev-parse HEAD' : 'svn info --show-item revision';
    const currentRevision = (await this.execCmd(projectPath, getVersionCmd)).replace(/\s*/g, '');
    if (currentRevision !== targetRevision) {
      const message = `the current revision(${currentRevision}) doesn't equal the target revision(${targetRevision}) of knife`;
      throw new Error(message);
    }

    this.logger.info('isValidVersion: done.');
    return true;
  }

  public async getChangedFiles(projectPath: string, isGit: boolean): Promise<string[]> {
    const changedFiles: string[] = [];
    const getModifiedFilesCmd = isGit ? 'git ls-files --modified' : 'svn status | grep M';
    const getUntrackedFilesCmd = isGit ? 'git ls-files --others --exclude-standard' : 'svn status | grep ?';
    if (isGit) {
      const modifiedFiles = (await this.execCmd(projectPath, getModifiedFilesCmd))
        .split('\n')
        .filter((item) => !!item);
      const untrackedFiles = (await this.execCmd(projectPath, getUntrackedFilesCmd))
        .split('\n')
        .filter((item) => !!item);
      changedFiles.push(...modifiedFiles);
      changedFiles.push(...untrackedFiles);
    } else {
      const modifiedFiles = (await this.execCmd(projectPath, getModifiedFilesCmd))
        .split('\n')
        .filter((item) => !!item)
        .map((item) => {
          return item.match(/M(.*)/)[1].trim();
        });
      const untrackedFiles = (await this.execCmd(projectPath, getUntrackedFilesCmd))
        .split('\n')
        .filter((item) => !!item)
        .map((item) => item.match(/\?(.*)/)[1].trim());
      changedFiles.push(...modifiedFiles, ...untrackedFiles);
    }
    return changedFiles;
  }

  public async createZipFile(changedFiles: string[], projectPath: string) {
    try {
      for (const file of changedFiles) {
        this.createFolderForEachChangedFile(file, projectPath);
      }
      const src = this._rootPath;
      const dest = path.join(this._downloadsFolderPath, 'knife.zip');
      await zip(src, dest);
      fs.rmdirSync(this._rootPath, { recursive: true });
    } catch (error) {
      console.log(1);
    }
  }

  public createFolderForEachChangedFile(changedFile: string, projectPath: string) {
    try {
      let currentPath: string;
      const folders = changedFile.split('/').filter((item) => !!item && !item.includes('.'));
      for (const folder of folders) {
        currentPath = currentPath || this._rootPath;
        const folderPath = path.join(currentPath, folder);
        if (!fs.existsSync(folderPath)) {
          fs.mkdirSync(folderPath);
        }
        currentPath = folderPath;
      }

      const src = path.join(projectPath, changedFile);
      const dest = path.join(this._rootPath, changedFile);
      fs.copyFileSync(src, dest);
    } catch (error) {
      const errorMsg = `create folder failed, changedFile: ${changedFile}, error: ${error.message}`;
      this.logger.error(errorMsg);
      throw Error(errorMsg);
    }
  }

  private async execCmd(targetPath: string, cmd: string): Promise<string> {
    return new Promise((resolve, reject) => {
      shell.cd(targetPath).exec(cmd, (code, stdout, stderr) => {
        if (code == 0) {
          resolve(stdout);
        } else {
          reject(new Error(stderr));
        }
      });
    });
  }
}
