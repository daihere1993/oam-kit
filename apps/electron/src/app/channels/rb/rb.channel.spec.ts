import axios from 'axios';
import { SettingsModel, IpcChannel } from '@oam-kit/utility/types';
import RbChannel from './rb.channel';
import {
  IS_COMMIT_ALLOWED,
  IS_COMMIT_NOT_ALLOWED,
  LATEST_DIFF_RESPONSE,
  REPOSITORY_RESPONSE,
  REVIEW_REQUEST_RESPONSE,
  REVIEW_REQUEST_RESPONSE__SPECIAL_SUMMARY,
} from './__test__/api_response';
import { Store } from '@electron/app/store';
import { Model } from '@oam-kit/utility/model';
import { MODEL_INIT_VALUE, MODEL_NAME } from '@oam-kit/utility/overall-config';
import { IpcService } from '@electron/app/utils/ipcService';
import Logger from '@electron/app/utils/logger';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const rbId = '92407';
const revision = '195696';
const link = `http://biedronka.emea.nsn-net.net/r/${rbId}/`;
const GET_REVIEW_REQUEST_URL = `http://biedronka.emea.nsn-net.net/api/review-requests/${rbId}/`;
const LATEST_DIFF_URL = `http://biedronka.emea.nsn-net.net/api/review-requests/${rbId}/diffs/3/`;
const REPOSITORY_INFO_URL = 'http://biedronka.emea.nsn-net.net/api/repositories/18/info/';
const SETUP_RBSESSION_URL = 'http://biedronka.emea.nsn-net.net/api/extensions/rbchecklist.extension.Checklist/checklists/';
const SETUP_SVN_CREDENTIALS_URL = `http://biedronka.emea.nsn-net.net/r/${rbId}/rb_svncommit/ajax/encrypt_svn_credentials/`;
const SVN_COMMIT_URL = `http://biedronka.emea.nsn-net.net/r/${rbId}/rb_svncommit/ajax/commit/`;
const IS_COMMIT_ALLOWED_URL = `http://biedronka.emea.nsn-net.net/r/${rbId}/rb_svncommit/ajax/is_commit_allowed/`;

async function getPartialRbInfo(channel: RbChannel) {
  // mock review_request response
  mockedAxios.get.mockResolvedValueOnce({ data: REVIEW_REQUEST_RESPONSE });
  // mock latestDiffUrl response
  mockedAxios.get.mockResolvedValueOnce({ data: LATEST_DIFF_RESPONSE });
  // mock repository response
  mockedAxios.get.mockResolvedValueOnce({ data: REPOSITORY_RESPONSE });

  const ipcService = createIpcService(IpcChannel.GET_PARTIAL_RB);

  await channel.getPartialRbInfo(ipcService, { data: link });
}

async function isRbReady(channel: RbChannel) {
  mockedAxios.get.mockResolvedValueOnce({ data: IS_COMMIT_ALLOWED });
  const ipcService = createIpcService(IpcChannel.IS_RB_READY);
  await channel.isRbReady(ipcService, { data: link });
}

const fakeStore = new Store();
fakeStore.add(
  new Model<SettingsModel>({
    name: MODEL_NAME.SETTINGS,
    initValue: MODEL_INIT_VALUE.general,
  })
);

function createInstance() {
  return new RbChannel(fakeStore, null);
}

const mockEvent: any = { reply: jest.fn() };

function createIpcService(channel: IpcChannel): IpcService {
  const logger = Logger.for('test');
  return new IpcService(logger, mockEvent, channel);
}

describe('RbChannel', () => {
  describe('getPartialRbInfo', () => {
    afterEach(async () => {
      jest.resetAllMocks();
      // jest issue W/A: https://github.com/visionmedia/supertest/issues
      await new Promise((resolve) => setTimeout(() => resolve(null), 100));
    });
    it('should return correct partial RB info', async () => {
      const channel = new RbChannel(fakeStore, null);
      const expectedPartialRbInfo = {
        link,
        branch: '5G21A',
        name: REVIEW_REQUEST_RESPONSE.review_request.summary,
        repo: { name: 'MOAM', repository: 'BTS_SC_MOAM_LTE' },
      };

      // mock review_request response
      mockedAxios.get.mockResolvedValueOnce({ data: REVIEW_REQUEST_RESPONSE });
      // mock latestDiffUrl response
      mockedAxios.get.mockResolvedValueOnce({ data: LATEST_DIFF_RESPONSE });
      // mock repository response
      mockedAxios.get.mockResolvedValueOnce({ data: REPOSITORY_RESPONSE });

      const ipcService = createIpcService(IpcChannel.GET_PARTIAL_RB);

      await channel.getPartialRbInfo(ipcService, { data: link });
      expect(mockedAxios.get).toBeCalledWith(GET_REVIEW_REQUEST_URL);
      expect(mockedAxios.get).toBeCalledWith(LATEST_DIFF_URL);
      expect(mockedAxios.get).toBeCalledWith(REPOSITORY_INFO_URL);
      expect(mockEvent.reply).toBeCalledWith(IpcChannel.GET_PARTIAL_RB, {
        isOk: true,
        data: expectedPartialRbInfo,
        error: { type: null, message: null },
      });
    });

    it('should return whole summary as a name if RB summary is a plain string', async () => {
      const channel = createInstance();
      const expectedPartialRbInfo = {
        link,
        name: 'test',
        branch: '5G21A',
        repo: { name: 'MOAM', repository: 'BTS_SC_MOAM_LTE' },
      };

      // mock review_request response
      mockedAxios.get.mockResolvedValueOnce({ data: REVIEW_REQUEST_RESPONSE__SPECIAL_SUMMARY });
      // mock latestDiffUrl response
      mockedAxios.get.mockResolvedValueOnce({ data: LATEST_DIFF_RESPONSE });
      // mock repository response
      mockedAxios.get.mockResolvedValueOnce({ data: REPOSITORY_RESPONSE });

      const ipcService = createIpcService(IpcChannel.GET_PARTIAL_RB);

      await channel.getPartialRbInfo(ipcService, { data: link });
      expect(mockedAxios.get).toBeCalledWith(GET_REVIEW_REQUEST_URL);
      expect(mockedAxios.get).toBeCalledWith(LATEST_DIFF_URL);
      expect(mockedAxios.get).toBeCalledWith(REPOSITORY_INFO_URL);
      expect(mockEvent.reply).toBeCalledWith(IpcChannel.GET_PARTIAL_RB, {
        isOk: true,
        data: expectedPartialRbInfo,
        error: { type: null, message: null },
      });
    });
  });

  describe('svnCommit', () => {
    afterEach(async () => {
      jest.resetAllMocks();
      // jest issue W/A: https://github.com/visionmedia/supertest/issues
      await new Promise((resolve) => setTimeout(() => resolve(null), 100));
    });
    it(`should return { revision: '195696' } when commit successfuly`, async () => {
      const expectedCookies =
        'rbsessionid=rveen6bmfdddobeckqjomuj9jm9ccawl;svn_username=fake_svn_username;svn_password=fake_svn_password;';
      const channel = createInstance();
      await getPartialRbInfo(channel);
      await isRbReady(channel);
      // mock get rbsessionid response
      mockedAxios.post.mockResolvedValueOnce({
        headers: {
          'set-cookie': [
            'rbsessionid=rveen6bmfdddobeckqjomuj9jm9ccawl; Path=/; HttpOnly; Expires=Tue, 22 Mar 2022 07:36:31 GMT;',
          ],
        },
      });
      // mock svn credentials response
      mockedAxios.post.mockResolvedValueOnce({ data: { svn_username: 'fake_svn_username', svn_password: 'fake_svn_password' } });
      // mock svn commit response
      mockedAxios.post.mockResolvedValueOnce({ data: { message: 'Review was successfully committed to svn repository' } });
      // mock review_request response
      mockedAxios.get.mockResolvedValueOnce({ data: REVIEW_REQUEST_RESPONSE });

      const ipcService = createIpcService(IpcChannel.SVN_COMMIT);

      await channel.svnCommit(ipcService, { data: link });

      expect(mockEvent.reply).toBeCalledWith(IpcChannel.SVN_COMMIT, {
        isOk: true,
        data: { revision },
        error: { type: null, message: null },
      });

      expect(mockedAxios.post.mock.calls).toEqual([
        // expect get rbsessionid request
        [
          SETUP_RBSESSION_URL,
          `review_request_id=${rbId}`,
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Authorization: 'Basic bnNidXNlcm5hbWU6bnNicGFzc3dvcmQ=',
            },
          },
        ],
        // expect setup svn credentials request
        [
          SETUP_SVN_CREDENTIALS_URL,
          'svn_username=nsbusername&svn_password=svnpassword',
          {
            headers: {
              'X-Requested-With': 'XMLHttpRequest',
              Cookie: 'rbsessionid=rveen6bmfdddobeckqjomuj9jm9ccawl;',
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        ],
        // expect svn commit request
        [
          SVN_COMMIT_URL,
          'commit_scope=only_this&diffset_revision=6',
          {
            headers: {
              Referer: link,
              Cookie: expectedCookies,
              'X-Requested-With': 'XMLHttpRequest',
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        ],
      ]);
    });
    it(`should return { message: 'specific reason' } when commit message is invalid`, async () => {
      const expectedCookies =
        'rbsessionid=rveen6bmfdddobeckqjomuj9jm9ccawl;svn_username=fake_svn_username;svn_password=fake_svn_password;';
      const channel = createInstance();
      await getPartialRbInfo(channel);
      await isRbReady(channel);
      // mock get rbsessionid response
      mockedAxios.post.mockResolvedValueOnce({
        headers: {
          'set-cookie': [
            'rbsessionid=rveen6bmfdddobeckqjomuj9jm9ccawl; Path=/; HttpOnly; Expires=Tue, 22 Mar 2022 07:36:31 GMT;',
          ],
        },
      });
      // mock svn credentials response
      mockedAxios.post.mockResolvedValueOnce({ data: { svn_username: 'fake_svn_username', svn_password: 'fake_svn_password' } });
      // mock svn commit response
      mockedAxios.post.mockRejectedValueOnce({
        isAxiosError: true,
        response: { data: { message: 'specific reason' }, status: 400 },
      });
      // mock review_request response
      mockedAxios.get.mockResolvedValueOnce({ data: REVIEW_REQUEST_RESPONSE });

      const ipcService = createIpcService(IpcChannel.SVN_COMMIT);

      await channel.svnCommit(ipcService, { data: link });

      expect(mockEvent.reply).toBeCalledWith(IpcChannel.SVN_COMMIT, {
        isOk: true,
        data: { message: 'specific reason' },
        error: { type: null, message: null },
      });

      expect(mockedAxios.post.mock.calls).toEqual([
        // expect get rbsessionid request
        [
          SETUP_RBSESSION_URL,
          `review_request_id=${rbId}`,
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Authorization: 'Basic bnNidXNlcm5hbWU6bnNicGFzc3dvcmQ=',
            },
          },
        ],
        // expect setup svn credentials request
        [
          SETUP_SVN_CREDENTIALS_URL,
          'svn_username=nsbusername&svn_password=svnpassword',
          {
            headers: {
              'X-Requested-With': 'XMLHttpRequest',
              Cookie: 'rbsessionid=rveen6bmfdddobeckqjomuj9jm9ccawl;',
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        ],
        // expect svn commit request
        [
          SVN_COMMIT_URL,
          'commit_scope=only_this&diffset_revision=6',
          {
            headers: {
              Referer: link,
              Cookie: expectedCookies,
              'X-Requested-With': 'XMLHttpRequest',
              'Content-Type': 'application/x-www-form-urlencoded',
            },
          },
        ],
      ]);
    });
  });

  describe('isRbReady', () => {
    afterEach(async () => {
      jest.resetAllMocks();
      // jest issue W/A: https://github.com/visionmedia/supertest/issues
      await new Promise((resolve) => setTimeout(() => resolve(null), 100));
    });
    it('should return { ready: true } when RB is ready.', async () => {
      const channel = createInstance();

      mockedAxios.get.mockResolvedValueOnce({ data: IS_COMMIT_ALLOWED });
      const ipcService = createIpcService(IpcChannel.IS_RB_READY);
      await channel.isRbReady(ipcService, { data: link });
      expect(mockEvent.reply).toBeCalledWith(IpcChannel.IS_RB_READY, {
        isOk: true,
        data: { ready: true, message: '' },
        error: { type: null, message: null },
      });
      expect(mockedAxios.get).toBeCalledWith(IS_COMMIT_ALLOWED_URL, {
        headers: { Referer: link },
      });
    });
    it(`should return { ready: false, message: '...' } then RB is not ready`, async () => {
      const channel = createInstance();

      mockedAxios.get.mockResolvedValueOnce({ data: IS_COMMIT_NOT_ALLOWED });
      const ipcService = createIpcService(IpcChannel.IS_RB_READY);
      await channel.isRbReady(ipcService, { data: link });
      expect(mockEvent.reply).toBeCalledWith(IpcChannel.IS_RB_READY, {
        isOk: true,
        data: { ready: false, message: IS_COMMIT_NOT_ALLOWED.message },
        error: { type: null, message: null },
      });
      expect(mockedAxios.get).toBeCalledWith(IS_COMMIT_ALLOWED_URL, {
        headers: { Referer: link },
      });
    });
  });
});
