export enum IpcChannel {
  SELECT_PATH_REQ = 'select_path_req',
  SELECT_PATH_RES = 'select_path_res',
  NOTIFICATION_REQ = 'notification_req',
  NOTIFICATION_RES = 'notification_res',
  OPEN_EXTERNAL_URL_REQ = 'open_external_url_req',
  OPEN_EXTERNAL_URL_RES = 'open_external_url_res',
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
