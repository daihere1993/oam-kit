export enum LOG_TYPE {
  EXCEPTION,
  RB_ATTACH__START,
  RB_ATTACH__INVALID_LINK,
  RB_ATTACH__DULICATE,
  RB_ATTACH__OK,
  RB_IS_READY__START,
  RB_IS_READY__NOT_READY,
  RB_IS_READY__READY,
  BRANCH_CHECK__START,
  BRANCH_CHECK__LOCKED,
  BRANCH_CHECK__UNLOCKED,
  SVN_COMMIT__START,
  SVN_COMMIT__COMMITTED,
}

export enum LOG_PHASE {
  RB_ATTACH = 'RB_ATTACH',
  SVN_COMMIT = 'SVN_Commit',
}

export const LOG_TEMPLATES = {
  /** Auto commit log temlate */
  [LOG_TYPE.EXCEPTION]: `{{name}} failed due to: {{message}}`,
  [LOG_TYPE.RB_ATTACH__START]: `Start to attach "{{link}}"...`,
  [LOG_TYPE.RB_ATTACH__INVALID_LINK]: `Attach failed, please input right RB link like: http://biedronka.emea.nsn-net.net/r/92555/`,
  [LOG_TYPE.RB_ATTACH__DULICATE]: `Attach failed, this RB has been attached before, you can find it by filter.`,
  [LOG_TYPE.RB_ATTACH__OK]: `Attached successfully!!!`,
  [LOG_TYPE.RB_IS_READY__START]: `Start to check if "{{link}}" is ready...`,
  [LOG_TYPE.RB_IS_READY__NOT_READY]: `Seems this RB is not ready, please check all of the mandatory requirements have been done before commit code. Row response from reviewboard: {{message}}.`,
  [LOG_TYPE.RB_IS_READY__READY]: `RB is ready!!! Then to check branch lock info...`,
  [LOG_TYPE.BRANCH_CHECK__START]: `Start to check branch lock info...`,
  [LOG_TYPE.BRANCH_CHECK__LOCKED]: `{{branch}} is locked with reason: {{reason}}. Keep listening...`,
  [LOG_TYPE.BRANCH_CHECK__UNLOCKED]: `{{branch}} is unlocked, then to commit code...`,
  [LOG_TYPE.SVN_COMMIT__START]: `Start to commit code...`,
  [LOG_TYPE.SVN_COMMIT__COMMITTED]: `Commit code successfully, revision: {{repo}}@{{revision}}.`
}
