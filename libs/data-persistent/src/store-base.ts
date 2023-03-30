import { Model } from "./model";
import { Subscription } from "rxjs";

export abstract class StoreBase {
  protected _data!: any;
  protected _models: Model<any>[] = [];
  protected _observers: Subscription[] = [];

  public abstract initialize(): Promise<void>;
  protected abstract persist(model?: Model<any>): any;

  public getModel<T>(name: string): Model<T> {
    if (this.isExistedModel(name)) {
      return this.getExistedModelByName(name);
    } else {
      const model = new Model({ name, initValue: this._data[name] });
      this._models.push(model);
      this._observers.push(
        model.change.subscribe(() => {
          this.persist(model);
        })
      );
      return model;
    }
  }

  public getData() {
    return this._data;
  }

  public update(modelName: string, data: any) {
    this._data[modelName] = data;
    const model = this.getExistedModelByName(modelName);
    model.reset(data);
  }

  private isExistedModel(name: string) {
    return this._models.findIndex((item) => item.name === name) !== -1;
  }

  private getExistedModelByName(name: string): Model<any> {
    return this._models.find((item) => item.name === name) || new Model({ name: 'empty', initValue: null });
  }
}