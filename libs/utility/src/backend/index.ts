import * as path from 'path';
import { app } from 'electron';
import { NodeSSH } from 'node-ssh';

export async function isRemotePathExist(ssh: NodeSSH, path: string) {
  const { stdout, stderr } = await ssh.execCommand('pwd', { cwd: path });
  return !stderr && stdout === path;
}

export function getUserDataPath(): string {
  return path.join(app.getPath('userData'), 'data');
}

export function getPersistentDataPath(): string {
  return path.join(getUserDataPath(), 'persistent_data.json');
}
