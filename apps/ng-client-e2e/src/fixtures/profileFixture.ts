import { Profile } from '@oam-kit/utility/types';

export function fullProfileInfoAndExpected() {
  const profile: Profile = {
    nsbAccount: { username: 'test username', password: 'test password' },
    svnAccount: { password: null },
  };
  cy.get('input[name="username"]').as('username').type(profile.nsbAccount.username);
  cy.get('input[name="password"]').as('password').type(profile.nsbAccount.password);
  cy.get('button[data-btn-type="save"]').click();
  cy.get('[ng-reflect-nz-type=check-circle]').should('exist');
  cy.get('.ant-notification-notice-message').should('have.text', 'Success');
}
