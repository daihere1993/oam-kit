import axios from 'axios';
import { promisify } from 'util'
import { exec as exec_ } from 'child_process';
import { Channel, Path, Req } from "@oam-kit/decorators";
import { IpcRequest } from '@oam-kit/shared-interfaces';
import Logger from '../core/logger';

const exec = promisify(exec_);
const NSB_LOGIN_URL = 'https://rep-portal.wroclaw.nsn-rdnet.net/jwt/obtain/';
const REVIEWBOARD_LOGIN_URL = 'https://svne1.access.nsn.com/isource/svnroot/BTS_SC_OAM_LTE/conf/BranchFor.json';

const logger = Logger.for('AuthChannel');

@Channel('auth')
export class AuthChannel {
  @Path('/is_nsb_account_correct')
  public async nsbAccountVerification(@Req req: IpcRequest) {
    const { username, password } = req.data;
    const { status } = await axios.post(NSB_LOGIN_URL, `username=${username}&password=${password}`, { proxy: false });
    return status === 200;
  }

  @Path('/is_svn_account_correct')
  public async svnAccountVerification(@Req req: IpcRequest) {
    const { username, password } = req.data;
    return await this.svnCat(REVIEWBOARD_LOGIN_URL, {
      username: username,
      password: password,
    });
  }

  private async svnCat(path: string, options = { username: '', password: '' } ) {
    const defaultOptions = ['--no-auth-cache', '--non-interactive', '--trust-server-cert'];
    const cmd = `svn ${defaultOptions.join(' ')} --username ${options.username} --password ${options.password} cat ${path}`;
    const { stdout, stderr } = await exec(cmd);
    if (stderr) {
      logger.error(`Svn cat failed, path: ${path}, error: ${stderr}`);
      return false;
    }
    return stdout;
  }
}
