import { IpcChannel } from '@oam-kit/ipc';
import { modelConfig } from '@oam-kit/store';
import { APPData, Branch, Repo } from '@oam-kit/store/types';
import { MainFixture } from '../fixtures/mainFixture';

describe('Noral case:', () => {
  const fixture = new MainFixture();
  const repos: Repo[] = [
    { name: 'moam', repository: 'BTS_SC_MOAM_LTE', locked: false, reason: '' },
    { name: 'has', repository: 'BTS_SC_HAS_OAM', locked: false, reason: '' },
  ];
  const branches: Branch[] = [
    { id: 1, name: 'trunk', lock: { locked: false, repos: repos } },
    { id: 2, name: '5G21A', lock: { locked: false, repos: repos } },
  ];
  beforeEach(async () => {
    const mockedAppData: APPData = {} as APPData;
    mockedAppData[modelConfig.lockInfoBranch.name] = branches;
    fixture.visit('dashboard').then(() => {
      fixture.simulateBackendResToClient<APPData>(IpcChannel.GET_APP_DATA_RES, mockedAppData);
    });
  });

  it('should be working fine', () => {
    expect(1).eq(1);
  });
});

