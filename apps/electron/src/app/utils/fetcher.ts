import { promisify } from 'util'
import { exec as exec_ } from 'child_process';

const exec = promisify(exec_);

export async function svnCat(path: string, options = { username: '', password: '' } ) {
  const defaultOptions = ['--no-auth-cache', '--non-interactive', '--trust-server-cert'];
  const cmd = `svn ${defaultOptions.join(' ')} --username ${options.username} --password ${options.password} cat ${path}`;
  const { stdout, stderr } = await exec(cmd);
  if (stderr) {
    throw new Error(`[oam-kit][svnCat] Svn cat failed, path: ${path}, error: ${stderr}`);
  }
  return stdout;
}