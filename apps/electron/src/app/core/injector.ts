import { BrowserWindow } from "electron";
import { StoreService } from "../services/store.service";
import { Channel } from "./channel";
import { AppProviderMetatype } from "./interfaces/provider-metatype.interface";
import Logger from "./logger";
import { Module } from "./module";

const logger = Logger.for('injector');

export class Injector {
  public createChannelInstance(channel: Channel, module: Module) {
    const dependencies = this.getInjectDependencies(channel, module);
    channel.dependencies = dependencies;
    if (!channel.shouldWaitElectronReady) {
      channel.instance = new channel.metatype(...dependencies);
    }
  }

  private getInjectDependencies(channel: Channel, module: Module) {
    const dependencies = [];
    const providers = module.providers;
    const dependencyTypes = Reflect.getMetadata('design:paramtypes', channel.metatype) as AppProviderMetatype[] || [];
    dependencyTypes.forEach(providerMetatype => {
      if (providers.has(providerMetatype)) {
        dependencies.push(providers.get(providerMetatype).instance);
      } else if (providerMetatype === BrowserWindow) {
        dependencies.push(providerMetatype);
        channel.shouldWaitElectronReady = true;
      } else if (providerMetatype === StoreService) {
        dependencies.push(providers.get(providerMetatype).instance);
        channel.shouldWaitElectronReady = true;
      } else {
        logger.warn('Can not find provider for ' + providerMetatype);
      }
    });

    return dependencies;
  }
}