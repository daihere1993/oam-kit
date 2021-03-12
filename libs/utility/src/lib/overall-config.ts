export const rendererAppPort = 3200;
export const rendererAppName = 'ng-client';
export const electronAppName = 'electron';
export const updateServerUrl = 'https://deployment-server-url.com'; // TODO: insert your update server url here
export const svnroot = 'https://svne1.access.nsn.com/isource/svnroot';
export const storeName = 'test.json';

/** Modules */
export const modules = {
  syncCode: { diffName: 'moamkit.diff' },
  lockInfo: {
    oam_repository: 'BTS_SC_OAM_LTE',
    interval: 120000
  }
}

/** Models */
export const model = {
  profile: { name: 'profile' },
  syncCodeBranch: { name: 'syncCodeBranch' },
  lockInfoBranch: { name: 'lockInfoBranch' }
}
