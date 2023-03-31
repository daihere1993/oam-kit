import { Channel, Path } from "@oam-kit/decorators";

@Channel('platform')
export class PlatformChannel {
  @Path('/get_platform')
  public async getPlatform() {
    return process.platform;
  }
}