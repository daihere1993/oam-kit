import { Rule } from "../channels";

export interface SyncCode {
  projects: Project[];
}

export interface ZipParser {
  rules: Rule[]
}

export enum RepositoryType {
  SVN,
  GIT
}

export interface Project {
  name: string;
  localPath: string;
  remotePath: string;
  serverAddr: string;
  versionControl?: RepositoryType;
}