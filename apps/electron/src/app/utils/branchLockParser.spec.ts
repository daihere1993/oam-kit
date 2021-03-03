import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { isLocked, getLockReason } from './branchLockParser'

const readFile = promisify(fs.readFile);

describe('branchLockParser', () => {
  let lockContent: string; 
  beforeAll(async() => {
    const bytes = await readFile(path.join(__dirname, 'test/locks.conf'));
    lockContent = bytes.toString();
  });
  
  it('isLocked() should be successful', () => {
    expect(isLocked(lockContent, '5G21A')).toBeTruthy;
    expect(isLocked(lockContent, 'trunk')).toBeFalsy;
  });

  it('getLockReason() should be successful', () => {
    expect(getLockReason(lockContent, '5G21A')).toBe('BRANCH LOCKER');
    expect(getLockReason(lockContent, 'test')).toBe('');
  });
});
