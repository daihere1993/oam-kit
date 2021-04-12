import * as fs from 'fs';
import * as util from 'util';
import { Model } from '@oam-kit/utility/model';
import { isFirstLoad } from '../utils';
import { APPData } from '@oam-kit/utility/types';

const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

export class Store {
  private data: Partial<APPData> = {};
  private models: Model<any>[] = [];

  constructor(private path: string) {}

  async startup() {
    if (!isFirstLoad()) {
      const buffer = await readFile(this.path);
      this.data = JSON.parse(buffer.toString());
    }
  }

  add(model: Model<any>) {
    this.models.push(model);
    if (isFirstLoad()) {
      this.data[model.name] = model.data;
    } else {
      model.reset(this.data[model.name]);
    }
    model.change.subscribe(() => {
      this.data[model.name] = model.data;
      this.saveDataIntoDisk();
    });
  }

  get<T>(name: string): Model<T> {
    return this.models.find(m => m.name === name);
  }

  getAllData() {
    return this.data;
  }

  private async saveDataIntoDisk() {
    await writeFile(this.path, JSON.stringify(this.data));
  }
}
