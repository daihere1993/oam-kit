import { Channel, Path, Req } from '@oam-kit/decorators';
import type { IpcRequest } from '@oam-kit/shared-interfaces';
import { StoreService } from '../services/store.service';

@Channel('storage')
export class StorageChannel {

  constructor(private _storeService: StoreService) {}

  @Path('/getPersistentData')
  getPersistentData() {
    return this._storeService.getData();
  }

  @Path('/sync')
  sync(@Req req: IpcRequest) {
    this._storeService.update(req.data.name, req.data.data);
    this._storeService.persist();
  }
}
