import { MainFixture } from '../fixtures/mainFixture';

describe('Noral case:', () => {
  const fixture = new MainFixture();
  /**
   * 1. Update profile successfully
   */
  it('Update profile', () => {
    fixture.visit('profile');
    const data = {
      remote: '192.168.1.1',
      username: 'zowu',
      password: '123456'
    };
    cy.get('input[name="remote"]').as('remote').type(data.remote);
    cy.get('input[name="username"]').as('username').type(data.username);
    cy.get('input[name="password"]').as('password').type(data.password);
    cy.get('button[data-btn-type="save"]').click();
    cy.get('[ng-reflect-nz-type=check-circle]').should('exist');
    cy.get('.ant-notification-notice-message').should('have.text', 'Success');
  });
});
