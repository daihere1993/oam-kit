import { Subject } from "rxjs";

interface ModelOptions<T> {
  name: string;
  initValue: T;
}

export class Model<T> {
  public data: T;
  public name: string;
  public initValue: T;
  public change: Subject<T> = new Subject();

  constructor(options: ModelOptions<T>) {
    Object.assign(this, options);
    this.data = this.initValue;
  }
  
  reset(data: T) {
    this.data = data;
    this.change.next(data);
  }
}