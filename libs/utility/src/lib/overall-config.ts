import * as os from 'os';
import * as path from 'path';

import { APPData, ServerConnectWay } from './types';

const DEFAULT_SSH_PRIVATE_KEY_PATH = path.join(os.homedir(), '.ssh/id_rsa');

export const rendererAppPort = 3200;
export const storeName = 'data.json';
export const rendererAppName = 'ng-client';
export const electronAppName = 'electron';
export const updateServerUrl = 'https://deployment-server-url.com'; // TODO: insert your update server url here
export const svnroot = 'https://svne1.access.nsn.com/isource/svnroot';

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
export const MODEL_INIT_VALUE: APPData = {
  settings: {
    server: {
      connectWay: ServerConnectWay.ByPrivateKeyPath,
      privateKeyPath: DEFAULT_SSH_PRIVATE_KEY_PATH,
      serverList: [
        'hzlinb35.china.nsn-net.net',
        'hzlinb36.china.nsn-net.net',
        'wrlinb119.emea.nsn-net.net',
      ],
    },
    auth: {
      svnAccount: { password: null },
      nsbAccount: { username: null, password: null },
    },
  },
  syncCode: {
    projects: [],
  }
};

export const proxy = { address: '10.158.100.3', port: 8080 };

// W/A: to fix crypto.createDiffieHellman() crash issue when using SSH2
// Link: https://github.com/liximomo/vscode-sftp/issues/883#issuecomment-778684682
export const sftp_algorithms = {
  kex: ['ecdh-sha2-nistp256', 'ecdh-sha2-nistp384', 'ecdh-sha2-nistp521', 'diffie-hellman-group14-sha1'],
  cipher: [
    'aes128-ctr',
    'aes192-ctr',
    'aes256-ctr',
    'aes128-gcm',
    'aes128-gcm@openssh.com',
    'aes256-gcm',
    'aes256-gcm@openssh.com',
  ],
  serverHostKey: ['ssh-rsa', 'ecdsa-sha2-nistp256', 'ecdsa-sha2-nistp384', 'ecdsa-sha2-nistp521'],
  hmac: ['hmac-sha2-256', 'hmac-sha2-512', 'hmac-sha1'],
};
