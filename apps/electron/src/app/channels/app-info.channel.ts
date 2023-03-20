import { app } from 'electron';
import { Channel, Path } from '@oam-kit/decorators';

@Channel('app_info')
export class AppInfoChannel {
  @Path('/get_app_info')
  public async getAppInfo() {
    return {
      name: 'OAM-Kit',
      version: `v${app.getVersion()}`,
    };
  }
}
