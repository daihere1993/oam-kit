// import { IpcChannel } from '@oam-kit/ipc';
// import { MainFixture } from '../fixtures/mainFixture';
// import { getStringFromTemplate } from '@oam-kit/utility/utils';
// import { LOG_TEMPLATES, LOG_TYPE } from '@oam-kit/logger';
// import { ReviewBoard } from '@oam-kit/store';

// const link = 'http://biedronka.emea.nsn-net.net/r/92555/';
// const fakeRb: ReviewBoard = {
//   link,
//   name: 'PR575809',
//   branch: 'trunk',
//   repo: { name: 'MOAM', repository: 'BTS_SC_MOAM_LTE' },
// };

// function attachButtonTurnToOngoing() {
//   return cy
//     .get('@attachBtn')
//     .invoke('text')
//     .then((text) => {
//       expect(text.trim()).to.eq('Attaching...');
//     });
// }

// function attachButtonBackToNormal() {
//   return cy
//     .get('@attachBtn')
//     .invoke('text')
//     .then((text) => {
//       expect(text.trim()).to.eq('Attach');
//     });
// }

// /**
//  *
//  * @param type
//  * @param info
//  * @param index the index of log element, 0 means latest log
//  * @returns
//  */
// function assertSpecificLogContent(type: LOG_TYPE, index = 0, info: { [key: string]: any } = {}) {
//   const log = getStringFromTemplate(LOG_TEMPLATES[type], info);
//   return cy.get('.logs-container').children('p').eq(index).should('include.text', log);
// }

// function inputRbLink(link: string) {
//   cy.get('.rb-form__input').as('linkInput');
//   cy.get('button[data-btn-type="attach"]').as('attachBtn');
//   cy.get('@linkInput').type(link);
//   return cy.get('@attachBtn').click();
// }

// function attachRb(link: string, fixture: MainFixture) {
//   inputRbLink(link).then(() => {
//     attachButtonTurnToOngoing();
//     assertSpecificLogContent(LOG_TYPE.RB_ATTACH__START, 0, { link });
//     fixture.simulateBackendResToClient(IpcChannel.GET_PARTIAL_RB_RES, fakeRb);
//     cy.wait(100).then(() => {
//       assertSpecificLogContent(LOG_TYPE.RB_ATTACH__OK);
//       attachButtonBackToNormal();
//     });
//   });
// }

// function clickCommitButton(link: string) {
//   cy.get('a[data-btn-type="commit"]').first().as('commitBtn');
//   // click commit button
//   cy.get('@commitBtn')
//     .click()
//     .then(() => {
//       assertSpecificLogContent(LOG_TYPE.RB_IS_READY__START, 0, { link });
//     });
//   // action cell should display a spin icon and have a "Cancel" button
//   cy.get('.rb-table__cell').children('a').first().should('have.attr', 'nzloading');
//   cy.get('.rb-table__cell').children('a').eq(1).should('include.text', 'Cancel');
// }

// function simulateRbIsReady(fixture: MainFixture) {
//   fixture.simulateBackendResToClient(IpcChannel.IS_RB_READY_RES, { isSuccessed: true });
//   return cy.wait(100).then(() => {
//     assertSpecificLogContent(LOG_TYPE.RB_IS_READY__READY, 1);
//     assertSpecificLogContent(LOG_TYPE.BRANCH_CHECK__START);
//   });
// }

// function simulateBranchIsUnlocked(fixture: MainFixture) {
//   fixture.simulateBackendResToClient(IpcChannel.GET_LOCK_INFO_RES, {
//     branch: { name: fakeRb.branch, locked: false },
//     repo: { locked: false },
//   });
//   cy.wait(100).then(() => {
//     assertSpecificLogContent(LOG_TYPE.SVN_COMMIT__START);
//     assertSpecificLogContent(LOG_TYPE.BRANCH_CHECK__UNLOCKED, 1, { branch: fakeRb.branch });
//   });
// }

// function actionCellShouldBackToNormal() {
//   cy.get('.rb-table__cell > a').should('have.length', 3);
//   cy.get('.rb-table__cell').children('a').first().should('not.have.attr', 'nzloading');
//   cy.get('.rb-table__cell').children('a').eq(1).should('not.include.text', 'Cancel');
// }

// describe('Scenario1: Attach a RB', () => {
//   const fixture = new MainFixture();
//   beforeEach(() => {
//     fixture.visit('auto-commit');
//   });

//   it('Case1: should be failed if there was an exception', () => {
//     const exceptionName = 'Attach';
//     const exceptionMessage = 'some external exception';
//     inputRbLink(link).then(() => {
//       attachButtonTurnToOngoing();
//       assertSpecificLogContent(LOG_TYPE.RB_ATTACH__START, 0, { link });
//       fixture.simulateBackendResToClient(IpcChannel.GET_PARTIAL_RB_RES, {
//         name: exceptionName,
//         message: exceptionMessage,
//       });
//       cy.wait(100).then(() => {
//         assertSpecificLogContent(LOG_TYPE.EXCEPTION, 0, { name: exceptionName, message: exceptionMessage });
//         attachButtonBackToNormal();
//       });
//     });
//   });
//   it('Case2: should be failed if link is not a RB link', () => {
//     const invalidRbLink = 'http://google.com';
//     inputRbLink(invalidRbLink).then(() => {
//       assertSpecificLogContent(LOG_TYPE.RB_ATTACH__INVALID_LINK);
//       attachButtonBackToNormal();
//     });
//   });
//   it('Case3: should be failed if the link has been attached', () => {
//     attachRb(link, fixture);
//     cy.get('@linkInput').clear();
//     inputRbLink(link).then(() => {
//       assertSpecificLogContent(LOG_TYPE.RB_ATTACH__DULICATE);
//       attachButtonBackToNormal();
//     });
//   });
//   it('Case4: should be successful if everything is ok', () => {
//     attachRb(link, fixture);
//   });
// });

// describe('Scenario2: Commit code', () => {
//   const fixture = new MainFixture();
//   describe('Check if RB is ready', () => {
//     beforeEach(() => {
//       fixture.visit('auto-commit');
//       attachRb(link, fixture);
//     });
//     it('Case1: should be failed if RB is not ready or there was an exception', () => {
//       clickCommitButton(link);
//       const exceptionName = 'Check if RB is ready';
//       const exceptionMessage = 'some external exception';
//       fixture.simulateBackendResToClient(IpcChannel.IS_RB_READY_RES, { name: exceptionName, message: exceptionMessage });
//       cy.wait(100).then(() => {
//         assertSpecificLogContent(LOG_TYPE.RB_IS_READY__NOT_READY, 0, { message: exceptionMessage });
//         actionCellShouldBackToNormal();
//       });
//     });
//     it('Case2: should do the next process if RB is ready', () => {
//       clickCommitButton(link);
//       simulateRbIsReady(fixture);
//     });
//   });

//   describe('Check if branch is unlock', () => {
//     beforeEach(() => {
//       fixture.visit('auto-commit');
//       attachRb(link, fixture);
//       clickCommitButton(link);
//       simulateRbIsReady(fixture);
//     });
//     it('Case1: should be failed if there was an exception', () => {
//       const exceptionName = 'Check branch lock info';
//       const exceptionMessage = 'some external reason';
//       fixture.simulateBackendResToClient(IpcChannel.GET_LOCK_INFO_RES, { name: exceptionName, message: exceptionMessage });
//       cy.wait(100).then(() => {
//         assertSpecificLogContent(LOG_TYPE.EXCEPTION, 0, { name: exceptionName, message: exceptionMessage });
//         actionCellShouldBackToNormal();
//       });
//     });
//     it('Case2: should keep listening unlock info if branch is locked', () => {});
//     it('Case3: should commit code if branch is unlocked', () => {
//       simulateBranchIsUnlocked(fixture);
//     });
//   });

//   describe('SVN commit', () => {
//     beforeEach(() => {
//       fixture.visit('auto-commit');
//       attachRb(link, fixture);
//       clickCommitButton(link);
//       simulateRbIsReady(fixture);
//       simulateBranchIsUnlocked(fixture);
//     });
//     it('Case1: should be failed if there was an exception', () => {
//       const exceptionName = 'SVN commit';
//       const exceptionMessage = 'some external reason';
//       fixture.simulateBackendResToClient(IpcChannel.SVN_COMMIT_RES, { name: exceptionName, message: exceptionMessage });
//       cy.wait(100).then(() => {
//         assertSpecificLogContent(LOG_TYPE.EXCEPTION, 0, { name: exceptionName, message: exceptionMessage });
//         actionCellShouldBackToNormal();
//       });
//     });
//     it('Case2: should display the corresponding revision and committed date if code had committed', () => {
//       const revision = '186950';
//       fixture.simulateBackendResToClient(IpcChannel.SVN_COMMIT_RES, revision);
//       cy.wait(100).then(() => {
//         assertSpecificLogContent(LOG_TYPE.SVN_COMMIT__COMMITTED, 0, { repo: fakeRb.repo.name, revision });
//         actionCellShouldBackToNormal();
//       });
//     });
//   });
// });

// describe('Scenario3: Cancel RB commit', () => {
//   it('Case1: committment should be canceled correctly', () => {});
// });
