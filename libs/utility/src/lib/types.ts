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

export interface Project {
  name: string;
  localPath: string;
  remotePath: string;
  serverAddr: string;
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

export enum IpcChannel {
  SELECT_PATH_REQ = 'select_path_req',
  SELECT_PATH_RES = 'select_path_res',
  NOTIFICATION_REQ = 'notification_req',
  NOTIFICATION_RES = 'notification_res',
  OPEN_EXTERNAL_URL_REQ = 'open_external_url_req',
  OPEN_EXTERNAL_URL_RES = 'open_external_url_res',
  SERVER_CHECK_REQ = 'server_check_req',
  SERVER_CHECK_RES = 'server_check_res',
  SERVER_DIRECTORY_CHECK_REQ = 'server_directory_check_req',
  SERVER_DIRECTORY_CHECK_RES = 'server_directory_check_res',
  SYNC_DATA_REQ = 'sync_data_req',
  SYNC_DATA_RES = 'sync_data_res',
  GET_APP_DATA_REQ = 'get_app_data_req',
  GET_APP_DATA_RES = 'get_app_data_res',
  SYNC_CODE_REQ = 'sync_code_req',
  SYNC_CODE_FROM_MAIN_REQ = 'sync_code_from_main_req',
  SYNC_CODE_RES = 'sync_code_res',
  AUTO_COMMIT_REQ = 'autoCommitReq',
  PREPARE_DIFF_REQ = 'prepare_diff_req',
  PREPARE_DIFF_RES = 'prepare_diff_res',
  PREPARE_COMMIT_MSG_REQ = 'prepare_commit_msg_req',
  PREPARE_COMMIT_MSG_RES = 'prepare_commit_msg_res',
  STOP_AUTO_COMMIT = 'stopAutoCommit',
  AUTO_COMMIT_HEARTBEAT = 'autoCommitHeartbeat',
  REPLY_STOP_AUTO_COMMIT = 'stopAutoCommit',
  REPLY_AUTO_COMMIT_REQ = 'autoCommitReq-reply',
  RCAEDA_ANALYZE_REQ = 'rcaeda_analyze_req',
  RCAEDA_ANALYZE_RES = 'rcaeda_analyze_res',
  GET_LOCK_INFO_REQ = 'get_lock_info_req',
  GET_LOCK_INFO_RES = 'get_lock_info_res',
  IS_RB_READY_REQ = 'has_rb_ready_req',
  IS_RB_READY_RES = 'has_rb_ready_res',
  SVN_COMMIT_REQ = 'svn_commit_req',
  SVN_COMMIT_RES = 'svn_commit_res',
  GET_PARTIAL_RB_REQ = 'get_partial_rb_req',
  GET_PARTIAL_RB_RES = 'get_partial_rb_res',
  NSB_ACCOUNT_VERIFICATION_REQ = 'nsb_account_verification_req',
  NSB_ACCOUNT_VERIFICATION_RES = 'nsb_account_verification_res',
  SVN_ACCOUNT_VERIFICATION_REQ = 'svn_account_verification_req',
  SVN_ACCOUNT_VERIFICATION_RES = 'svn_account_verification_res',
}

export interface IPCRequest<T> {
  data?: T;
  responseChannel?: IpcChannel;
}

export interface IPCResponse<T> {
  isSuccessed?: boolean;
  data?: T;
  error?: {
    name?: string;
    message?: string;
  };
}
