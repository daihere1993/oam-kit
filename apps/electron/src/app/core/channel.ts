import { PATH_METADATA } from '@oam-kit/decorators';
import { isConstructor, isFunction, isUndefined } from '@oam-kit/utility/common';
import { AppChannelMetatype } from './interfaces/channel-metatype.interface';
import { RoutePathProperties } from './interfaces/route-path-properties.interface';
import { Module } from './module';

export class Channel {
  public get name(): string {
    return this.metatype.name;
  }
  public instance: object;
  public module: Module;
  public dependencies: any[];

  public shouldWaitElectronReady = false;

  constructor(public metatype: AppChannelMetatype) {}

  public getRoutes(): RoutePathProperties[] {
    const routes: RoutePathProperties[] = [];
    const rootPath = Reflect.getMetadata(PATH_METADATA, this.metatype);
    const prototype = Object.getPrototypeOf(this.instance);
    Object.getOwnPropertyNames(prototype)
      .filter((method) => {
        const descriptor = Object.getOwnPropertyDescriptor(prototype, method);
        if (descriptor.set || descriptor.get) {
          return false;
        }
        return !isConstructor(method) && isFunction(prototype[method]);
      })
      .forEach((method) => {
        const subpath = Reflect.getMetadata(PATH_METADATA, prototype[method]);
        if (!isUndefined(subpath)) {
          routes.push({
            path: '/' + rootPath + subpath,
            handler: prototype[method],
          });
        }
      });

    return routes;
  }
}
