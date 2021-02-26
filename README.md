# OAM-KIT

## Development commands
1. Startup front-end project:
```bash
nx serve ng-client
```
2. Debug electron project in vscode: run `Debug Main Process`
3. Testing:
```bash
# electron UT
nx test electron
# e2e
nx e2e ng-client-e2e
```

## Core Concepts
### Store mechanism
> Store mechanism is created to handle all of the data operations, like update, edit, delete, save into a local file etc.

There are three classes in `electron` project:
   * Store: store all models(app would initial all models then put them into a store isntance one py one by `store.add()` method).
     * Store.prototype.add(model: Model) - add a model into the store.
     * Store.prototype.get(name: string) - get specific model by a model name.
     * Store.prototype.remove(name: string) - remove specific model from the store by a model name.
     * Store.protytype.clear() - clear all the models.
     * Store.prototype.getAlldata(): APPData - get the whole data of the app.
  * Model: each model instance map to a kind of data collection.
    * Model\<T\>.prototype.create$(content: Partial\<T\>): Promise<void>
    * Model\<T\>.prototype.edit$(content: Partial\<T\>): Promise<void>
    * Model\<T\>.prototype.edit$(id: number, content: Partial\<T\>): Promise<void>
    * Model\<T\>.prototype.delete$(): Promise<void> - working for plane model.
    * Model\<T\>.prototype.delete$(id: number): Promise<void> - working for array model.
    * Model\<T\>.prototype.find(id: number): T - to get specific item by id.
  * Solid: all the operations about a file whitch storing the whole data. Need to notice that we don't need to care about this class when we are working on business code.
