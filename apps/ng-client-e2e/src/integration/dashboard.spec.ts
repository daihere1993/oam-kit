import { modelConfig } from '@oam-kit/store';
import { Branch, Repo } from '@oam-kit/store/types';
import { cloneDeep } from 'lodash';
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
    const store = fixture.store;
    const branchModel = store.get(modelConfig.lockInfoBranch.name);
    branchModel.init(branches);
    fixture.visit('dashboard');
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
  const fixture = new MainFixture();
  beforeEach(() => {
    const store = fixture.store;
    const branchModel = store.get(modelConfig.lockInfoBranch.name);
    branchModel.init(branches);
    fixture.visit('dashboard');
  });

  it('should not be listened if repo is unlock', () => {
    firstPanel()
      .children('.branch-lock-panel__repo')
      .first()
      .children('.branch-lock-panel__repo--right')
      .children('.branch-lock-panel__bell-icon')
      .click();
    cy.get('.ant-popover-content').should('not.exist');
  });
});

describe('Panel modification', () => {
  const visibleBranches = [{ name: 'trunk' }, { name: '5G21A' }, { name: 'SBTS21A' }, { name: 'STBS20C' }];
  const visibleRepos: Repo[] = [
    { name: 'moam', repository: 'BTS_SC_MOAM_LTE' },
    { name: 'has', repository: 'BTS_SC_HAS_OAM' },
    { name: 'test', repository: 'test' },
  ];
  const fixture = new MainFixture();
  beforeEach(() => {
    const store = fixture.store;
    const branchModel = store.get(modelConfig.lockInfoBranch.name);
    const visibleBranchesModel = store.get(modelConfig.visibleBranches.name);
    const visibleRepoesModel = store.get(modelConfig.visibleRepos.name);
    branchModel.init(cloneDeep(branches));
    visibleBranchesModel.init(cloneDeep(visibleBranches));
    visibleRepoesModel.init(cloneDeep(visibleRepos));
    fixture.visit('dashboard');
  });

  it('add a new panel', () => {
    cy.get('nz-select[name="branchSelect"]').click();
    cy.get('nz-option-item').last().click().wait(100);
    cy.get('nz-select[name="repoSelect"]').click();
    cy.get('nz-option-item').first().click().wait(100);
    cy.get('button[data-btn-type="update"]').click();
    // should have a new panel in page
    cy.get('.dashboard-brach-lock-container').should('have.length', 3);
  });

  it('add new repository for existed branch', () => {
    cy.get('nz-select[name="branchSelect"]').click();
    cy.get('nz-option-item').first().click().wait(100);
    cy.get('nz-select[name="repoSelect"]').click();
    cy.get('nz-option-item').last().click();
    cy.get('button[data-btn-type="update"]').click();
    firstPanel().children('.branch-lock-panel__repo').should('have.length', 3);
  });

  it('delete existed repository', () => {
    cy.get('nz-select[name="branchSelect"]').click();
    cy.get('nz-option-item').first().click().wait(100);
    cy.get('.ant-select-selection-item-remove').first().click();
    cy.get('button[data-btn-type="update"]').click();
    firstPanel().children('.branch-lock-panel__repo').should('have.length', 1);
  });

  it('delete a panel', () => {
    cy.get('nz-select[name="branchSelect"]').click();
    cy.get('nz-option-item').first().click().wait(100);
    cy.get('button[data-btn-type="delete"]').click();
    cy.get('.branch-lock-panel-wrapper').should('have.length', 1);
  });

  it('save button should be disabled when branch and repository isn\'t changed.', () => {
    cy.get('nz-select[name="branchSelect"]').click();
    cy.get('nz-option-item').first().click().wait(100);
    cy.get('button[data-btn-type="update"]').should('be.disabled');
  });
});
