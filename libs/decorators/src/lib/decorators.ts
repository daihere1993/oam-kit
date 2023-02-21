import 'reflect-metadata';
import { PATH_METADATA, INJECTABLE_METADATA, RouteParamtypes, ROUTE_ARGS_METADATA } from "./constants";

function createRouteParamDecorator(paramtype: RouteParamtypes): ParameterDecorator {
  return (target, key, index) => {
    const args = Reflect.getMetadata(ROUTE_ARGS_METADATA, target.constructor, key) || [];
    Reflect.defineMetadata(
      ROUTE_ARGS_METADATA,
      [`${paramtype}:${index}`, ...args],
      target.constructor,
      key,
    );
  };
}

export function Channel(value: any) {
  return (target: any) => {
    Reflect.defineMetadata(PATH_METADATA, value, target);
  };
}

export function Path(value: string) {
  return (target: any, key: string, descriptor: any) => {
    Reflect.defineMetadata(PATH_METADATA, value, descriptor.value);
  }
}

export function Module(metadatas: { channels: any[], providers: any[] }): ClassDecorator {
  return (target: object) => {
    for (const key in metadatas) {
      if (Object.prototype.hasOwnProperty.call(metadatas, key)) {
        Reflect.defineMetadata(key, metadatas[key as keyof typeof metadatas], target);
      }
    }
  }
}

export function Injectable(value?: any) {
  return (target: any) => {
    Reflect.defineMetadata(INJECTABLE_METADATA, value, target);
  }
}

export const Req = createRouteParamDecorator(RouteParamtypes.REQUEST);

export const IpcEvent = createRouteParamDecorator(RouteParamtypes.IPC_EVENT);