export enum IpcChannel {
  SELECT_PATH_REQ = 'select_path_req',
  SELECT_PATH_RES = 'select_path_res',
  STORE_DATA_REQ = 'store_data_req',
  STORE_DATA_RES = 'store_data_res',
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
}

export interface IPCRequest<T> {
  data?: T;
  responseChannel?: IpcChannel;
}

export interface IPCResponse<T> {
  isSuccessed?: boolean;
  data?: T;
  error?: {
    name: string;
    message: string;
  };
}
