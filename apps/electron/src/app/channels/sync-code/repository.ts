import * as fs from 'fs';
import * as shell from 'shelljs';
import { NodeSSH } from 'node-ssh';
import { PatchChecker, GitPatchChecker, SvnPatchChecker } from './patchChecker';
import { ChangedFile, ChangedFileType } from './changedFile';
import { RepositoryType } from '@oam-kit/utility/types';

export abstract class Repository {
  ssh: NodeSSH;
  localRepoPath: string;
  remoteRepoPath: string;
  patchChecker: PatchChecker;

  static WithSSSH(): Repository {
    return
  }

  constructor(ssh: NodeSSH, localRepoPath: string, remoteRepoPath: string) {
    this.ssh = ssh;
    this.localRepoPath = localRepoPath;
    this.remoteRepoPath = remoteRepoPath;
  }

  abstract getCreatePatchCmd(diffPath: string): string;
  abstract beforePatchCreated(isRemote: boolean): Promise<any>;
  abstract applyPatch(changedFiles: ChangedFile[], diffPath: string, isRemote: boolean): Promise<any>;
  abstract cleanup(changedFiles: ChangedFile[], isRemote: boolean, specificCmd: string): Promise<void>;

  static getRepositoryType(path: string): RepositoryType {
    if (fs.existsSync(`${path}\\.git`)) {
      return RepositoryType.Git;
    } else if (fs.existsSync(`${path}\\.svn`)) {
      return RepositoryType.Svn;
    } else {
      return RepositoryType.None;
    }
  }

  assemblePatch(changedFiles: ChangedFile[]): string {
    const contentList = [];
    for (const changedFile of changedFiles) {
      if (changedFile.content) {
        contentList.push(changedFile.content);
      }
    }

    return contentList.join('\n');
  }

  async getRemoteChangedFiles(): Promise<ChangedFile[]> {
    const patchFile = 'tmp.diff';
    await this.createPatch(patchFile, true);
    const patchContent = await this.execRemoteCommand(`cat ${patchFile}`);
    await this.removeFile(patchFile, true);

    return this.patchChecker.getChangedFiles(patchContent);
  }

  async createPatch(file: string, isRemote = false): Promise<any> {
    return this.execCommand(this.getCreatePatchCmd(file), isRemote);
  }

  async removeFile(filePath: string, isRemote = false) {
    if (isRemote) {
      return this.execRemoteCommand(`rm -rf ${filePath}`);
    } else {
      shell.rm('-rf', filePath);
      return Promise.resolve();
    }
  }

  async execCommand(cmd: string, isRemote: boolean) {
    if (isRemote) {
      return this.execRemoteCommand(cmd);
    } else {
      return this.execLocalCommand(cmd);
    }
  }

  async execRemoteCommand(cmd: string): Promise<string> {
    return new Promise((resolve, reject) => {
      this.ssh.execCommand(cmd, { cwd: this.remoteRepoPath }).then(({ code, stderr, stdout }) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(stderr);
        }
      });
    });
  }

  async execLocalCommand(cmd: string): Promise<string> {
    return new Promise((resolve, reject) => {
      shell.cd(this.localRepoPath).exec(cmd, (code, stdout, stderr) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(stderr);
        }
      });
    });
  }
}

export class GitRepo extends Repository {
  patchChecker = new GitPatchChecker();

  getCreatePatchCmd(patchPath: string): string {
    return `git diff > ${patchPath}`;
  }

  // need to 'git add -N {untracked new files}' after that patch could include those changes
  async beforePatchCreated(isRemote: boolean): Promise<any> {
    const untrackedFiles = (await this.execCommand('git ls-files --others --exclude-standard', isRemote)).replace(/\n/g, ' ');

    if (!untrackedFiles) {
      return;
    }

    return this.execCommand(`git add -N ${untrackedFiles}`, isRemote);
  }

  async applyPatch(changedFiles: ChangedFile[], diffPath: string, isRemote: boolean): Promise<any> {
    const gitApplyCmd = `git apply ${diffPath}`;
    // git add "create files" and "rename files"
    let gitAddCmd = 'git add -N';

    for (const changedFile of changedFiles) {
      if (changedFile.type === ChangedFileType.create || changedFile.type === ChangedFileType.rename) {
        gitAddCmd += ` ${changedFile.path}`;
      }
    }

    const cmdList = [gitApplyCmd];
    if (gitAddCmd !== 'git add -N') {
      cmdList.push(gitAddCmd);
    }
    const cmd = cmdList.join(' && ');

    const stdout = await this.execCommand(cmd, isRemote);

    // check if conflict
    if (stdout.includes('rejected hunk')) {
      return Promise.reject(stdout);
    }
  }

  async cleanup(changedFiles: ChangedFile[], isRemote: boolean, specificCmd: string): Promise<any> {
    let cmd: string;

    if (specificCmd) {
      cmd = specificCmd;
    } else {
      let gitRmCmd = 'git rm --cached';
      let rmCmd = 'rm -rf';
      let gitCheckoutCmd = 'git checkout';
      for (const changedFile of changedFiles) {
        switch (changedFile.type) {
          case ChangedFileType.modification:
          case ChangedFileType.delete:
            gitCheckoutCmd += ` ${changedFile.path}`;
            break;
          case ChangedFileType.create:
            gitRmCmd += ` ${changedFile.path}`;
            rmCmd += ` ${changedFile.path}`;
            break;
          case ChangedFileType.rename:
            gitRmCmd += ` ${changedFile.path}`;
            rmCmd += ` ${changedFile.path}`;
            gitCheckoutCmd += ` ${changedFile.originalPath}`;
            break;
        }
      }

      const cmdList = [];
      if (gitRmCmd !== 'git rm --cached') {
        cmdList.push(gitRmCmd);
      }
      if (rmCmd !== 'rm -rf') {
        cmdList.push(rmCmd);
      }
      if (gitCheckoutCmd !== 'git checkout') {
        cmdList.push(gitCheckoutCmd);
      }

      cmd = cmdList.join(' && ');
    }

    return this.execCommand(cmd, isRemote);
  }
}

export class SvnRepo extends Repository {
  patchChecker = new SvnPatchChecker();

  getCreatePatchCmd(patchPath: string): string {
    return `svn di > ${patchPath}`;
  }

  // need to 'svn add {new files}' and 'svn rm {deleted files}' after that diff could include those changes
  async beforePatchCreated(isRemote: boolean): Promise<any> {
    const newFiles = await this.getSpecificTypeFiles(ChangedFileType.create, isRemote);
    const deletedFiles = await this.getSpecificTypeFiles(ChangedFileType.delete, isRemote);

    if (!newFiles.length && !deletedFiles.length) {
      return;
    }

    const cmdList = [];
    let svnAddCmd: string;
    if (newFiles.length) {
      svnAddCmd = 'svn add';
      for (const file of newFiles) {
        svnAddCmd += ` ${file}`;
      }
      cmdList.push(svnAddCmd);
    }

    let svnRmCmd: string;
    if (deletedFiles.length) {
      svnRmCmd = 'svn rm';
      for (const file of deletedFiles) {
        svnRmCmd += ` ${file}`;
      }
      cmdList.push(svnRmCmd);
    }

    return this.execCommand(cmdList.join(' && '), isRemote);
  }

  async applyPatch(changedFiles: ChangedFile[], diffPath: string, isRemote: boolean): Promise<any> {
    const cmd = `svn patch ${diffPath}`;
    const stdout = await this.execCommand(cmd, isRemote);
    // check if conflict
    if (stdout.includes('conflicts:')) {
      return Promise.reject(stdout);
    }
  }

  async cleanup(changedFiles: ChangedFile[], isRemote: boolean, specificCmd: string): Promise<any> {
    let cmd = 'svn revert -R .';
    if (specificCmd) {
      cmd = specificCmd;
    } else {
      if (Object.keys(changedFiles).length) {
        cmd += ' && rm -rf ';
        for (const changedFile of changedFiles) {
          if (changedFile.type === ChangedFileType.create) {
            cmd += changedFile.path + ' ';
          }
        }
        cmd.trim();
      }
    }

    return this.execCommand(cmd, isRemote);
  }

  private async getSpecificTypeFiles(type: ChangedFileType, isRemote: boolean): Promise<string[]> {
    const cmd = 'svn st';
    const files: string[] = [];
    const stdout = await this.execCommand(cmd, isRemote);

    let flag: string;
    if (type === ChangedFileType.delete) {
      flag = '!';
    } else if (type === ChangedFileType.create) {
      flag = '?';
    }

    const rows = stdout.split('\n');
    for (const row of rows) {
      if (row.startsWith(flag)) {
        const re = new RegExp(`\\${flag}(.*)`);
        files.push(row.match(re)[1].trim());
      }
    }

    return files;
  }
}