import { AppContainer } from "./app-container";
import { Application } from "./application";
import { DependenciesScanner } from "./dependencies-scanner";
import { InstanceLoader } from "./instance-loader";
import { AppModuleMetatype } from "./interfaces/module-metatype.interface";
import Logger from "./logger";

const logger = Logger.for('app-factory');

class AppFactoryStatic {
  private _container = new AppContainer();
  private _instanceLoader = new InstanceLoader(this._container);
  private _dependenciesScanner = new DependenciesScanner(this._container);

  public create(rootModuleMetatype: AppModuleMetatype): Application {
    this.initialize(rootModuleMetatype);
    return new Application(this._container);
  }

  private initialize(metatype: AppModuleMetatype): void {
    try {
      logger.info('Start!!');
      this._dependenciesScanner.scan(metatype);
      this._instanceLoader.createInstancesForDependeces();
    } catch (error) {
      logger.error(error);
      process.abort();
    }
  }
}

export const AppFactory = new AppFactoryStatic();
