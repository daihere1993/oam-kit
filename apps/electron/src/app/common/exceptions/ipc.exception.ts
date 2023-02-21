

export class IpcException extends Error {
  constructor(public message: string) {
    super();
    this.name = this.constructor.name;
  }
}