export enum ModelType {
    // means model data is an array
    DEFAULT = 'arrray',
    // means model data is a plane object
    PLANE = 'plane'
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

  export interface Branch extends ModelBase_ {
    name: string;
    directory?: {
      source?: string;
      target?: string;
    }
    lock?: {
      locked: boolean;
      reason?: string;
    }
  }

  export interface APPData {
    profile: Profile;
    branches: Branch[];
    lastAutoCommitInfo?: AutoCommitInfo;
  }

  export interface AutoCommitInfo {
    reviewBoardID?: number;
    prontoTitle?: string;
    description?: string;
    branch?: Branch;
    specificDiff?: string;
    component?: { name: string };
    diffPath?: string;
  }

  export interface ModelOptions {
    type: ModelType;
  }