import { ChangedFile, ChangedFileType } from './changedFile';

export abstract class PatchChecker {
  protected abstract isNewFile(patchContent: string): boolean;
  protected abstract isDeletedFile(patchContent: string): boolean;
  protected abstract isRenamedFile(patchContent: string): boolean;
  protected abstract getChangedFilePath(patchContent: string): string;
  protected abstract getOriginalFilePath(patchContent: string): string;
  protected abstract getSections(patchContent: string): string[];

  async getChangedFiles(patchContent: string): Promise<ChangedFile[]> {
    const ret: ChangedFile[] = [];
    const sections = this.getSections(patchContent);

    for (const section of sections) {
      const content = section;
      if (this.isNewFile(section)) {
        ret.push(
          new ChangedFile({
            path: this.getChangedFilePath(content),
            originalPath: this.getOriginalFilePath(content),
            type: ChangedFileType.create,
            content,
          })
        );
      } else if (this.isDeletedFile(content)) {
        ret.push(
          new ChangedFile({
            path: this.getChangedFilePath(content),
            originalPath: this.getOriginalFilePath(content),
            type: ChangedFileType.delete,
            content,
          })
        );
      } else if (this.isRenamedFile(content)) {
        ret.push(
          new ChangedFile({
            path: this.getChangedFilePath(content),
            originalPath: this.getOriginalFilePath(content),
            type: ChangedFileType.rename,
            content,
          })
        );
      } else {
        ret.push(
          new ChangedFile({
            path: this.getChangedFilePath(content),
            originalPath: this.getOriginalFilePath(content),
            type: ChangedFileType.modification,
            content,
          })
        );
      }
    }

    return ret;
  }
}

export class GitPatchChecker extends PatchChecker {
  isNewFile(patchContent: string): boolean {
    const rows = patchContent.split('\n');
    return rows[1].includes('new file mode');
  }

  isDeletedFile(patchContent: string): boolean {
    const rows = patchContent.split('\n');
    return rows[1].includes('deleted file mode');
  }

  isRenamedFile(patchContent: string): boolean {
    const file = this.getChangedFilePath(patchContent);
    const originalFile = this.getOriginalFilePath(patchContent);

    return patchContent.includes(`rename from ${originalFile}`) && patchContent.includes(`rename to ${file}`);
  }

  getChangedFilePath(patchContent: string): string {
    const rows = patchContent.split('\n');
    return rows[0].match(/ b\/(.*)/)[1];
  }

  getOriginalFilePath(patchContent: string): string {
    const rows = patchContent.split('\n');
    return rows[0].match(/ a\/(.*)b\//)[1].trim();
  }

  getSections(patchContent: string): string[] {
    const splitKey = 'diff --git ';
    const sections = patchContent.split(splitKey).map((s) => splitKey + s);
    sections.shift();
    return sections;
  }
}

export class SvnPatchChecker extends PatchChecker {
  isNewFile(patchContent: string): boolean {
    const rows = patchContent.split('\n');
    return rows[1].includes('nonexistent');
  }

  isDeletedFile(patchContent: string): boolean {
    const rows = patchContent.split('\n');
    return rows[1].includes('revision') && rows[2].includes('nonexistent');
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  isRenamedFile(patchContent: string): boolean {
    return false;
  }

  getChangedFilePath(patchContent: string): string {
    const rows = patchContent.split('\n');
    return rows[1].match(/--- (.*)\t/)[1];
  }

  getOriginalFilePath(patchContent: string): string {
    const rows = patchContent.split('\n');
    return rows[1].match(/--- (.*)\t/)[1];
  }

  getSections(patchContent: string): string[] {
    const sections = patchContent.split('===================================================================');
    sections.shift();
    return sections;
  }
}
