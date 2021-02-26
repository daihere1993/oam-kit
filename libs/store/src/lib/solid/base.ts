/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-empty-function */
import { BehaviorSubject } from "rxjs";
import { APPData, ModelBase_ } from "../types";

export abstract class Solid {
  public data: Partial<APPData> = {};
  public data$: BehaviorSubject<Partial<APPData>>
  

  public initItem(modelName: string, content: any) {}
  public addItem(modelName: string, content: ModelBase_) {}
  public editItem(modelName: string, content: ModelBase_) {}
  public deleteItem(modelName: string): void;
  public deleteItem(modelName: string, id: number): void;
  public deleteItem(modelName: string, ...args: any) {}

  public async startup$(): Promise<void> {}
  public async initItem$(modelName: string, content: any): Promise<void> {}
  public async addItem$(modelName: string, content: ModelBase_): Promise<void> {}
  public async editItem$(modelName: string, content: ModelBase_): Promise<void> {}
  public async deleteItem$(modelName: string): Promise<void>;
  public async deleteItem$(modelName: string, id: number): Promise<void>;
  public async deleteItem$(modelName: string, ...args: any) {}
  
  protected updateAll() {}
  protected async updateAll$(): Promise<void> {}

  protected isArrayModel(modelName: string): boolean {
    const model = this.data[modelName];
    return Array.isArray(model);
  }
}
