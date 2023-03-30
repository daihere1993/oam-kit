import { asyncCallWithTimout, AsyncCallTimeoutError } from './index';

describe('asyncCallWithTimout():', () => {
  function createAsyncFn(value: string, timeout: number) {
    return () =>
      new Promise((resolve) => {
        setTimeout(() => {
          resolve(value);
        }, timeout);
      });
  }

  it('should finished successfully if no timeout', async () => {
    const value = 'success';
    const asyncFn = createAsyncFn(value, 1000);
    const ret = await asyncCallWithTimout(asyncFn(), 2000);
    expect(ret).toBe(value);
  });

  it('should thorw AsyncCallTimeoutError if timeout', async () => {
    const asyncFn = createAsyncFn('success', 2000);
    await expect(asyncCallWithTimout(asyncFn(), 1000)).rejects.toThrowError(AsyncCallTimeoutError);
  });

  it('should retry twice then finished successfully', async () => {
    const value = 'success';
    const asyncFn = createAsyncFn(value, 3000);
    const ret = await asyncCallWithTimout(asyncFn(), 2000, 2);
    expect(ret).toBe(value);
  });

  it('should throw AsyncCallTimeoutError after retry twice', async () => {
    const asyncFn = createAsyncFn('success', 3000);
    await expect(asyncCallWithTimout(asyncFn(), 1000, 1)).rejects.toThrowError(AsyncCallTimeoutError);
  });
});
