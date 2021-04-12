import { SyncCodeStep } from '@oam-kit/sync-code';
import { IpcChannel, Project } from '@oam-kit/utility/types';
import { MainFixture } from '../fixtures/mainFixture';
import { fullProfileInfoAndExpected } from '../fixtures/profileFixture';

function finishSyncStep(fixture: MainFixture, n: number, opt: { isSuccess: boolean; errorMsg?: string } = { isSuccess: true }) {
  let step: string;
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
    fixture.simulateBackendResToClient<string>(IpcChannel.SYNC_CODE_RES, step);
  } else {
    fixture.simulateBackendResToClient(IpcChannel.SYNC_CODE_RES, {
      name: step,
      message: opt.errorMsg,
    });
  }
}

function selectedLabelShoudBe(label: string) {
  cy.wait(500).get('nz-select').find('nz-select-item').should('contain.text', label);
}

function fillAllProjectFields(fixture: MainFixture) {
  cy.get('input[name="name"]').type(project.name);
  cy.get('nz-select[formcontrolname="serverAddr"]').click();
  selectServerAddr().then(() => {
    fixture.simulateBackendResToClient(IpcChannel.SERVER_CHECK_RES, true);
  });
  cy.get('input[name="localPath"]').type(project.localPath);
  cy.get('input[name="remotePath"]')
    .type(project.remotePath)
    .then(() => {
      fixture.simulateBackendResToClient(IpcChannel.SERVER_DIRECTORY_CHECK_RES, true);
    });
}

function selectServerAddr() {
  cy.get('nz-select[formcontrolname="serverAddr"]').click();
  return cy.get('nz-option-item').children().first().click();
}

function saveBtnShouldBeDisabled() {
  cy.get('button[data-btn-type="save"]').should('be.disabled');
}

const fixture = new MainFixture();
const project: Partial<Project> = {
  name: 'TRUNK',
  localPath: '/moam/trunk',
  remotePath: '/var/fpwork/zowu/moam/trunk',
};

describe('Scenario1: add new project', () => {
  beforeEach(() => {
    fixture.visit('sync-code');
    cy.get('nz-select').as('select').click();
    cy.get('a[data-btn-type="addBranch"]').click().wait(500);
  });

  it('Case1: remote address validation failed', () => {
    selectServerAddr().then(() => {
      fixture.simulateBackendResToClient(IpcChannel.SERVER_CHECK_RES, false);
    });
    cy.get('.server-validation__allert').should(
      'include.text',
      `Can't connect to hzlinb35.china.nsn-net.net, please make sure it is working.`
    );
    saveBtnShouldBeDisabled();
  });

  it('Case2: local project path validation failed', () => {});

  it('Case3: remote project path validation failed - path not exists', () => {
    selectServerAddr().then(() => {
      fixture.simulateBackendResToClient(IpcChannel.SERVER_CHECK_RES, true);
    });
    cy.get('input[name="remotePath"]')
      .type(project.remotePath)
      .then(() => {
        fixture.simulateBackendResToClient(IpcChannel.SERVER_DIRECTORY_CHECK_RES, false);
      });
    cy.get('.remote-path-validation__allert').should(
      'include.text',
      `/var/fpwork/zowu/moam/trunk does not exist in the hzlinb35.china.nsn-net.net`
    );
    saveBtnShouldBeDisabled();
  });

  it('Case4: the "selected project" should be the new project', () => {
    fillAllProjectFields(fixture);
    cy.get('button[data-btn-type="save"]').click();
    selectedLabelShoudBe(project.name);
  });
});

describe('Scenario2: project modification', () => {
  it('Case1: edit project', () => {});

  it('Case1: delete project', () => {});
});

describe.only('Scenario3: sync code', () => {
  beforeEach(() => {
    fixture.visit('profile');
    fullProfileInfoAndExpected();
    fixture.navigate('Sync Code');
    cy.get('nz-select').as('select').click();
    cy.get('a[data-btn-type="addBranch"]').click().wait(500);
    fillAllProjectFields(fixture);
    cy.get('button[data-btn-type="save"]').click();
    cy.get('[data-btn-type=sync]').click();
  });
  it('Case1: should be successfully when everything is fine.', () => {
    cy.get('nz-step').should('have.length', 4);
    cy.get('nz-step').eq(0).as('first');
    cy.get('nz-step').eq(1).as('second');
    cy.get('nz-step').eq(2).as('third');
    cy.get('nz-step').eq(3).as('fourth');
    cy.assertStepStatus('@first', 'process');
    cy.wait(1000)
      .then(finishSyncStep.bind(this, fixture, 1))
      .then(() => {
        cy.assertStepStatus('@first', 'finish');
        cy.assertStepStatus('@second', 'process');
      });
    cy.wait(1000)
      .then(finishSyncStep.bind(this, fixture, 2))
      .then(() => {
        cy.assertStepStatus('@second', 'finish');
        cy.assertStepStatus('@third', 'process');
      });
    cy.wait(1000)
      .then(finishSyncStep.bind(this, fixture, 3))
      .then(() => {
        cy.assertStepStatus('@third', 'finish');
        cy.assertStepStatus('@fourth', 'process');
      });
    cy.wait(1000)
      .then(finishSyncStep.bind(this, fixture, 4))
      .then(() => {
        cy.assertStepStatus('@fourth', 'finish');
      });
  });

  it('Case2: step1 failed, then alter error message.', () => {
    const errorMsg = 'Step1 failed';
    cy.wait(1000).then(finishSyncStep.bind(this, fixture, 1, { isSuccess: false, errorMsg }));
    cy.get('[ng-reflect-nz-type=close-circle]').should('exist');
    cy.get('.ant-notification-notice-description').should('have.text', errorMsg);
  });
  it('Case3: step2 failed, then alter error message.', () => {
    const errorMsg = 'Step2 failed';
    cy.wait(1000)
      .then(() => {
        finishSyncStep(fixture, 1);
        return cy.wait(1000);
      })
      .then(() => {
        finishSyncStep(fixture, 2, { isSuccess: false, errorMsg });
      });
    cy.get('[ng-reflect-nz-type=close-circle]').should('exist');
    cy.get('.ant-notification-notice-description').should('have.text', errorMsg);
  });
  it('Case4: step3 failed, then alter error message.', () => {
    const errorMsg = 'Step3 failed';
    cy.wait(1000)
      .then(() => {
        finishSyncStep(fixture, 1);
        return cy.wait(1000);
      })
      .then(() => {
        finishSyncStep(fixture, 2);
        return cy.wait(1000);
      })
      .then(() => {
        finishSyncStep(fixture, 3, { isSuccess: false, errorMsg });
      });
    cy.get('[ng-reflect-nz-type=close-circle]').should('exist');
    cy.get('.ant-notification-notice-description').should('have.text', errorMsg);
  });
  it('Case5: step4 failed, then alter error message.', () => {
    const errorMsg = 'Step4 failed';
    cy.wait(1000)
      .then(() => {
        finishSyncStep(fixture, 1);
        return cy.wait(1000);
      })
      .then(() => {
        finishSyncStep(fixture, 2);
        return cy.wait(1000);
      })
      .then(() => {
        finishSyncStep(fixture, 3);
        return cy.wait(1000);
      })
      .then(() => {
        finishSyncStep(fixture, 4, { isSuccess: false, errorMsg });
      });
    cy.get('[ng-reflect-nz-type=close-circle]').should('exist');
    cy.get('.ant-notification-notice-description').should('have.text', errorMsg);
  });
});
