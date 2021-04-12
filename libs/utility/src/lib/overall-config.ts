import { APPData } from "./types";

export const rendererAppPort = 3200;
export const rendererAppName = 'ng-client';
export const electronAppName = 'electron';
export const updateServerUrl = 'https://deployment-server-url.com'; // TODO: insert your update server url here
export const svnroot = 'https://svne1.access.nsn.com/isource/svnroot';
export const storeName = 'data.json';

/** Modules */
export const modules = {
  syncCode: { diffName: 'moamkit.diff' },
  lockInfo: {
    oam_repository: 'BTS_SC_OAM_LTE',
    interval: 120000,
  },
};

/** Models */
// Here's enum value must be aligned with APPData
export enum MODEL_NAME {
  GENERAL = 'general',
  SYNC_CODE = 'syncCode',
  RB_TOOLS = 'rbTools',
}

export const MODEL_INIT_VALUE: APPData = {
  general: {
    serverList: [
      'hzlinb35.china.nsn-net.net',
      'hzlinb36.china.nsn-net.net'
    ],
    profile: {
      svnAccount: { password: null },
      nsbAccount: { username: null, password: null },
    },
  },
  syncCode: {
    projects: [],
  },
  rbTools: {
    rbs: [],
    preferences: { checkLockInfoInterval: 300000 },
  },
};
