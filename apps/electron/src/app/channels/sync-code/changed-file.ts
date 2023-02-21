export enum ChangedFileType {
  modification,
  create,
  rename,
  delete,
}

interface RealChanges {
  newLines: string[];
  deleteLines: string[];
}

interface _ChangedFile {
  path: string;
  originalPath: string;
  type: ChangedFileType;
  content: string;
}

export class ChangedFile {
  path: string;
  content: string;
  originalPath: string;
  type: ChangedFileType;
  isNeedToRevert = false;

  constructor({ path, type, content, originalPath }: _ChangedFile) {
    this.type = type;
    this.path = path;
    this.content = content;
    this.originalPath = originalPath;
  }

  isSameChange(changedFile: ChangedFile, strict = false): boolean {
    const isSameFile = this.path === changedFile.path;
    const isSameType = this.type === changedFile.type;

    if (!isSameFile) {
      return false;
    }

    if (!isSameType) {
      return false;
    }

    if (strict) {
      return this.content === changedFile.content;
    } else {
      const current = this.getRealChanges(this);
      const target = this.getRealChanges(changedFile);
      const isSameNewLines =
        current.newLines.length === target.newLines.length && current.newLines.join('') === target.newLines.join('');
      const isSameDelteLines =
        current.deleteLines.length === target.deleteLines.length && current.deleteLines.join('') === target.deleteLines.join('');

      return isSameNewLines && isSameDelteLines;
    }
  }

  private getRealChanges(changedFile: ChangedFile): RealChanges {
    const ret: RealChanges = { newLines: [], deleteLines: [] };
    const lines = changedFile.content.split('\n');

    // trim unused lines
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line[0] === '@' && line[1] === '@') {
        lines.splice(0, i + 1);
        break;
      }
    }

    lines.forEach((line) => {
      if (line && line[0] === '+') {
        ret.newLines.push(line);
      } else if (line && line[0] === '-') {
        ret.deleteLines.push(line);
      }
    });

    return ret;
  }
}