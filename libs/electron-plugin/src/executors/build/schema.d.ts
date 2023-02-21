import { Configuration } from 'electron-builder';

export interface BuildExecutorSchema extends Configuration {
  name: string;
  frontendProject: string;
  platform: string | string[];
  arch: string;
  root: string;
  prepackageOnly: boolean;
  sourcePath: string;
  outputPath: string;
  publishPolicy?: PublishOptions["publish"];
  makerOptionsPath?: string;
} // eslint-disable-line
