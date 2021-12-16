// @ts-check
///<reference path="../global.d.ts" />

import { SyncCodeResData, SyncCodeStep } from '@oam-kit/utility/types';
import { IpcChannel } from '@oam-kit/utility/types';
import { profileFixture, projectFixture } from '../fixtures/appData';
import { MainFixture } from '../fixtures/mainFixture';

function finishSyncStep(fixture: MainFixture, n: number, opt: { isSuccess: boolean; errorMsg?: string } = { isSuccess: true }) {
  let step: SyncCodeStep;
  switch (n) {
    case 1:
      step = SyncCodeStep.CONNECT_TO_SERVER;
      break;
    case 2:
      step = SyncCodeStep.CREATE_DIFF;
      break;
    case 3:
      step = SyncCodeStep.UPLOAD_DIFF;
      break;
    case 4:
      step = SyncCodeStep.APPLY_DIFF;
      break;
    default:
      throw new Error('[fn][finishSyncStep] Only have four steps');
  }
  if (opt.isSuccess) {
    fixture.simulator.replyOkWithData<SyncCodeResData>(IpcChannel.SYNC_CODE, { step });
  } else {
    fixture.simulator.replayNokWithData<SyncCodeResData>(IpcChannel.SYNC_CODE, { step }, opt.errorMsg);
  }
}

function selectedLabelShoudBe(label: string) {
  cy.wait(500).getBySel('project-select').find('nz-select-item').should('contain.text', label);
}

describe('Scenario1: add new project', () => {
  const initData: any = {
    syncCode: {
      projects: [],
    },
    general: { serverList: [projectFixture.serverAddr], profile: profileFixture },
  };
  const fixture = new MainFixture({ initData });
  beforeEach(() => {
    fixture.visit('sync-code');
    cy.getBySel('project-select').click();
    cy.getBySel('add-project-button').click().wait(500);
  });

  it('Case1: remote address validation failed', () => {
    cy.getBySel('server-addr-select').click();
    cy.get('nz-option-item').first().click();
    cy.wait(100).then(() => fixture.simulator.replayNokWithNoData(IpcChannel.SERVER_CHECK));
    cy.getBySel('server-addr-validation-alert').should(
      'include.text',
      `Can't connect to ${projectFixture.serverAddr}, please make sure it is working.`
    );
    cy.getBySel('save-project-button').should('be.disabled');
  });

  it('Case2: local project path validation failed', () => {});

  it('Case3: remote project path validation failed - path not exists', () => {
    cy.getBySel('server-addr-select').click();
    cy.get('nz-option-item').first().click();
    cy.wait(100).then(() => fixture.simulator.replyOkWithNoData(IpcChannel.SERVER_CHECK));
    cy.getBySel('remote-project-path-input')
      .type(projectFixture.remotePath)
      .then(() => {
        fixture.simulator.replayNokWithNoData(IpcChannel.SERVER_DIRECTORY_CHECK);
      });
    cy.getBySel('remote-project-path-validation-alert').should(
      'include.text',
      `${projectFixture.remotePath} does not exist in the ${projectFixture.serverAddr}`
    );
    cy.getBySel('save-project-button').should('be.disabled');
  });

  it('Case4: add new server address', () => {
    cy.getBySel('server-addr-select').click();
    cy.getBySel('new-server-addr-input').type('test');
    cy.getBySel('add-server-addr-button').click();
    cy.get('nz-option-item').should('have.length', 2);
    cy.get('nz-option-item').last().click();
    cy.get('nz-select-item').should('contain.text', 'test');
  });

  it('Case5: the "selected project" should be the new project', () => {
    cy.fillAllProjectInfo(fixture, projectFixture);
    cy.getBySel('save-project-button').click();
    selectedLabelShoudBe(projectFixture.name);
  });
});

describe('Scenario2: project modification', () => {
  const project2: any = {};
  Object.assign(project2, projectFixture);
  project2.name = '5G21A';
  const initData: any = {
    syncCode: {
      projects: [projectFixture, project2],
    },
    general: { serverList: [projectFixture.serverAddr], profile: profileFixture },
  };
  const fixture = new MainFixture({ initData });
  beforeEach(() => {
    fixture.visit('sync-code');
    cy.getBySel('sync-code-button').should('be.enabled');
    cy.getBySel('project-select').click();
  });
  it('Case1: edit project', () => {
    // if no change happened, button should be disabled
    cy.getBySel('edit-project-button').first().click().wait(500);
    cy.getBySel('save-project-button').should('be.disabled');
    // if there are changes, button should be enabled
    cy.getBySel('project-name-input').clear();
    cy.getBySel('project-name-input').type('SBTS21A');
    cy.getBySel('save-project-button').should('be.enabled');
    // if no change happened, button should back to be disabled
    cy.getBySel('project-name-input').clear();
    cy.getBySel('project-name-input').type(projectFixture.name);
    cy.getBySel('save-project-button').should('be.disabled');
    // change name to 'SBTS21A' then click, the selected project should change to 'SBTS21A'
    cy.getBySel('project-name-input').clear();
    cy.getBySel('project-name-input').type('SBTS21A');
    cy.getBySel('save-project-button').click();
    selectedLabelShoudBe('SBTS21A');
  });

  it('Case2: delete project', () => {
    cy.get('nz-option-item').last().click();
    selectedLabelShoudBe('5G21A');
    cy.getBySel('project-select').click();
    cy.getBySel('edit-project-button').last().click().wait(500);
    cy.getBySel('delete-project-button').click();
    selectedLabelShoudBe('TRUNK');
  });
});

describe('Scenario3: sync code', () => {
  const initData: any = { general: { profile: profileFixture }, syncCode: { projects: [projectFixture] } };
  const fixture = new MainFixture({ initData });
  beforeEach(() => {
    fixture.visit('sync-code');
    cy.getBySel('sync-code-button').click();
  });
  it('Case1: should be successfully when everything is fine.', () => {
    cy.get('nz-step').should('have.length', 4);
    cy.get('nz-step').eq(0).as('first');
    cy.get('nz-step').eq(1).as('second');
    cy.get('nz-step').eq(2).as('third');
    cy.get('nz-step').eq(3).as('fourth');
    cy.assertStepStatus('@first', 'process');
    cy.wait(500)
      .then(finishSyncStep.bind(this, fixture, 1))
      .then(() => {
        cy.assertStepStatus('@first', 'finish');
        cy.assertStepStatus('@second', 'process');
      });
    cy.wait(500)
      .then(finishSyncStep.bind(this, fixture, 2))
      .then(() => {
        cy.assertStepStatus('@second', 'finish');
        cy.assertStepStatus('@third', 'process');
      });
    cy.wait(500)
      .then(finishSyncStep.bind(this, fixture, 3))
      .then(() => {
        cy.assertStepStatus('@third', 'finish');
        cy.assertStepStatus('@fourth', 'process');
      });
    cy.wait(500)
      .then(finishSyncStep.bind(this, fixture, 4))
      .then(() => {
        cy.assertStepStatus('@fourth', 'finish');
      });
  });

  it('Case2: step1 failed, then alter error message.', () => {
    const errorMsg = 'Step1 failed';
    cy.wait(500).then(finishSyncStep.bind(this, fixture, 1, { isSuccess: false, errorMsg }));
    cy.get('[ng-reflect-nz-type=close-circle]').should('exist');
    cy.get('.ant-notification-notice-description').should('have.text', errorMsg);
  });
  it('Case3: step2 failed, then alter error message.', () => {
    const errorMsg = 'Step2 failed';
    cy.wait(500)
      .then(() => {
        finishSyncStep(fixture, 1);
        return cy.wait(500);
      })
      .then(() => {
        finishSyncStep(fixture, 2, { isSuccess: false, errorMsg });
      });
    cy.get('[ng-reflect-nz-type=close-circle]').should('exist');
    cy.get('.ant-notification-notice-description').should('have.text', errorMsg);
  });
  it('Case4: step3 failed, then alter error message.', () => {
    const errorMsg = 'Step3 failed';
    cy.wait(500)
      .then(() => {
        finishSyncStep(fixture, 1);
        return cy.wait(500);
      })
      .then(() => {
        finishSyncStep(fixture, 2);
        return cy.wait(500);
      })
      .then(() => {
        finishSyncStep(fixture, 3, { isSuccess: false, errorMsg });
      });
    cy.get('[ng-reflect-nz-type=close-circle]').should('exist');
    cy.get('.ant-notification-notice-description').should('have.text', errorMsg);
  });
  it('Case5: step4 failed, then alter error message.', () => {
    const errorMsg = 'Step4 failed';
    cy.wait(500)
      .then(() => {
        finishSyncStep(fixture, 1);
        return cy.wait(500);
      })
      .then(() => {
        finishSyncStep(fixture, 2);
        return cy.wait(500);
      })
      .then(() => {
        finishSyncStep(fixture, 3);
        return cy.wait(500);
      })
      .then(() => {
        finishSyncStep(fixture, 4, { isSuccess: false, errorMsg });
      });
    cy.get('[ng-reflect-nz-type=close-circle]').should('exist');
    cy.get('.ant-notification-notice-description').should('have.text', errorMsg);
  });
});
