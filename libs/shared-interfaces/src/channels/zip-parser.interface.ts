export interface Rule {
  name: string;
  firstRegex: RegExp;
  secondRegex?: RegExp;
  defaultEditor?: string;
  parsingInfos: {
    rootDir?: string;
    pathList: string[];
  }
}