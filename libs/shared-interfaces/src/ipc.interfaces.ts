export interface IpcRequest {
  data: any;
}

export interface IpcResponse {
  data: any;
  code: IpcResponseCode;
  description?: string;
}

export enum IpcResponseCode {
  success = 0,
  failed = 1
}