export enum ModelType {
  // means model data is an array
  DEFAULT = 'arrray',
  // means model data is a plane object
  PLANE = 'plane',
}

export enum StoreAction {
  COVER = 'cover',
  ADD_ITEM = 'add_item',
  EDIT_ITEM = 'edit_item',
  DELETE_ITEM = 'delete_item',
}

export interface StoreData<T> {
  model: string;
  content: Partial<T> | number;
  action: StoreAction;
}

export interface ModelBase_ {
  id?: number;
}

export interface Profile extends ModelBase_ {
  remote: string;
  username: string;
  password: string;
}

export interface Repo {
  name: string;
  repository: string;
}

export interface Branch extends ModelBase_ {
  name: string;
  directory?: {
    source?: string;
    target?: string;
  };
  lock?: {
    locked?: boolean;
    reason?: string;
    repos?: Repo[];
  };
}

export interface ReviewBoard extends ModelBase_ {
  name: string;
	link: string;
	branch: string;
	repo: Repo;
	revision?: string;
  committedDate?: string;
	logs?: string[];
}

export interface BranchLockInfo {
  name: string;
  locked: boolean;
  reason: string;
}

export interface RepoLockInfo {
  name: string;
  locked: boolean;
  reason?: string;
  repository: string;
}

export interface LockInfo {
  branch: BranchLockInfo
  repo: RepoLockInfo;
}

export interface APPData {
  profile?: Profile;
  syncCodeBranch?: Branch[];
  autoCommit?: ReviewBoard[];
}

export interface ModelOptions {
  type?: ModelType;
  initContent?: any;
}
