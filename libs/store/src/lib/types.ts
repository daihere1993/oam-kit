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
  locked?: boolean;
  reason?: string;
  repository?: string;
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

export interface APPData {
  profile: Profile;
  syncCodeBranch: Branch[];
  lockInfoBranch: Branch[];
  visibleBranches?: Branch[];
  visibleRepos?: Repo[];
}

export interface ModelOptions {
  type?: ModelType;
  initContent?: any;
}
