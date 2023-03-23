import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';
import { Injectable } from '@oam-kit/decorators';
import { StoreBase, DEFAULT_APP_DATA } from '@oam-kit/data-persistent';
import { getUserDataDir } from '@oam-kit/utility/backend';
import * as serialize from 'serialize-javascript';
import * as glob from 'glob';
import Logger from '../core/logger';

const logger = Logger.for('Electron/StoreService');
const writeFile = util.promisify(fs.writeFile);
const readFile = util.promisify(fs.readFile);

export function deserialize(serializedJavascript: string){
  return eval('(' + serializedJavascript + ')');
}

export enum ModelChangedType {
  removed,
  structureChanged,
  partialChanged,
}

export interface ChangedModel {
  name: string;
  type: ModelChangedType;
  value?: string;
}

@Injectable()
export class StoreService extends StoreBase {
  private _runtimeDataPath: string;

  public async initialize() {
    try {
      const userDataDir = getUserDataDir();
      this._runtimeDataPath = this.createAndSyncLocalData(userDataDir, serialize(DEFAULT_APP_DATA));
      this._data = deserialize((await readFile(this._runtimeDataPath)).toString());
    } catch (error) {
      logger.error(error);
    }
  }

  public async persist() {
    await writeFile(this._runtimeDataPath, serialize(this._data));
  }

  private createAndSyncLocalData(userDataDir: string, latestDefaultData: string): string {
    try {
      let changedModels: ChangedModel[] = [];
      const regex = /oam_kit_(?:default|runtime)_data_([^.]+)\.json/;
      const timestamp = this.createTimestamp();
      const dataFiles = glob
        .sync(path.join(userDataDir, '*.json'))
        .filter(file => regex.test(file))
        .map(file => path.join(file));

      if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir);
      }

      let defaultDataFile = dataFiles.find(file => file.includes('default'));
      let runtimeDataFile = dataFiles.find(file => file.includes('runtime'));

      // if no data files found in user data dir, create default data and runtime data
      // the file name would be like:
      // oam_kit_default_data_xxxx_xx_xx.json, oam_kit_runtime_data_xxxx_xx_xx.json
      if (!defaultDataFile) {
        const defaultDataFilename = this.createDefaultDataFilename(timestamp);
        defaultDataFile = path.join(userDataDir, defaultDataFilename);
        fs.writeFileSync(defaultDataFile, latestDefaultData);
      } else {
        const legacyDefaultData = fs.readFileSync(defaultDataFile).toString();
        changedModels = this.compareLatestAndLegacyDefaultData(latestDefaultData, legacyDefaultData);

        if (changedModels.length !== 0) {
          defaultDataFile = this.updateLocalData(defaultDataFile, changedModels, timestamp);
        }
      }

      if (!runtimeDataFile) {
        const runtimeDataFilename = this.createRuntimeDataFilename(timestamp);
        runtimeDataFile = path.join(userDataDir, runtimeDataFilename)
        fs.writeFileSync(runtimeDataFile, latestDefaultData);
      } else {
        if (changedModels.length) {
          runtimeDataFile = this.updateLocalData(runtimeDataFile, changedModels, timestamp);
        }
      }

      return runtimeDataFile;
    } catch (error) {
      logger.error(error);
    }
  }

  private createTimestamp(): string {
    return new Date().toISOString().replace(/-/g, '_').replace(/:/g, '_').replace(/\./g, '_');
  }

  private createDefaultDataFilename(timestamp: string): string {
    return `oam_kit_default_data_${timestamp}.json`;
  }

  private createRuntimeDataFilename(timestamp: string): string {
    return `oam_kit_runtime_data_${timestamp}.json`;
  }

  // 暂时只支持对每一个 model 的全量比较
  // TODO: compare 的粒度到每一个 model 的每一个 property
  private compareLatestAndLegacyDefaultData(latestData: string, legacyData: string): ChangedModel[] {
    const changedModels: ChangedModel[] = [];
    const latestDataObj = deserialize(latestData);
    const legacyDataObj = deserialize(legacyData);
    const legacyKeys = new Set(Object.keys(legacyDataObj));

    for (const [key, value] of Object.entries(latestDataObj)) {
      if (serialize(legacyDataObj[key]) !== serialize(value)) {
        changedModels.push({ name: key, type: ModelChangedType.structureChanged, value: serialize(value) });
      }
      if (legacyKeys.has(key)) {
        legacyKeys.delete(key);
      }
    }

    for (const key of legacyKeys) {
      changedModels.push({ name: key, type: ModelChangedType.removed });
    }

    return changedModels;
  }

  private updateLocalData(filePath: string, changedModels: ChangedModel[], timestamp: string): string {
    const data = deserialize(fs.readFileSync(filePath, 'utf8'));

    for (const model of changedModels) {
      switch (model.type) {
        case ModelChangedType.removed:
          delete data[model.name];
          break;
        case ModelChangedType.structureChanged:
          data[model.name] = deserialize(model.value);
          break;
        case ModelChangedType.partialChanged:
          break;
      }
    }

    fs.writeFileSync(filePath, serialize(data), 'utf8');
    const newFilePath = this.replaceFileTimestamp(filePath, timestamp);
    fs.renameSync(filePath, newFilePath);
    return newFilePath;
  }

  private replaceFileTimestamp(file: string, timestamp: string): string {
    return file.replace(/^(.+oam_kit_(?:default|runtime)_data_)([^.]+)\.json/, `$1${timestamp}.json`);
  }
}
