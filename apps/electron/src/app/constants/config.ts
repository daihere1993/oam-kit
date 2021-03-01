export const rendererAppPort = 4200;
export const rendererAppName = 'client';
export const electronAppName = 'electron';
export const updateServerUrl = 'https://deployment-server-url.com'; // TODO: insert your update server url here
export const storeName = 'test.json';

/** Modules */
export const modules = {
  syncCode: { diffName: 'moamkit.diff' },
  lockInfo: {
    svnroot: 'https://svne1.access.nsn.com/isource/svnroot',
    oam_repository: 'BTS_SC_OAM_LTE'
  }
}

/** Models */
export const model = {
  profile: { name: 'profile' },
  syncCodeBranch: { name: 'syncCodeBranch' },
  lockInfoBranch: { name: 'lockInfoBranch' }
}