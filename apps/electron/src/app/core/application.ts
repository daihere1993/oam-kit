import { app, BrowserWindow, ipcMain, IpcMainEvent } from 'electron';
import { IpcRequest, IpcResponse, IpcResponseCode } from '@oam-kit/shared-interfaces';
import { StoreService } from '../services/store.service';
import { AppContainer } from './app-container';
import { Channel } from './channel';
import { RoutePathProperties } from './interfaces/route-path-properties.interface';
import { ElectronContext } from './electron-context';
import { Module } from './module';
import { RouteParamtypes, ROUTE_ARGS_METADATA } from '@oam-kit/decorators';

export class Application {
  private get _module(): Module {
    return this._container.getModule();
  }
  private _events = new Map<any, (context: ElectronContext) => void>();

  constructor(private _container: AppContainer) {}

  public on(event: string, cb: (context: ElectronContext) => void): void {
    this._events.set(event, cb);
  }

  public startup(): void {
    this.listenElectronEvents();

    const context = this._module.electronContext;
    context.onElectronReady.subscribe(async () => {
      await this.initalizeStoreService();
      this.initializeLeftChannels();
      this.subscribeIpcChannels();
    });
  }

  private initializeLeftChannels() {
    this._module.channels.forEach((channel) => {
      if (channel.shouldWaitElectronReady) {
        channel.dependencies.map((dependency) => {
          if (dependency === BrowserWindow) {
            return this._module.electronContext.mainWindow;
          } else {
            return dependency;
          }
        });
        channel.instance = new channel.metatype(...channel.dependencies);
      }
    });
  }

  private listenElectronEvents(): void {
    for (const [event, cb] of this._events.entries()) {
      app.on(event, cb.bind(null, this._module.electronContext));
    }
  }

  private subscribeIpcChannels(): void {
    const self = this;
    this._module.channels.forEach((channel) => {
      channel.getRoutes().forEach((route) => {
        (function (route: RoutePathProperties, channel: Channel) {
          ipcMain.on(route.path, async (event, req: IpcRequest) => {
            const res: IpcResponse = { data: null, code: null, description: null };
            try {
              const params = self.reflectHandlerParams(event, req, channel.instance, route.handler.name);
              res.data = await route.handler.apply(channel.instance, params);
              res.code = IpcResponseCode.success;
            } catch (error) {
              res.description = error.message ? error.message : error;
              res.code = IpcResponseCode.failed;
            } finally {
              event.reply(route.path, res);
            }
          });
        })(route, channel);
      });
    });
  }

  private reflectHandlerParams(event: IpcMainEvent, req: IpcRequest, instance: object, methodName: string): any[] {
    const params = [];
    const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, instance.constructor, methodName) as string[] || [];

    const extractParamValue = (paramtype: RouteParamtypes, event: IpcMainEvent, req: IpcRequest) => {
      switch(paramtype) {
        case RouteParamtypes.REQUEST:
          return req;
        case RouteParamtypes.IPC_EVENT:
          return event;
      }
    }

    metadata.forEach(routeArg => {
      const ret = routeArg.match(/(\d+):(\d+)/);
      const index = Number(ret[2]);
      const paramtype = Number(ret[1]) as RouteParamtypes;
      params[index] = extractParamValue(paramtype, event, req)
    });

    return params;
  }

  private async initalizeStoreService(): Promise<void> {
    const module = this._container.getModule();
    const storeService = module.injector.get(StoreService) as StoreService;
    await storeService.initialize();
  }
}
