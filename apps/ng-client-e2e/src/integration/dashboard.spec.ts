import { IpcChannel } from '@oam-kit/ipc';
import { modelConfig } from '@oam-kit/store';
import { APPData, Branch, Repo } from '@oam-kit/store/types';
import { MainFixture } from '../fixtures/mainFixture';

function firstPanel() {
  return cy.get('.branch-lock-panel-wrapper').first();
}

function secondPanel() {
  return cy.get('.branch-lock-panel-wrapper').last();
}

const repos: Repo[] = [
  { name: 'moam', repository: 'BTS_SC_MOAM_LTE', locked: false, reason: '' },
  { name: 'has', repository: 'BTS_SC_HAS_OAM', locked: true, reason: 'Auto lock' },
];
const branches: Branch[] = [
  { id: 1, name: 'trunk', lock: { locked: false, repos: repos } },
  { id: 2, name: '5G21A', lock: { locked: true, repos: repos, reason: 'Lock by BC' } },
];

describe('Display two panels correctly', () => {
  const fixture = new MainFixture();

  beforeEach(() => {
    const mockedAppData: APPData = {} as APPData;
    mockedAppData[modelConfig.lockInfoBranch.name] = branches;
    fixture.visit('dashboard').then(() => {
      fixture.simulateBackendResToClient<APPData>(IpcChannel.GET_APP_DATA_RES, mockedAppData);
    });
  });

  it('display branch name', () => {
    firstPanel()
      .children('.branch-lock-panel__header')
      .children('.branch-lock-panel__name')
      .should('have.text', 'trunk');
    secondPanel()
      .children('.branch-lock-panel__header')
      .children('.branch-lock-panel__name')
      .should('have.text', '5G21A');
  });
  it('display repository name', () => {
    firstPanel()
      .children('.branch-lock-panel__repo')
      .first()
      .children('.branch-lock-panel__repo--right')
      .children('.branch-lock-panel__name')
      .should('have.text', 'moam');
    firstPanel()
      .children('.branch-lock-panel__repo')
      .last()
      .children('.branch-lock-panel__repo--right')
      .children('.branch-lock-panel__name')
      .should('have.text', 'has');
    secondPanel()
      .children('.branch-lock-panel__repo')
      .first()
      .children('.branch-lock-panel__repo--right')
      .children('.branch-lock-panel__name')
      .should('have.text', 'moam');
    secondPanel()
      .children('.branch-lock-panel__repo')
      .last()
      .children('.branch-lock-panel__repo--right')
      .children('.branch-lock-panel__name')
      .should('have.text', 'has');
  });
  it('display lock/unlock icon', () => {
    /**
     * Firt panel:
     * 1. first repository: 'unlock'
     * 2. second repository: 'lock'
     */
    firstPanel()
      .children('.branch-lock-panel__repo')
      .first()
      .children('.branch-lock-panel__lock-icon')
      .should('have.attr', 'ng-reflect-nz-type', 'unlock');
    firstPanel()
      .children('.branch-lock-panel__repo')
      .last()
      .children('.branch-lock-panel__lock-icon')
      .should('have.attr', 'ng-reflect-nz-type', 'lock');
    /**
     * Second panel:
     * 1. first repository: 'lock' due to branch lock
     * 2. second repository: 'lock' due to branch lock
     */
    secondPanel()
      .children('.branch-lock-panel__repo')
      .first()
      .children('.branch-lock-panel__lock-icon')
      .should('have.attr', 'ng-reflect-nz-type', 'lock');
    secondPanel()
      .children('.branch-lock-panel__repo')
      .last()
      .children('.branch-lock-panel__lock-icon')
      .should('have.attr', 'ng-reflect-nz-type', 'lock');
  });
});

describe('Repo listening', () => {
  const mainFixture = new MainFixture();
});
