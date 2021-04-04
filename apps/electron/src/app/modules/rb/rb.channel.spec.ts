import axios from 'axios';
import { IpcChannel } from '@oam-kit/ipc';
import { RbChannel } from './rb.channel';
import {
  IS_COMMIT_ALLOWED,
  IS_COMMIT_NOT_ALLOWED,
  LATEST_DIFF_RESPONSE,
  REPOSITORY_RESPONSE,
  REVIEW_REQUEST_RESPONSE,
} from './__test__/api_response';

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
const fakeStore: any = {
  get() {
    return { data: { username: 'username', password: 'password' } };
  },
};

async function getPartialRbInfo(channel: RbChannel, mockEvent: any) {
  // mock review_request response
  mockedAxios.get.mockResolvedValueOnce({ data: REVIEW_REQUEST_RESPONSE });
  // mock latestDiffUrl response
  mockedAxios.get.mockResolvedValueOnce({ data: LATEST_DIFF_RESPONSE });
  // mock repository response
  mockedAxios.get.mockResolvedValueOnce({ data: REPOSITORY_RESPONSE });

  await channel.getPartialRbInfo(mockEvent, { responseChannel: IpcChannel.GET_PARTIAL_RB_RES, data: link });
}

async function isRbReady(channel: RbChannel, mockEvent: any) {
  mockedAxios.get.mockResolvedValueOnce({ data: IS_COMMIT_ALLOWED });
  await channel.isRbReady(mockEvent, { responseChannel: IpcChannel.IS_RB_READY_RES, data: link });
}

describe('RbChannel', () => {
  describe('getPartialRbInfo', () => {
    const mockEvent: any = { reply: jest.fn() };
    it('should return correct partial RB info', async () => {
      const channel = new RbChannel(fakeStore);
      const expectedPartialRbInfo = {
        link,
        name: 'PR575809',
        branch: '5G21A',
        repo: { name: 'MOAM', repository: 'BTS_SC_MOAM_LTE' },
      };

      await getPartialRbInfo(channel, mockEvent);
      expect(mockedAxios.get).toBeCalledWith(GET_REVIEW_REQUEST_URL);
      expect(mockedAxios.get).toBeCalledWith(LATEST_DIFF_URL);
      expect(mockedAxios.get).toBeCalledWith(REPOSITORY_INFO_URL);
      expect(mockEvent.reply).toBeCalledWith(IpcChannel.GET_PARTIAL_RB_RES, { isSuccessed: true, data: expectedPartialRbInfo });
    });
  });

  describe('svnCommit', () => {
    let mockEvent: any;
    beforeEach(() => {
      mockEvent = { reply: jest.fn() }
    });
    afterEach(() => {
      jest.clearAllMocks();
    });
    it(`should return { revision: '195696' } when commit successfuly`, async () => {
      const expectedCookies =
        'rbsessionid=rveen6bmfdddobeckqjomuj9jm9ccawl;svn_username=fake_svn_username;svn_password=fake_svn_password;';
      const channel = new RbChannel(fakeStore);
      await isRbReady(channel, mockEvent);
      await getPartialRbInfo(channel, mockEvent);
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

      await channel.svnCommit(mockEvent, { responseChannel: IpcChannel.SVN_COMMIT_RES, data: link });

      expect(mockEvent.reply).toBeCalledWith(IpcChannel.SVN_COMMIT_RES, { isSuccessed: true, data: { revision } });

      expect(mockedAxios.post.mock.calls).toEqual([
        // expect get rbsessionid request
        [
          SETUP_RBSESSION_URL,
          `review_request_id=${rbId}`,
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Authorization: 'Basic dXNlcm5hbWU6cGFzc3dvcmQ=',
            },
          },
        ],
        // expect setup svn credentials request
        [
          SETUP_SVN_CREDENTIALS_URL,
          'svn_username=username&svn_password=password',
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
      const channel = new RbChannel(fakeStore);
      await isRbReady(channel, mockEvent);
      await getPartialRbInfo(channel, mockEvent);
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
      mockedAxios.post.mockRejectedValueOnce({ isAxiosError: true, code: '400', response: { data: { message: 'specific reason' } } });
      // mock review_request response
      mockedAxios.get.mockResolvedValueOnce({ data: REVIEW_REQUEST_RESPONSE });

      await channel.svnCommit(mockEvent, { responseChannel: IpcChannel.SVN_COMMIT_RES, data: link });

      expect(mockEvent.reply).toBeCalledWith(IpcChannel.SVN_COMMIT_RES, { isSuccessed: true, data: { message: 'specific reason' } });

      expect(mockedAxios.post.mock.calls).toEqual([
        // expect get rbsessionid request
        [
          SETUP_RBSESSION_URL,
          `review_request_id=${rbId}`,
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              Authorization: 'Basic dXNlcm5hbWU6cGFzc3dvcmQ=',
            },
          },
        ],
        // expect setup svn credentials request
        [
          SETUP_SVN_CREDENTIALS_URL,
          'svn_username=username&svn_password=password',
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
    let mockEvent: any;
    beforeEach(() => {
      mockEvent = { reply: jest.fn() }
    });
    afterEach(() => {
      jest.clearAllMocks();
      jest.resetAllMocks()
    });
    it('should return { ready: true } when RB is ready.', async () => {
      const channel = new RbChannel(fakeStore);

      mockedAxios.get.mockResolvedValueOnce({ data: IS_COMMIT_ALLOWED });
      await channel.isRbReady(mockEvent, { responseChannel: IpcChannel.IS_RB_READY_RES, data: link });
      expect(mockEvent.reply).toBeCalledWith(IpcChannel.IS_RB_READY_RES, { isSuccessed: true, data: { ready: true } });
      expect(mockedAxios.get).toBeCalledWith(IS_COMMIT_ALLOWED_URL, {
        headers: { Referer: link },
      });
    });
    it(`should return { ready: false, message: '...' } then RB is not ready`, async () => {
      const channel = new RbChannel(fakeStore);

      mockedAxios.get.mockResolvedValueOnce({ data: IS_COMMIT_NOT_ALLOWED });
      await channel.isRbReady(mockEvent, { responseChannel: IpcChannel.IS_RB_READY_RES, data: link });
      expect(mockEvent.reply).toBeCalledWith(IpcChannel.IS_RB_READY_RES, {
        isSuccessed: true,
        data: { ready: false, message: IS_COMMIT_NOT_ALLOWED.message },
      });
      expect(mockedAxios.get).toBeCalledWith(IS_COMMIT_ALLOWED_URL, {
        headers: { Referer: link },
      });
    });
  });
});
