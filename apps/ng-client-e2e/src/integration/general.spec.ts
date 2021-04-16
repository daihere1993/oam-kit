import { MainFixture } from "../fixtures/mainFixture";
import { profileFixture, projectFixture } from '../fixtures/appData';

describe('Page cache: should not reload page that has been visited', () => {
  it('Sycn code page should be cached', () => {
    const initData: any = { general: { profile: profileFixture }, syncCode: { projects: [projectFixture] } };
    const fixture = new MainFixture({ initData });
    fixture.visit('sync-code');
    cy.getBySel('sync-code-button').click();
    cy.get('nz-step').eq(0).as('first');
    cy.assertStepStatus('@first', 'process');
    fixture.navigate('Profile');
    fixture.navigate('Sync Code');
    cy.assertStepStatus('@first', 'process');
  });

  it('Profile page should not be cached', () => {
    const mainFixture = new MainFixture();
    mainFixture.visit('profile');
    cy.getBySel('username-input').type('username');
    mainFixture.navigate('Sync Code');
    mainFixture.navigate('Profile');
    cy.getBySel('username-input').should('be.empty');
  });
});

