export interface APPData {
  general: GeneralModel;
  syncCode: SyncCodeModel;
  rbTools: RbToolsModel;
}

export interface GeneralModel {
  repositoryList: string[];
  serverList: string[];
  profile: {
    svnAccount: { username: string; password: string };
    nsbAccount: { username: string; password: string };
  };
}

export interface Project {
  id: number;
  name: string;
  localPath: string;
  remotePath: string;
  serverAddr: string;
}

export interface SyncCodeModel {
  projects: Project[];
}

export interface Repo {
  name: string;
  repository: string;
}

export interface RbToolsModel {
  rbs: {
    name: string;
    link: string;
    branch: string;
    repo: Repo;
    revision: string;
    committedDate: Date;
  }[];
  preferences: { checkLockInfoInterval: number };
}

// export interface Branch extends ModelBase_ {
//   name: string;
//   directory?: {
//     source?: string;
//     target?: string;
//   };
//   lock?: {
//     locked?: boolean;
//     reason?: string;
//     repos?: Repo[];
//   };
// }

// export interface ReviewBoard extends ModelBase_ {
//   name: string;
// 	link: string;
// 	branch: string;
// 	repo: Repo;
// 	revision?: string;
//   committedDate?: Date;
// 	logs?: string[];
// }

// export interface BranchLockInfo {
//   name: string;
//   locked: boolean;
//   reason: string;
// }

// export interface RepoLockInfo {
//   name: string;
//   locked: boolean;
//   reason?: string;
//   repository: string;
// }

// export interface LockInfo {
//   branch: BranchLockInfo
//   repo: RepoLockInfo;
// }

// export interface ModelOptions {
//   type?: ModelType;
//   initContent?: any;
// }
