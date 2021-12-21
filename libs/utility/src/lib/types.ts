export interface APPData {
  general: GeneralModel;
  syncCode: SyncCodeModel;
  rbTools: RbToolsModel;
}

export interface Profile {
  svnAccount: { password: string };
  nsbAccount: { username: string; password: string };
}

export interface GeneralModel {
  // repositoryList: string[];
  serverList: string[];
  profile: Profile;
}

export enum RepositoryType {
  GIT = 'git',
  SVN = 'svn',
}

export interface Project {
  name: string;
  localPath: string;
  remotePath: string;
  serverAddr: string;
  versionControl: RepositoryType;
}

export interface SyncCodeModel {
  projects: Project[];
  preferences?: any;
}

export interface Repo {
  name: string;
  repository: string;
}

export interface ReviewBoard {
  name: string;
  link: string;
  branch: string;
  repo: Repo;
  revision?: string;
  committedDate?: Date;
}

export interface RbToolsModel {
  rbs: ReviewBoard[];
  preferences: { checkLockInfoInterval: number };
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
  branch: BranchLockInfo;
  repo: RepoLockInfo;
}

export enum IpcResErrorType {
	Expected,
	Exception,
}

export interface IpcRequest<T> {
  data: T;
}

export interface IpcResError {
  type: IpcResErrorType | null,
  message: string;
}

export interface IpcResponse<T> {
  data: T;
  isOk: boolean;
  error: IpcResError;
}

export enum IpcChannel {
  SELECT_PATH = 'select_path',
  SHOW_NOTIFICATION = 'show_notification',
  OPEN_EXTERNAL_URL = 'open_external_url',
  SERVER_CHECK = 'server_check',
  SERVER_DIRECTORY_CHECK = 'server_directory_check',
  SYNC_DATA = 'sync_data',
  GET_APP_DATA = 'get_app_data',
  SYNC_CODE = 'sync_code',
  SYNC_CODE_FROM_MAIN = 'sync_code_from_main',
  GET_LOCK_INFO = 'get_lock_info',
  IS_RB_READY = 'has_rb_ready',
  SVN_COMMIT = 'svn_commit',
  GET_PARTIAL_RB = 'get_partial_rb',
  NSB_ACCOUNT_VERIFICATION = 'nsb_account_verification',
  SVN_ACCOUNT_VERIFICATION = 'svn_account_verification',
  KNIFE_GENERATOR = 'knife_generator',
}

export enum SyncCodeStep {
  CONNECT_TO_SERVER = 'connect_to_server',
  CREATE_DIFF = 'create_diff',
  UPLOAD_DIFF = 'upload_diff',
  APPLY_DIFF = 'apply_diff',
}

/** Request/response data type for each channel */
export interface KnifeGeneratorReqData {
  projectPath: string;
  targetVersion: string;
}
export interface KnifeGeneratorResData {
  knifePath: string;
}

/** sync-code channel */
export interface SyncCodeReqData {
  project: Project;
}
export interface SyncCodeResData {
  step: SyncCodeStep;
}

/** kit channel */
export interface SelectPathReqData {
  isDirectory: boolean;
}
export interface SelectPathResData {
  path: string;
}
export interface ShowNotificationReqData {
  title: string;
  body: string;
}
export interface OpenExternalUrlReqData {
  url: string;
}
export interface ServerCheckReqData {
  host: string;
}
export interface ServerDirCheckReqData {
  host: string;
  directory: string
}
export interface SvnAccountVerificationReqData {
  username: string;
  password: string;
}
export interface SvnAccountVerificationResData {
  isRightAccount: boolean;
}
export interface NsbAccountVerificationReqData {
  username: string;
  password: string;
}
export interface NsbAccountVerificationResData {
  isRightAccount: boolean;
}

/** end */

export type Constructor<T> = new (...args: any[]) => T;