export enum SyncCodeStep {
  CONNECT_TO_SERVER = 'connectServer',
  CREATE_DIFF = 'createDiff',
  DIFF_ANALYZE = 'diffAnalyze',
  CLEAN_UP = 'cleanupRemoteWorkspace',
  UPLOAD_DIFF = 'uploadDiff',
  APPLY_DIFF = 'applyDiff',
}