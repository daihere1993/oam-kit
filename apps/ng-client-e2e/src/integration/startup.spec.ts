import {
  CheckNecessaryCommandsResData,
  IpcChannel,
  NsbAccountVerificationResData,
  SvnAccountVerificationResData,
} from '@oam-kit/utility/types';
import { profileFixture } from '../fixtures/appData';
import { MainFixture } from '../fixtures/mainFixture';

describe('Navigation', () => {
  const fixture = new MainFixture();

  beforeEach(() => {
    fixture.visit('');
  });

  it('Should enter "env-check" page when there is no necessary commands', () => {
    fixture.simulator.replyOkWithData<CheckNecessaryCommandsResData>(IpcChannel.CHECK_NECESSARY_COMMANDS, {
      svnReady: false,
      gitReady: false,
    });
    cy.url().should('include', 'env-checking');
  });

  it('Should enter "login" page when env check finished', () => {
    fixture.simulator.replyOkWithData<CheckNecessaryCommandsResData>(IpcChannel.CHECK_NECESSARY_COMMANDS, {
      svnReady: true,
      gitReady: true,
    });
    cy.url().should('include', 'login');
  });

  it('Should enter "login" page when rechecking success and there auth is invalid', () => {
    fixture.simulator.replyOkWithData<CheckNecessaryCommandsResData>(IpcChannel.CHECK_NECESSARY_COMMANDS, {
      svnReady: false,
      gitReady: false,
    });
    cy.get('button').click();
    cy.wait(500).then(() => {
      fixture.simulator.replyOkWithData<CheckNecessaryCommandsResData>(IpcChannel.CHECK_NECESSARY_COMMANDS, {
        svnReady: true,
        gitReady: true,
      });
      cy.url().should('include', 'login');
    });
  });

  it('Should enter "Home" page when login success', () => {
    fixture.simulator.replyOkWithData<CheckNecessaryCommandsResData>(IpcChannel.CHECK_NECESSARY_COMMANDS, {
      svnReady: true,
      gitReady: true,
    });
    cy.getBySel('nsb-username-input').type(profileFixture.nsbAccount.username);
    cy.getBySel('nsb-password-input').type(profileFixture.nsbAccount.password);
    cy.getBySel('login-button')
      .click()
      .wait(500)
      .then(() => {
        return fixture.simulator.replyOkWithData<NsbAccountVerificationResData>(IpcChannel.NSB_ACCOUNT_VERIFICATION, {
          isRightAccount: true,
        });
      })
      .then(() => {
        return fixture.simulator.replyOkWithData<SvnAccountVerificationResData>(IpcChannel.SVN_ACCOUNT_VERIFICATION, {
          isRightAccount: true,
        });
      })
    cy.url().should('include', 'home');
  });
});

describe('Env checking', () => {
  const fixture = new MainFixture();

  beforeEach(() => {
    fixture.visit('');
  })

  it('Env rechecking failed', () => {
    fixture.simulator.replyOkWithData<CheckNecessaryCommandsResData>(IpcChannel.CHECK_NECESSARY_COMMANDS, {
      svnReady: false,
      gitReady: false,
    });
    cy.get('button').click();
    cy.wait(500).then(() => {
      fixture.simulator.replyOkWithData<CheckNecessaryCommandsResData>(IpcChannel.CHECK_NECESSARY_COMMANDS, {
        svnReady: false,
        gitReady: false,
      });
      cy.url().should('include', 'env-checking');
    });
  });
});
