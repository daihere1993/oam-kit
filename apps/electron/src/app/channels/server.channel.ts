import { Channel, Path, Req } from '@oam-kit/decorators';
import { Preferences, IpcRequest } from '@oam-kit/shared-interfaces';
import { NodeSSH } from 'node-ssh';
import Logger from '../core/logger';
import { StoreService } from '../services/store.service';

const logger = Logger.for('ServerChannel');

@Channel('server')
export class ServerChannel {
  private _ssh: NodeSSH = new NodeSSH();

  constructor(private _storeService: StoreService) {}

  @Path('/is_path_exist')
  public async isServerDirectoryExist(@Req req: IpcRequest) {
    logger.debug('isServerDirectoryExist: start');

    const { host, directory, username, privateKeyPath } = req.data;
    const sshInfo = this._storeService.getModel<Preferences>('preferences').get('ssh');
    await this._ssh.connect({
      host: host.trim(),
      username: (username || sshInfo.username).trim(),
      privateKeyPath: (privateKeyPath || sshInfo.privateKeyPath).trim(),
    });

    const { stdout, stderr } = await this._ssh.execCommand('pwd', { cwd: directory });

    this._ssh.dispose();
    
    if (stderr || stdout !== directory) {
      logger.debug('isServerDirectoryExist: end with value false');
      return false;
    } else {
      logger.debug('isServerDirectoryExist: end with value true');
      return true;
    }
  }

  @Path('/check_server_connection_by_password')
  public async checkConnectionByPassword(@Req req: IpcRequest) {
    logger.debug('checkConnectionByPassword: start');

    const serverAddr = req.data.host;
    const nsbAccount = this._storeService.getModel<Preferences>('preferences').get('profile').nsbAccount;
    await this._ssh.connect({
      host: serverAddr.trim(),
      username: nsbAccount.username.trim(),
      password: nsbAccount.password,
    });
    const isConnected = this._ssh.isConnected();
    this._ssh.dispose();
    logger.debug(`checkConnectionByPassword: end with value ${isConnected}`);
    return isConnected;
  }

  @Path('/check_server_connection_by_private_key')
  public async checkConnectionByPrivateKey(@Req req: IpcRequest) : Promise<boolean> {
    logger.debug('checkConnectionByPrivateKey: start');

    const username = req.data.username;
    const serverAddr = req.data.serverAddr;
    const privateKeyPath = req.data.privateKeyPath;
    const sshInfo = this._storeService.getModel<Preferences>('preferences').get('ssh');
    await this._ssh.connect({
      host: serverAddr.trim(),
      username: (username || sshInfo.username).trim(),
      privateKeyPath: (privateKeyPath || sshInfo.privateKeyPath).trim(),
    });
    const isConnected = this._ssh.isConnected();
    this._ssh.dispose();
    logger.debug(`checkConnectionByPrivateKey: end with value ${isConnected}`);
    return isConnected;
  }
}
