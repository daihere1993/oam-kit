import { AppContainer } from "./app-container";
import { Injector } from "./injector";
import { Module } from "./module";


export class InstanceLoader {
  private _injector: Injector = new Injector();

  constructor(private _container: AppContainer) {}

  public createInstancesForDependeces(): void {
    const module = this._container.getModule();
    this.createInstancesForProviders(module);
    this.createInstancesForChannels(module);
  }

  private createInstancesForProviders(module: Module) {
    module.providers.forEach(provider => {
      provider.instance = new provider.metatype();
    });
  }

  private createInstancesForChannels(module: Module) {
    module.channels.forEach(channel => {
      this._injector.createChannelInstance(channel, module);
    });
  }
}