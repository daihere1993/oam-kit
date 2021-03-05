export function parseLocksItems(items: string[]) {
  const result = {};
  const regex = /(\S+)\s*=\s*(.*)$/;
  for (const item of items) {
    const m = item.match(regex);
    if (m && m[2].trim() === '*()') {
      const reverseStr = [...m[1]].reverse().join('') + '/';
      const branchName = [...reverseStr.match(/(?<=\*\.\/)(.+?)(?=\/)/)[0]].reverse().join('');
      result[branchName] = true;
    }
  }
  return result;
}

function parseLockConf(locksContent: string): string[] {
  let beginIndex = 0;
  const allLines = locksContent.split('\n').filter((s) => !!s);
  const lines = allLines.filter((line) => !line.startsWith('#')).map(line => line.trim());
  for (const [i, line] of lines.entries()) {
    // all lock info under the line of "[btsoam]"
    if (line === '[btsoam]') {
      beginIndex = i + 1;
      break;
    }
  }
  if (!beginIndex) {
    throw new Error('Can not find [btsoam] section in locks.conf');
  }
  let endIndex = lines.length - 1;
  for (let i = beginIndex; i < lines.length; i++) {
    if (lines[i].startsWith('[')) {
      endIndex = i;
      break;
    }
  }
  return lines.slice(beginIndex, endIndex + 1);
}

export function isLocked(locksContent: string, branch: string) {
  const items = parseLockConf(locksContent);
  const lockedBranches = parseLocksItems(items);
  return !!lockedBranches[branch];
}

export function getLockReason(locksContent: string, branch: string): string {
  const allLines = locksContent.split('\n').filter(s => !!s);
  const linesWithReason = allLines.filter(line => line.startsWith('##') && line.includes('reason'));
  for (const line of linesWithReason) {
    const m = line.match(/(?<=\s+)(\w+)(?=\sreason)/);
    if (m && m[0] === branch) {
      return /(?<=reason:)(.*)/.exec(line)[1].trim();
    }
  }
  return '';
}