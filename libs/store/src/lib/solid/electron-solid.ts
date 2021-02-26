import * as fs from 'fs';
import * as util from 'util';
import { BehaviorSubject } from 'rxjs';
import { APPData, ModelBase_ } from '../types';
import { Solid } from './base';

const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

/** A series methods to update data into target file */
export class ElectronSolid extends Solid {
  // Notice: data must always keep fresh which data must means be in line with the source of target file
  public data: Partial<APPData> = {};
  public data$: BehaviorSubject<Partial<APPData>> = new BehaviorSubject<Partial<APPData>>(null);

  private targetPath: string;
  // targetPath: Path of a file which storing the whole app data
  constructor(targetPath: string) {
    super();
    this.targetPath = targetPath;
  }

  public async startup$() {
    try {
      if (fs.existsSync(this.targetPath)) {
        const data = await readFile(this.targetPath);
        this.data = JSON.parse(data.toString());
        this.data$.next(this.data);
      }
    } catch (err) {
      throw new Error(`[Solid] couldn't read file(${this.targetPath}): ${err.message} `);
    }
  }


  public async initItem$(modelName: string, content: any) {
    this.data[modelName] = content;
    await this.updateAll$();
  }

  public async addItem$(modelName: string, content: ModelBase_) {
    if (this.isArrayModel(modelName)) {
      const target = this.data[modelName];
      if (!Array.isArray(target)) throw new Error('[STORE]: Original data should be an Array.');
      const lastItem = target[target.length - 1];
      content.id = target.length? lastItem.id + 1 : 1;
      target.push(content);
    } else {
      content.id = 1;
      this.data[modelName] = content;
    }
    await this.updateAll$();
  }

  public async editItem$(modelName: string, content: ModelBase_) {
    let source: Record<string, any>;
    const model = this.data[modelName];

    if (typeof content !== 'object') {
      throw new Error(`[Solid][editItem$ content must be a object`);
    }
    // There are two kinds of model, one is plane object another is array.
    if (this.isArrayModel(modelName)) {
      if (!Object.prototype.hasOwnProperty.call(content, 'id')) throw new Error('[Solid][editItem$ content must include "id"');
      const id = content.id;
      source = model.find(i => i.id == id);
    } else {
      source = model;
    }
    Object.assign(source, content);
    await this.updateAll$();
  }

  // public async deleteItem$(modelName: string): Promise<void>;
  // public async deleteItem$(modelName: string, id: number): Promise<void>;
  public async deleteItem$(modelName: string, ...args: any) {
    const model = this.data[modelName];
    if (this.isArrayModel(modelName)) {
      const id = args[0];
      if (typeof id !== 'number') {
        throw new Error(`[Solid][deleteItem$ second argument must be a number`);
      }
      const index = model.findIndex(i => i.id === id)
      model.splice(index, 1);
    } else {
      delete this.data[modelName];
    }
    await this.updateAll$();
  }


  protected async updateAll$() {
    try {
      await writeFile(this.targetPath, JSON.stringify(this.data));
      this.data$.next(this.data);
    } catch (err) {
      console.error(`[Solid] ${err}`);
    }
  }
}
