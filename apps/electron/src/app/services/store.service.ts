import * as fs from 'fs';
import * as util from 'util';
import { Injectable } from '@oam-kit/decorators';
import { StoreBase, DEFAULT_APP_DATA } from '@oam-kit/data-persistent';
import { getUserDataPath } from '@oam-kit/utility/backend';

const writeFile = util.promisify(fs.writeFile);
const readFile = util.promisify(fs.readFile);

@Injectable()
export class StoreService extends StoreBase {
  private _persistentDataPath: string;

  public async initialize(persistentDataPath: string) {
    this._persistentDataPath = persistentDataPath;
    if (this.isPersistentDataExists()) {
      this._data = await JSON.parse((await readFile(persistentDataPath)).toString());
    } else {
      const userDataPath = getUserDataPath();
      if (!fs.existsSync(userDataPath)) {
        fs.mkdirSync(userDataPath);
      }
      this._data = DEFAULT_APP_DATA;
    }
  }

  public async persist() {
    await writeFile(this._persistentDataPath, JSON.stringify(this._data));
  }

  private isPersistentDataExists(): boolean {
    return fs.existsSync(this._persistentDataPath);
  }
}
