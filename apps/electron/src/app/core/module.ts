import { Channel } from "./channel";
import { ElectronContext } from "./electron-context";
import { AppChannelMetatype } from "./interfaces/channel-metatype.interface";
import { AppModuleMetatype } from "./interfaces/module-metatype.interface";
import { AppProviderMetatype } from "./interfaces/provider-metatype.interface";
import { Provider } from "./provider";

export class Module {
  public instance: object;
  public channels = new Map<string, Channel>();
  public providers = new Map<Function, Provider>();
  public electronContext = new ElectronContext();

  public get injector() {
    const self = this;
    return {
      get(metatype: AppProviderMetatype) { return self.providers.get(metatype).instance }
    };
  }

  constructor(public metatype: AppModuleMetatype) {}

  public addChannel(metatype: AppChannelMetatype) {
    this.channels.set(metatype.name, new Channel(metatype));
  }

  public addProvider(metatype: AppProviderMetatype) {
    this.providers.set(metatype, new Provider(metatype));
  }
}