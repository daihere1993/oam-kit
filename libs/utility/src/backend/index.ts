import * as path from 'path';
import { app } from 'electron';
import { NodeSSH } from 'node-ssh';

export async function isRemotePathExist(ssh: NodeSSH, path: string) {
  const { stdout, stderr } = await ssh.execCommand('pwd', { cwd: path });
  return !stderr && stdout === path;
}

export function getUserDataDir(): string {
  return app ? path.join(app.getPath('userData'), 'data') : '';
}
