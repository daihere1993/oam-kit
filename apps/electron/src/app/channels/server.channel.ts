import { Channel, Path, Req } from '@oam-kit/decorators';
import { Preferences, IpcRequest } from '@oam-kit/shared-interfaces';
import { NodeSSH } from 'node-ssh';
import { sftp_algorithms } from '../common/contants/electron-config';
import { StoreService } from '../services/store.service';

@Channel('server')
export class ServerChannel {
  private _ssh: NodeSSH = new NodeSSH();

  constructor(private _storeService: StoreService) {}

  @Path('/is_path_exist')
  public async isServerDirectoryExist(@Req req: IpcRequest) {
    const { host, directory } = req.data;
    const nsbAccount = this._storeService.getModel<Preferences>('preferences').get('profile').nsbAccount;
    await this._ssh.connect({
      host: host,
      username: nsbAccount.username,
      password: nsbAccount.password,
      algorithms: sftp_algorithms,
    });

    const { stdout, stderr } = await this._ssh.execCommand('pwd', { cwd: directory });

    this._ssh.dispose();
    if (stderr || stdout !== directory) {
      return false;
    } else {
      return true;
    }
  }

  @Path('/is_connected')
  public async isServerConnected(@Req req: IpcRequest) {
    const serverAddr = req.data.host;
    const nsbAccount = this._storeService.getModel<Preferences>('preferences').get('profile').nsbAccount;
    await this._ssh.connect({
      host: serverAddr,
      username: nsbAccount.username,
      password: nsbAccount.password,
      algorithms: sftp_algorithms,
    });
    const isConnected = this._ssh.isConnected();
    this._ssh.dispose();
    return isConnected;
  }
}
