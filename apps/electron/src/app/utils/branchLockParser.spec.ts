import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { isLocked, getLockReason, parseLocksItems } from './branchLockParser'

const readFile = promisify(fs.readFile);

describe('branchLockParser', () => {
  let lockContent: string; 
  beforeAll(async() => {
    const bytes = await readFile(path.join(__dirname, 'test/locks.conf'));
    lockContent = bytes.toString();
  });
  
  it('isLocked() should be successful', () => {
    expect(isLocked(lockContent, '5G21A')).toBeTruthy();
    expect(isLocked(lockContent, 'trunk')).toBeFalsy();
  });

  it('getLockReason() should be successful', () => {
    expect(getLockReason(lockContent, '5G21A')).toBe('BRANCH LOCKER');
    expect(getLockReason(lockContent, 'test')).toBe('');
  });
});

describe('parseLocksItems', () => {
  it('should be successfuly', () => {
    const items = ['trunk/.* = *()', 'branches/maintenance/5G21A/.* = *()', 'branches/maintenance/SBTSCD00_210301/.* = *()'];
    const result = parseLocksItems(items);
    expect(result).toMatchObject({
      'trunk': true,
      '5G21A': true,
      'SBTSCD00_210301': true,
    });
  });
});
