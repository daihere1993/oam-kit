import { IpcChannel } from '@oam-kit/utility/types';
import { profileFixture } from '../fixtures/appData';
import { MainFixture } from '../fixtures/mainFixture';
import { NotificationStatus } from '../types';

const fixture = new MainFixture();
describe('Scenario1: update account info', () => {
  beforeEach(() => {
    fixture.visit('profile');
  });
  it('Case1: same svn password like nsb password', () => {
    cy.getBySel('nsb-username-input').type(profileFixture.nsbAccount.username);
    cy.getBySel('nsb-password-input').type(profileFixture.nsbAccount.password);
    cy.getBySel('save-button').click();
    cy.getBySel('save-button').should('contain.html', 'Auth validating...').wait(500).then(() => {
      fixture.simulateBackendResToClient(IpcChannel.NSB_ACCOUNT_VERIFICATION_RES, true);
      fixture.simulateBackendResToClient(IpcChannel.SVN_ACCOUNT_VERIFICATION_RES, true);
    });
    cy.expectNotification(NotificationStatus.success, 'Success');
  });

  it('Case2: separate password', () => {
    cy.getBySel('nsb-username-input').type(profileFixture.nsbAccount.username);
    cy.getBySel('nsb-password-input').type(profileFixture.nsbAccount.password);
    cy.getBySel('same-password-checkbox').click();
    cy.getBySel('svn-password-input').type(profileFixture.svnAccount.password);
    cy.getBySel('save-button').click();
    cy.getBySel('save-button').should('contain.html', 'Auth validating...').wait(500).then(() => {
      fixture.simulateBackendResToClient(IpcChannel.NSB_ACCOUNT_VERIFICATION_RES, true);
      fixture.simulateBackendResToClient(IpcChannel.SVN_ACCOUNT_VERIFICATION_RES, true);
    });
    cy.expectNotification(NotificationStatus.success, 'Success');
  });
});

describe('Scenario2: failed', () => {
  beforeEach(() => {
    fixture.visit('profile');
  });
  it('Case1: nsb account verification failed', () => {
    cy.getBySel('nsb-username-input').type(profileFixture.nsbAccount.username);
    cy.getBySel('nsb-password-input').type(profileFixture.nsbAccount.password);
    cy.getBySel('same-password-checkbox').click();
    cy.getBySel('svn-password-input').type(profileFixture.svnAccount.password);
    cy.getBySel('save-button').click();
    cy.getBySel('save-button').should('contain.html', 'Auth validating...').wait(500).then(() => {
      fixture.simulateBackendResToClient(IpcChannel.NSB_ACCOUNT_VERIFICATION_RES, false);
      fixture.simulateBackendResToClient(IpcChannel.SVN_ACCOUNT_VERIFICATION_RES, false);
    });
    cy.getBySel('save-button').should('contain.html', 'Save').should('be.enabled');
    cy.expectNotification(NotificationStatus.failed, 'Incorrect NSB accout and password.');
  });
  it('Case2: svn account verification failed', () => {
    cy.getBySel('nsb-username-input').type(profileFixture.nsbAccount.username);
    cy.getBySel('nsb-password-input').type(profileFixture.nsbAccount.password);
    cy.getBySel('same-password-checkbox').click();
    cy.getBySel('svn-password-input').type(profileFixture.svnAccount.password);
    cy.getBySel('save-button').click();
    cy.getBySel('save-button').should('contain.html', 'Auth validating...').wait(500).then(() => {
      fixture.simulateBackendResToClient(IpcChannel.NSB_ACCOUNT_VERIFICATION_RES, true);
      fixture.simulateBackendResToClient(IpcChannel.SVN_ACCOUNT_VERIFICATION_RES, false);
    });
    cy.getBySel('save-button').should('contain.html', 'Save').should('be.enabled');
    cy.expectNotification(NotificationStatus.failed, 'Incorrect SVN accout and password.');
  });
});
