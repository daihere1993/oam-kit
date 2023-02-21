import { AppChannelMetatype } from "./interfaces/channel-metatype.interface";
import { AppModuleMetatype } from "./interfaces/module-metatype.interface";
import { AppProviderMetatype } from "./interfaces/provider-metatype.interface";
import { Module } from "./module";


export class AppContainer {
  private _module: Module;

  public getModule(): Module {
    return this._module;
  }

  public addModule(metatype: AppModuleMetatype): void {
    this._module = new Module(metatype);
  }

  public addProvider(metatype: AppProviderMetatype): void {
    this._module.addProvider(metatype);
  }

  public addChannel(metatype: AppChannelMetatype): void {
    this._module.addChannel(metatype);
  }
}
