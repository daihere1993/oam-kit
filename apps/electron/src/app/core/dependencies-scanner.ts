import { AppContainer } from './app-container';
import { AppChannelMetatype } from './interfaces/channel-metatype.interface';
import { AppModuleMetatype } from './interfaces/module-metatype.interface';
import { AppProviderMetatype } from './interfaces/provider-metatype.interface';

export class DependenciesScanner {
  constructor(private container: AppContainer) {}

  public scan(metatype: AppModuleMetatype): void {
    this.container.addModule(metatype);
    this.scanForProviders(metatype);
    this.scanForChannels(metatype);
  }

  private scanForProviders(metatype: AppModuleMetatype) {
    const providers = Reflect.getMetadata('providers', metatype) as AppProviderMetatype[] || [];
    providers.forEach(provider => this.storeProvider(provider));
  }

  private scanForChannels(metatype: AppModuleMetatype): void {
    const channels = Reflect.getMetadata('channels', metatype) as AppChannelMetatype[] || [];
    channels.forEach(channel => this.storeChannel(channel));
  }

  private storeProvider(metatype: AppProviderMetatype): void {
    this.container.addProvider(metatype);
  }

  private storeChannel(metatype: AppChannelMetatype): void {
    this.container.addChannel(metatype);
  }
}
