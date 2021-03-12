import { svnCat } from './fetcher';

describe('fetcher()', () => {
  // change 'test.skip' to 'it' if need to check that svn interaction working fine.
  test.skip('svnCat() should be successful', (done) => {
    svnCat('https://svn.riouxsvn.com/oam-kit-test/locks.conf', { username: 'daihere1993', password: 'z6128519' })
      .then(lockContent => {
        console.log(lockContent);
        done();
      });
  });
});
