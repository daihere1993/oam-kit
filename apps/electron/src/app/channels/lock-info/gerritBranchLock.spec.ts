import { AuthInfos } from '@oam-kit/utility/types';
import gerritBranchLock from './gerritBranchLock';

const auth: Partial<AuthInfos> = {
  nsbAccount: {
    username: 'zowu',
    password: 'fengyaoZ61285196'
  }
}

describe.skip('getLockStatus()', () => {
  it('should return right lock status', async (done) => {
    const lockStatus = await gerritBranchLock.getLockStatus(auth as AuthInfos, 'master', 'moam');
    expect(lockStatus.locked).toBeFalsy();
    expect(lockStatus.lockMsg).toBe('');
    done();
  });
});
