import { Profile } from '@oam-kit/utility/types';
import gerritBranchLock from './gerritBranchLock';

const profile: Partial<Profile> = {
  nsbAccount: {
    username: 'zowu',
    password: 'fengyaoZ61285196'
  }
}

describe('getLockStatus()', () => {
  it('should return right lock status', async (done) => {
    const lockStatus = await gerritBranchLock.getLockStatus(profile as Profile, 'master', 'moam');
    expect(lockStatus.locked).toBeFalsy();
    expect(lockStatus.lockMsg).toBe('');
    done();
  });
});
