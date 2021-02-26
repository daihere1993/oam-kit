export const rendererAppPort = 4200;
export const rendererAppName = 'client';
export const electronAppName = 'electron';
export const updateServerUrl = 'https://deployment-server-url.com'; // TODO: insert your update server url here
export const storeName = 'test.json';

/** Modules */
export const M_CodeSync = { diffName: 'moamkit.diff' };
export const M_AutoCommit = {
  svnStatusBasedUrl: 'http://135.243.48.32/HZ/SVN_HTML/',
  requestAuthorization: 'Basic em93dTpmZW5neWFvWjYxMjg1MTk3',
  reviewBoardBasedUrl: 'http://biedronka.emea.nsn-net.net',
  availableBranches: ['5G', 'SBTS', 'TRUNK'],
  checkStatusInterval: 600000,
  diffName: 'moamkit_autoCommit.diff',
  commitMessageFileName: 'AUTO_COMMIT_MESSAGE.txt',
};
