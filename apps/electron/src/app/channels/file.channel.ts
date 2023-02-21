import { Channel, Path, Req } from '@oam-kit/decorators';
import type { IpcRequest } from '@oam-kit/shared-interfaces';
import { dialog } from 'electron';

@Channel('file')
export class FileChannel {
  constructor() {}

  @Path('/select_path')
  public selectPath(@Req req: IpcRequest) {
    const ret = dialog.showOpenDialogSync({
      properties: [req.data.isDirectory ? 'openDirectory' : 'openFile'],
    });
    return ret ? ret[0] : '';
  }
}
