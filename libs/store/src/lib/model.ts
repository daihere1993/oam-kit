import { map, filter } from 'rxjs/operators'
import { Solid } from "./solid";
import { ModelType, ModelOptions } from './types';

export class Model<T extends { id?: number}> {
  private solid: Solid;
  private initContent: T | T[];
  public data: T | T[];
  public name: string;
  public type: ModelType;

  constructor(name: string, options: ModelOptions = { type: ModelType.DEFAULT }) {
    this.name = name;
    this.type = options.type;
    this.initContent = options.initContent;
  }

  /** Setup original data */
  public setup(solid: Solid): void {
    this.solid = solid;
    // Use Observable to make sure this.data is up to date at all times
    this.solid.data$.pipe(
      filter(s => !!s),
      map(s => s[this.name])
    ).subscribe(s => {
      this.data = s;
    });
  }
  /** Init model value when mode is new */
  public async init$(content: any) {
    await this.solid.initItem$(this.name, this.initContent || content);
  }
  public init(content: any) {
    this.solid.initItem(this.name, content);
  }
  public create(content: T) {
    this.solid.addItem(this.name, content);
  }
  public async create$(content: T) {
    await this.solid.addItem$(this.name, content);
  }
  public edit_(...args: any): Partial<T> {
    let content: Partial<T>;
    const firstArg = args[0];
    const secondArg = args[1];
    const id = typeof firstArg === 'number'? firstArg : firstArg.id;
    if (secondArg) {
      content = secondArg;
      content.id = id;
    } else {
      content = firstArg;
    }
    return content;
  }
  public edit(content: Partial<T> ): void;
  public edit(id: number, content: Partial<T> ): void;
  public edit(...args: any) {
    const content = this.edit_(...args);
    this.solid.editItem(this.name, content);
  }
  public async edit$(content: Partial<T> ): Promise<any>;
  public async edit$(id: number, content: Partial<T> ): Promise<any>;
  public async edit$(...args: any) {
    const content = this.edit_(...args);
    await this.solid.editItem$(this.name, content);
  }
  public delete(): void;
  public delete(id: number): void;
  public delete(id?: number) {
    id? this.solid.deleteItem(this.name, id) : this.solid.deleteItem(this.name);
  }
  public async delete$(): Promise<any>;
  public async delete$(id: number): Promise<any>;
  public async delete$(id?: number) {
    id? await this.solid.deleteItem$(this.name, id) : await this.solid.deleteItem$(this.name);
  }
  public find(id: number): T {
    const index = (this.data as T[]).findIndex(i => i.id === id);
    return this.data[index];
  }
}
