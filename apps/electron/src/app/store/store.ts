import * as fs from 'fs';
import * as util from 'util';
import { Model } from '@oam-kit/utility/model';
import { getUserDataPath, isFirstLoad } from '../utils';
import { APPData } from '@oam-kit/utility/types';
import Logger from '../utils/logger';
import { storeName } from '@oam-kit/utility/overall-config';
import { join } from 'path';

const logger = Logger.for('store');
const writeFile = util.promisify(fs.writeFile);

export class Store {
  private data: Partial<APPData> = {};
  private models: Model<any>[] = [];
  private isFirstLoad_: boolean;
  private dataPath: string;

  constructor(opts: { path: string } = { path: '' }) {
    try {
      this.dataPath = opts.path || join(getUserDataPath(), storeName);
      this.isFirstLoad_ = isFirstLoad();
      if (!this.isFirstLoad_) {
        const buffer = fs.readFileSync(this.dataPath);
        this.data = JSON.parse(buffer.toString());
      }
    } catch (error) {
      logger.error(`init failed, %s`, error);
    }
  }

  add(model: Model<any>) {
    this.models.push(model);
    if (this.isFirstLoad_) {
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
    return this.models.find((m) => m.name === name);
  }

  getAllData() {
    return this.data;
  }

  private async saveDataIntoDisk() {
    await writeFile(this.dataPath, JSON.stringify(this.data));
  }
}
