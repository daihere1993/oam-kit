import * as fs from 'fs';
import * as util from 'util';
import { Injectable } from '@oam-kit/decorators';
import { StoreBase, DEFAULT_APP_DATA } from '@oam-kit/data-persistent';
import { getUserDataPath } from '@oam-kit/utility/backend';
import serialize from 'serialize-javascript';

const writeFile = util.promisify(fs.writeFile);
const readFile = util.promisify(fs.readFile);

function deserialize(serializedJavascript: string){
  return eval('(' + serializedJavascript + ')');
}

@Injectable()
export class StoreService extends StoreBase {
  private _persistentDataPath: string;

  public async initialize(persistentDataPath: string) {
    this._persistentDataPath = persistentDataPath;
    if (this.isPersistentDataExists()) {
      this._data = await deserialize((await readFile(persistentDataPath)).toString());
    } else {
      const userDataPath = getUserDataPath();
      if (!fs.existsSync(userDataPath)) {
        fs.mkdirSync(userDataPath);
      }
      this._data = DEFAULT_APP_DATA;
    }
  }

  public async persist() {
    await writeFile(this._persistentDataPath, serialize(this._data));
  }

  private isPersistentDataExists(): boolean {
    return fs.existsSync(this._persistentDataPath);
  }
}
