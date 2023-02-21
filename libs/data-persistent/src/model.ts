import produce from 'immer';
import { Subject } from 'rxjs';
import * as dotProp from 'dot-prop';

interface ModelOptions<T> {
  name: string;
  initValue: T;
}

const checkValueType = (key: string, value: unknown): void => {
  const nonJsonTypes = new Set(['undefined', 'symbol', 'function']);

  const type = typeof value;

  if (nonJsonTypes.has(type)) {
    throw new TypeError(`Setting a value of type \`${type}\` for key \`${key}\` is not allowed as it's not supported by JSON`);
  }
};


export class Model<T> {
  private _data!: T;
  public get data(): T {
    return this._data;
  }
  public set data(value: T) {
    this._data = value;
    this.change.next(value);
  }
  public name!: string;
  public initValue!: T;
  public change: Subject<T> = new Subject();

  constructor(options: ModelOptions<T>) {
    Object.assign(this, options);
    this.data = this.initValue;
  }

  /**
   * Get an item.
   * @param key - The key of the item to get.
   * @param defaultValue - The default value if the item does exist.
   */
  get<Key extends keyof T>(key: Key): T[Key];
  get<Key extends keyof T>(key: Key, defaultValue: Required<T>[Key]): T[Key];
  get<Key extends string>(key: Exclude<Key, keyof T>, defaultValue?: unknown): unknown;
  get<Key extends keyof T>(key: string, defaultValue?: unknown): unknown {
    return dotProp.get<T[Key] | undefined>(this.data as any, key, defaultValue as T[Key]);
  }

  /**
   * Set an item.
   * @param key - The key of the item to set.
   * @param {value|callback} - Could set a value or change content by callback. Internal using immer.js.
   */
  set<Key extends keyof T>(key: Key, value: T[Key]): void;
  set<Key extends string>(key: Exclude<Key, keyof T>, value: T[keyof T]): void;
  set<Key extends keyof T>(key: Key, cb: (draft: T[Key]) => void): void;
  set<Key extends string>(key: Exclude<Key, keyof T>, cb: (draft: T[keyof T]) => void): void;
  set<Key extends keyof T>(key: string, value: T[Key] | ((draft: T[Key]) => void)): void {
    if (typeof key !== 'string') {
      throw new TypeError(`Expected \`key\` to be of type \`string\`, got ${typeof key}`);
    }
    if (typeof value === 'function') {
      const cb = value as (draft: T[Key] | undefined) => void;
      this.data = produce(this.data, (draft) => {
        cb(dotProp.get(draft as any, key));
      });
    } else {
      checkValueType(key, value);
      this.data = produce(this.data, (draft) => {
        dotProp.set(draft as any, key, value);
      });
    }
  }

  reset(data: T) {
    this.data = data;
  }

  subscribe(key: (keyof T), cb: (data: T[keyof T]) => void): void;
  subscribe<R>(key: Exclude<string, keyof T>, cb: (data: R) => void): void;
  subscribe<R>(key: any, cb: (data: any) => void) {
    const getter = this.get.bind(this, key);
    let currentValue = getter() as R;
    cb(currentValue);
    this.change.subscribe((data) => {
      const newValue = getter() as R;
      if (data && currentValue != newValue) {
        cb(newValue);
        currentValue = newValue;
      }
    });
  }
}