import { APPData, ModelType } from './types';
import { Solid } from './solid';
import { Model } from './model';

export interface StoreOptions {
  // file path to store the data
  solid: Solid;
}

export class Store {
  private solid: Solid;
  private models: Model<any>[] = [];

  constructor(options: StoreOptions) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    this.solid = options.solid;
  }

  public async startup$() {
    await this.solid.startup$();
  }

  /** Get whole app data */
  public getAllData(): APPData {
    return this.solid.data as APPData;
  }
  /** Get model by corresponding model name */
  public get<T>(name: string): Model<T> {
    return this.models[this.getModelIndexByName(name)];
  }
  /** Add a new model */
  private add_(m: Model<any>) {
    this.models.push(m);
    m.setup(this.solid);
  }
  public async add$(m: Model<any>) {
    this.add_(m);
    // If is a new model, to setup initial value for array model
    if (this.isNewModel(m.name)) {
      const initContent = m.type === ModelType.DEFAULT ? [] : {};
      await m.init$(initContent);
    }
  }
  public add(m: Model<any>) {
    this.add_(m);
    if (this.isNewModel(m.name)) {
      const initContent = m.type === ModelType.DEFAULT ? [] : {};
      m.init(initContent);
    }
  }

  /** Delte a model by corresponding model name */
  public remove(name: string): void {
    this.models.splice(this.getModelIndexByName(name), 1);
  }
  /** Clear all models */
  public clear(): void {
    this.models = [];
  }

  private getModelIndexByName(name: string): number {
    return this.models.findIndex((m) => m.name === name);
  }

  /** new model means a model that is empty in store file */
  private isNewModel(name: string): boolean {
    return !this.solid.data || !this.solid.data[name];
  }
}
