import { Profile } from "@oam-kit/store/types";

export function fullProfileInfoAndExpected() {
  const profile: Profile = { remote: 'test remote', username: 'test username', password: 'test password' };
  cy.get('input[name="remote"]').as('remote').type(profile.remote);
  cy.get('input[name="username"]').as('username').type(profile.username);
  cy.get('input[name="password"]').as('password').type(profile.password);
  cy.get('button[data-btn-type="save"]').click();
  cy.get('[ng-reflect-nz-type=check-circle]').should('exist');
  cy.get('.ant-notification-notice-message').should('have.text', 'Success');
}
