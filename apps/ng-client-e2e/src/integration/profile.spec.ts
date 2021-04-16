import { profileFixture } from '../fixtures/appData';
import { MainFixture } from '../fixtures/mainFixture';
import { NotificationStatus } from '../types';

describe('Noral case:', () => {
  const fixture = new MainFixture();
  it('Update profile', () => {
    fixture.visit('profile');
    cy.getBySel('username-input').type(profileFixture.nsbAccount.username);
    cy.getBySel('password-input').type(profileFixture.nsbAccount.password);
    cy.getBySel('save-button').click();
    cy.expectNotification(NotificationStatus.success, 'Success');
  });
});
