export const isUndefined = (obj: any): obj is undefined => typeof obj === 'undefined';
export const isFunction = (fn: any): boolean => typeof fn === 'function';
export const isObject = (fn: any): fn is object => typeof fn === 'object';
export const isString = (fn: any): fn is string => typeof fn === 'string';
export const isConstructor = (fn: any): boolean => fn === 'constructor';
export const validatePath = (path: any): string => (path.charAt(0) !== '/' ? '/' + path : path);
export const isNil = (obj: any): boolean => isUndefined(obj) || obj === null;
export const isEmpty = (array: any): boolean => !(array && array.length > 0);

export function promiseTimeout(timeout: number): Promise<void> {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, timeout);
  });
}

export class AsyncCallTimeoutError extends Error {
  constructor(message?: string) {
    super(message);
    this.name = 'AsyncCallTimeoutError';
  }
}
export async function asyncCallWithTimout(asyncPromise: Promise<any>, timeout: number, retry = 0, timeoutCb?: Function): Promise<any> {
  if (retry < 0) {
    console.error(`Retry count should be greater than or equal to 0, but got ${retry}.`);
    return;
  }

  let timeoutHandler: NodeJS.Timeout;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutHandler = setTimeout(async () => {
      reject(new AsyncCallTimeoutError('Async call timeout.'));
    }, timeout);
  });

  return Promise.race([asyncPromise, timeoutPromise])
    .then((result) => {
      return result;
    })
    .catch(async (error) => {
      if (error instanceof AsyncCallTimeoutError && retry > 0) {
        console.warn(`Async call timeout, retrying ${retry} times...`);
        if (timeoutCb) {
          await timeoutCb();
        }
        return asyncCallWithTimout(asyncPromise, timeout, retry - 1);
      } else {
        throw error;
      }
    })
    .finally(() => clearTimeout(timeoutHandler));
}
