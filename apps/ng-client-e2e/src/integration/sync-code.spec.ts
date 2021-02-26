import { Branch, Profile } from '@oam-kit/store/types';
import { SyncCodeStep } from '@oam-kit/sync-code';
import { IpcChannel } from '@oam-kit/ipc';
import { MainFixture } from '../fixtures/mainFixture';

function finishSyncStep(
  fixture: MainFixture,
  n: number,
  opt: { isSuccess: boolean; errorMsg?: string } = { isSuccess: true }
) {
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

function addBranchAndExpectTheResult(
  branch: Branch = {
    name: 'TRUNK',
    directory: {
      target: '/var/fpwork/zowu/moam/trunk',
      source: '/moam/trunk',
    },
  }
) {
  cy.get('nz-select').as('select').click();
  cy.get('a[data-btn-type="addBranch"]').click().wait(500);
  cy.get('input[name="branchName"]').type(branch.name);
  cy.get('input[name="target"]').type(branch.directory.target);
  cy.get('input[name="source"]').type(branch.directory.source);
  // Must wait some time when click save button to make sure corresponding code got execute then to update data.
  return cy
    .get('button')
    .contains('Save')
    .click()
    .wait(500)
    .then(() => {
      cy.get('@select').find('nz-select-item').should('contain.text', 'TRUNK');
    });
}

function fullAllProfileInfo() {
  const profile: Profile = { remote: 'test remote', username: 'test username', password: 'test password' };
  cy.get('input[name="remote"]').as('remote').type(profile.remote);
  cy.get('input[name="username"]').as('username').type(profile.username);
  cy.get('input[name="password"]').as('password').type(profile.password);
  cy.get('button[data-btn-type="save"]').click();
  cy.get('[ng-reflect-nz-type=check-circle]').should('exist');
  cy.get('.ant-notification-notice-message').should('have.text', 'Success');
}

describe('Normal case', () => {
  let fixture: MainFixture;
  before(() => {
    fixture = new MainFixture();
  });

  after(() => {
    fixture.destroy();
  });

  it('Setup profile', () => {
    fixture.visit('profile');
    fullAllProfileInfo();
  });

  it('Add a new branch', function () {
    fixture.visit('/sync-code');
    addBranchAndExpectTheResult();
  });

  it('All steps should be wait before code sync', () => {
    cy.get('nz-step')
      .as('steps')
      .each(($el) => {
        cy.wrap($el).should('have.attr', 'ng-reflect-nz-status', 'wait');
      });
  });

  it('Sync code when everything is ready', function () {
    cy.get('nz-select').find('nz-select-item').should('contain.text', 'TRUNK');
    cy.get('button')
      .contains('Sync Code')
      .click()
      .then(() => {
        cy.get('nz-step').should('have.length', 4);
        cy.get('nz-step').eq(0).as('first');
        cy.get('nz-step').eq(1).as('second');
        cy.get('nz-step').eq(2).as('third');
        cy.get('nz-step').eq(3).as('fourth');
        cy.setStepStatus('@first', 'process');
        cy.wait(1000)
          .then(finishSyncStep.bind(this, fixture, 1))
          .then(() => {
            cy.setStepStatus('@first', 'finish');
            cy.setStepStatus('@second', 'process');
          });
        cy.wait(1000)
          .then(finishSyncStep.bind(this, fixture, 2))
          .then(() => {
            cy.setStepStatus('@second', 'finish');
            cy.setStepStatus('@third', 'process');
          });
        cy.wait(1000)
          .then(finishSyncStep.bind(this, fixture, 3))
          .then(() => {
            cy.setStepStatus('@third', 'finish');
            cy.setStepStatus('@fourth', 'process');
          });
        cy.wait(1000)
          .then(finishSyncStep.bind(this, fixture, 4))
          .then(() => {
            cy.setStepStatus('@fourth', 'finish');
          });
      });
    cy.get('nz-select').find('nz-select-item').should('contain.text', 'TRUNK');
  });
});

describe('Edge cases', () => {
  /**
   * 1. isn't ready
   *  1.1 didn't setup setting
   *  1.2 no branch selected
   *  1.3 Sync on going
   * 2. server failed
   *  2.1 step1 faild with failed message
   *  2.2 step2 faild with failed message
   *  2.3 step3 faild with failed message
   *  2.4 step4 faild with failed message
   */

  describe("Isn't ready", () => {
    const fixture = new MainFixture();
    after(() => {
      fixture.destroy();
    });
    it("Shouldn't work when profile is empty", () => {
      fixture.visit('sync-code');
      cy.get('[data-btn-type=sync]').click();
      cy.get('[ng-reflect-nz-type=close-circle]').should('exist');
      cy.get('.ant-notification-notice-description').should(
        'have.text',
        'Please fill corresponding setting.'
      );
    });
    it("Shouldn't work when no branch selected", () => {
      fixture.visit('profile');
      fullAllProfileInfo();
      fixture.visit('sync-code');
      cy.get('[data-btn-type=sync]').click();
      cy.get('[ng-reflect-nz-type=close-circle]').should('exist');
      cy.get('.ant-notification-notice-description').should('have.text', 'Please add a branch first.');
    });
    it('Button should display "on going" when sync on going', () => {
      addBranchAndExpectTheResult();
      cy.get('[data-btn-type=sync]').as('syncBtn').click().wait(500);
      cy.get('@syncBtn').should('have.attr', 'ng-reflect-nz-loading', 'true');
    });
  });

  describe('Electron failed with specific reason', () => {
    const fixture = new MainFixture();
    before(() => {
      fixture.visit('profile');
      fullAllProfileInfo();
      fixture.visit('sync-code');
      addBranchAndExpectTheResult();
    });
    afterEach(() => {
      fixture.visit('sync-code');
    });
    it('Step1 failed', () => {
      const errorMsg = 'Step1 failed';
      cy.get('[data-btn-type=sync]')
        .click()
        .wait(1000)
        .then(finishSyncStep.bind(this, fixture, 1, { isSuccess: false, errorMsg }));
      cy.get('[ng-reflect-nz-type=close-circle]').should('exist');
      cy.get('.ant-notification-notice-description').should('have.text', errorMsg);
    });
    it('Step2 failed', () => {
      const errorMsg = 'Step2 failed';
      cy.get('[data-btn-type=sync]')
        .click()
        .wait(1000)
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
    it('Step3 failed', () => {
      const errorMsg = 'Step3 failed';
      cy.get('[data-btn-type=sync]')
        .click()
        .wait(1000)
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
    it('Step4 failed', () => {
      const errorMsg = 'Step4 failed';
      cy.get('[data-btn-type=sync]')
        .click()
        .wait(1000)
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

  describe('Page data', () => {
    const fixture = new MainFixture();
    after(() => {
      fixture.destroy();
    });
    it('Selected branch should be presistent when reload page', () => {
      fixture.visit('sync-code');
      addBranchAndExpectTheResult();
      fixture.visit('profile').wait(500);
      fixture.visit('sync-code');
      cy.get('nz-select').find('nz-select-item').should('contain.text', 'TRUNK');
    });
  });
});
