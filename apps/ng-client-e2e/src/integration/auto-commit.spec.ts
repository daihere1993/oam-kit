import { IpcChannel } from '@oam-kit/utility/types';
import { MainFixture } from '../fixtures/mainFixture';
import { getStringFromTemplate } from '@oam-kit/utility/utils';
import { LOG_TEMPLATES, LOG_TYPE } from '@oam-kit/logger';
import { LockInfo, ReviewBoard } from '@oam-kit/utility/types';

const link = 'http://biedronka.emea.nsn-net.net/r/92555/';
const fakeRb: ReviewBoard = {
  link,
  name: 'PR575809',
  branch: 'trunk',
  repo: { name: 'MOAM', repository: 'BTS_SC_MOAM_LTE' },
};

function expectAttachButtonIsOngoing() {
  return cy
    .get('@attachBtn')
    .invoke('text')
    .then((text) => {
      expect(text.trim()).to.eq('Attaching...');
    });
}

function expectActionCellIsOnGoing() {
  cy.get('.rb-table__cell--actions').children('a').first().should('have.attr', 'nzloading');
  return cy.get('.rb-table__cell--actions').children('a').eq(1).should('include.text', 'Cancel');
}

function attachButtonBackToNormal() {
  return cy
    .get('@attachBtn')
    .invoke('text')
    .then((text) => {
      expect(text.trim()).to.eq('Attach');
    });
}

function assertLatestLogContent(type: LOG_TYPE, info: { [key: string]: any } = {}) {
  const log = getStringFromTemplate(LOG_TEMPLATES[type], info);
  return cy.get('.logs-container').children('p').first().should('include.text', log);
}

function assertSecondLagContent(type: LOG_TYPE, info: { [key: string]: any } = {}) {
  const log = getStringFromTemplate(LOG_TEMPLATES[type], info);
  return cy.get('.logs-container').children('p').eq(1).should('include.text', log);
}

function inputRbLink(link: string) {
  cy.get('.rb-form__input').as('linkInput');
  cy.get('button[data-btn-type="attach"]').as('attachBtn');
  cy.get('@linkInput').type(link).wait(1000);
  return cy.get('@attachBtn').click();
}

function attachRb(link: string, fixture: MainFixture) {
  inputRbLink(link);
  expectAttachButtonIsOngoing();
  assertLatestLogContent(LOG_TYPE.RB_ATTACH__START, { link }).then(() => {
    fixture.simulateBackendResToClient(IpcChannel.GET_PARTIAL_RB_RES, fakeRb);
    assertLatestLogContent(LOG_TYPE.RB_ATTACH__OK);
    attachButtonBackToNormal();
  });
}

function clickCommitButton(link: string) {
  cy.get('a[data-btn-type="commit"]').first().as('commitBtn');
  // click commit button
  cy.get('@commitBtn')
    .click()
    .then(() => {
      assertLatestLogContent(LOG_TYPE.RB_IS_READY__START, { link });
    });
  // action cell should display a spin icon and have a "Cancel" button
  return expectActionCellIsOnGoing();
}

function simulateRbIsReady(fixture: MainFixture) {
  return cy.wait(100).then(() => {
    fixture.simulateBackendResToClient(IpcChannel.IS_RB_READY_RES, { ready: true });
    assertLatestLogContent(LOG_TYPE.BRANCH_CHECK__START);
    assertSecondLagContent(LOG_TYPE.RB_IS_READY__READY);
  });
}

function simulateBranchIsUnlocked(fixture: MainFixture) {
  cy.wait(100).then(() => {
    fixture.simulateBackendResToClient(IpcChannel.GET_LOCK_INFO_RES, {
      branch: { name: fakeRb.branch, locked: false },
      repo: { locked: false },
    });
    assertLatestLogContent(LOG_TYPE.SVN_COMMIT__START);
    assertSecondLagContent(LOG_TYPE.BRANCH_CHECK__UNLOCKED, { branch: fakeRb.branch });
  });
}

function actionCellShouldBackToNormal() {
  cy.get('.rb-table__cell--actions > a').should('have.length', 2);
  cy.get('.rb-table__cell--actions').children('a').first().should('not.have.attr', 'nzloading');
  cy.get('.rb-table__cell--actions').children('a').eq(1).should('not.include.text', 'Cancel');
}

describe('Scenario1: RB Attach', () => {
  const fixture = new MainFixture();
  describe('1. Input validation', () => {
    beforeEach(() => {
      fixture.visit('auto-commit');
    });
    it('Case1: button should be disabled if input is empty', () => {
      cy.get('button[data-btn-type="attach"]').as('attachBtn');
      cy.get('@attachBtn').should('be.disabled');
    });
    it('Case2: should have alert info if link is not a RB link', () => {
      const invalidRbLink = 'http://google.com';
      cy.get('button[data-btn-type="attach"]').as('attachBtn');
      cy.get('.rb-form__input').as('linkInput').type(invalidRbLink);
      cy.get('.link-input__alert').should(
        'include.text',
        'Please input right RB link like: http://biedronka.emea.nsn-net.net/r/92555/'
      );
    });
    it('Case3: should have alert info if RB has been attached', () => {
      attachRb(link, fixture);
      cy.get('@linkInput').clear();
      cy.get('@linkInput').type(link);
      cy.get('.link-input__alert').should('include.text', 'This RB has been attached.');
    });
  });

  describe('2. Attaching', () => {
    beforeEach(() => {
      fixture.visit('auto-commit');
    });
    it('Case1: should be failed if there was an exception', () => {
      const exceptionName = 'Attach';
      const exceptionMessage = 'some external exception';
      inputRbLink(link);
      expectAttachButtonIsOngoing();
      assertLatestLogContent(LOG_TYPE.RB_ATTACH__START, { link }).then(() => {
        fixture.simulateBackendResToClient(IpcChannel.GET_PARTIAL_RB_RES, {
          name: exceptionName,
          message: exceptionMessage,
        });
        assertLatestLogContent(LOG_TYPE.EXCEPTION, { message: exceptionMessage });
        attachButtonBackToNormal();
      });
    });
    it('Case2: should be successful if everything is ok', () => {
      attachRb(link, fixture);
    });
  });
});

describe('Scenario2: Commit code', () => {
  const fixture = new MainFixture();
  describe('1. Check if RB is ready', () => {
    beforeEach(() => {
      fixture.visit('auto-commit');
      attachRb(link, fixture);
    });
    it('Case1: should be failed if there was an exception then exit the process', () => {
      const exceptionName = 'Check if RB is ready';
      const exceptionMessage = 'some external exception';
      clickCommitButton(link).then(() => {
        fixture.simulateBackendResToClient(IpcChannel.IS_RB_READY_RES, { name: exceptionName, message: exceptionMessage });
        assertLatestLogContent(LOG_TYPE.EXCEPTION, { message: exceptionMessage });
        actionCellShouldBackToNormal();
      });
    });
    it('Case2: should be failed if RB is not ready then exit the process', () => {
      clickCommitButton(link).then(() => {
        fixture.simulateBackendResToClient(IpcChannel.IS_RB_READY_RES, { ready: false, message: 'specific reason' });
        assertLatestLogContent(LOG_TYPE.RB_IS_READY__NOT_READY, { message: 'specific reason' });
        actionCellShouldBackToNormal();
      });
    });
    it('Case3: should do the next process if RB is ready', () => {
      clickCommitButton(link);
      simulateRbIsReady(fixture);
      expectActionCellIsOnGoing();
    });
  });

  describe('2. Check if branch is unlock', () => {
    beforeEach(() => {
      fixture.visit('auto-commit');
      attachRb(link, fixture);
      clickCommitButton(link);
      simulateRbIsReady(fixture);
    });
    it('Case1: should be failed if there was an exception then exit the process', () => {
      const exceptionName = 'Check branch lock info';
      const exceptionMessage = 'some external reason';
      fixture.simulateBackendResToClient(IpcChannel.GET_LOCK_INFO_RES, { name: exceptionName, message: exceptionMessage });
      assertLatestLogContent(LOG_TYPE.EXCEPTION, { message: exceptionMessage });
      actionCellShouldBackToNormal();
    });
    it('Case2: should keep listening unlock info if branch is locked', () => {
      const lockInfo: Partial<LockInfo> = { branch: { name: fakeRb.branch, locked: true, reason: '' } };
      fixture.simulateBackendResToClient(IpcChannel.GET_LOCK_INFO_RES, lockInfo);
      assertLatestLogContent(LOG_TYPE.BRANCH_CHECK__LOCKED, { branch: lockInfo.branch.name, reason: lockInfo.branch.reason });
    });
    it('Case3: should commit code if branch is unlocked', () => {
      simulateBranchIsUnlocked(fixture);
      expectActionCellIsOnGoing();
    });
  });

  describe('3. SVN commit', () => {
    beforeEach(() => {
      fixture.visit('auto-commit');
      attachRb(link, fixture);
      clickCommitButton(link);
      simulateRbIsReady(fixture);
      simulateBranchIsUnlocked(fixture);
    });
    it('Case1: should be failed if there was an exception then exit the process', () => {
      const exceptionName = 'SVN commit';
      const exceptionMessage = 'some external reason';
      fixture.simulateBackendResToClient(IpcChannel.SVN_COMMIT_RES, { name: exceptionName, message: exceptionMessage });
      assertLatestLogContent(LOG_TYPE.EXCEPTION, { message: exceptionMessage });
      actionCellShouldBackToNormal();
    });
    it('Case2: should be failed if commit message is invalid then exit the process', () => {
      fixture.simulateBackendResToClient(IpcChannel.SVN_COMMIT_RES, { message: 'specific reason' });
      assertLatestLogContent(LOG_TYPE.SVN_COMMIT__COMMIT_MESSAGE_INVALID, { message: 'specific reason' });
      actionCellShouldBackToNormal();
    });
    it('Case3: should display the corresponding revision and committed date if code had committed', () => {
      const revision = '186950';
      fixture.simulateBackendResToClient(IpcChannel.SVN_COMMIT_RES, { revision });
      assertLatestLogContent(LOG_TYPE.SVN_COMMIT__COMMITTED, { repo: fakeRb.repo.name, revision });
      actionCellShouldBackToNormal();
      cy.get('.rb-table__cell--revision').should('include.text', revision);
      cy.get('.rb-table__cell--committed-date').should('not.be.empty');
    });
  });
});

describe('Scenario3: Cancel RB commit', () => {
  const fixture = new MainFixture();
  beforeEach(() => {
    fixture.visit('auto-commit');
    attachRb(link, fixture);
  });
  it('Case1: committment should be canceled correctly', () => {
    clickCommitButton(link);
    cy.get('a[data-btn-type="cancel"]').click();
    cy.get('@commitBtn').should('include.text', 'Commit');
    assertLatestLogContent(LOG_TYPE.COMMIT__CANCEL);
  });
});
