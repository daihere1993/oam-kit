import fs from 'fs';
import path from 'path';
import shell from 'shelljs';
import downloadsFolder from 'downloads-folder';
import { zip } from 'zip-a-folder';
import { Channel, Path, Req } from '@oam-kit/decorators';
import { RepositoryType, IpcRequest } from '@oam-kit/shared-interfaces';
import Logger from '../core/logger';

const logger = Logger.for('KnifeGeneratorChannel');

@Channel('knife_generator')
export class KnifeGeneratorChannel {
  private get _downloadsFolderPath(): string {
    return downloadsFolder();
  }

  private get _rootPath(): string {
    const rootPath = path.join(this._downloadsFolderPath, 'oam_tmp_folder');
    if (!fs.existsSync(rootPath)) {
      fs.mkdirSync(rootPath);
    }
    return rootPath;
  }

  @Path('')
  public async createKnifeZip(@Req req: IpcRequest) {
    const repositoryType = this.getRepositoryType(req.data.projectPath);
    const isGit = repositoryType === RepositoryType.GIT;
    if (await this.isValidVersion(req.data.projectPath, req.data.targetVersion, isGit)) {
      const changedFiles = await this.getChangedFiles(req.data.projectPath, isGit);
      await this.createZipFile(changedFiles, req.data.projectPath);
      return { knifePath: path.join(this._downloadsFolderPath, 'knife.zip') };
    }
  }

  private getRepositoryType(projectPath: string): RepositoryType {
    if (this.isGitRepository(projectPath)) {
      return RepositoryType.GIT;
    } else if (this.isSvnRepository(projectPath)) {
      return RepositoryType.SVN;
    }
  }

  private isGitRepository(projectPath: string): boolean {
    const gitFolderPath = path.join(projectPath, '.git');
    logger.info(gitFolderPath);
    return fs.existsSync(path.join(projectPath, '.git'));
  }

  private isSvnRepository(projectPath: string): boolean {
    let isSvnRepository: boolean;
    try {
      isSvnRepository = !!this.execCmd(projectPath, 'svn info');
    } catch (error) {
      isSvnRepository = false;
    }
    return isSvnRepository;
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

  private async isValidVersion(projectPath: string, targetRevision: string, isGit: boolean): Promise<boolean> {
    logger.info('isValidVersion: start.');
    const getVersionCmd = isGit ? 'git rev-parse HEAD' : 'svn info --show-item revision';
    const currentRevision = (await this.execCmd(projectPath, getVersionCmd)).replace(/\s*/g, '');
    if (currentRevision !== targetRevision) {
      const message = `the current revision(${currentRevision}) doesn't equal the target revision(${targetRevision}) of knife`;
      logger.info(message);
      throw new Error(message);
    }

    logger.info('isValidVersion: done.');
    return true;
  }

  private async getChangedFiles(projectPath: string, isGit: boolean): Promise<string[]> {
    const changedFiles: string[] = [];
    const getModifiedFilesCmd = isGit ? 'git ls-files --modified' : 'svn status | grep M';
    const getUntrackedFilesCmd = isGit ? 'git ls-files --others --exclude-standard' : 'svn status | grep ?';
    if (isGit) {
      const modifiedFiles = (await this.execCmd(projectPath, getModifiedFilesCmd)).split('\n').filter((item) => !!item);
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

  private async createZipFile(changedFiles: string[], projectPath: string) {
    try {
      for (const file of changedFiles) {
        this.createFolderForEachChangedFile(file, projectPath);
      }
      const src = this._rootPath;
      const dest = path.join(this._downloadsFolderPath, 'knife.zip');
      await zip(src, dest);
      fs.rmdirSync(this._rootPath, { recursive: true });
    } catch (error) {
      logger.error(error.message);
    }
  }

  private createFolderForEachChangedFile(changedFile: string, projectPath: string) {
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
      logger.error(errorMsg);
      throw Error(errorMsg);
    }
  }
}
