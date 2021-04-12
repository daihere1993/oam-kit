import { Profile } from "@oam-kit/utility/types";
import { MainFixture } from "../fixtures/mainFixture";
import { fullProfileInfoAndExpected } from "../fixtures/profileFixture";
import { addProjectAndExpectTheResult } from "../fixtures/sycnCodeFixture";

describe('Page cache: should not reload page that has been visited', () => {
  it('Sycn code page should be cached', () => {
    const mainFixture = new MainFixture();
    mainFixture.visit('profile');
    fullProfileInfoAndExpected();
    mainFixture.navigate('Sync Code');
    addProjectAndExpectTheResult();
    cy.get('[data-btn-type=sync]').click();
    cy.get('nz-step').eq(0).as('first');
    cy.assertStepStatus('@first', 'process');
    mainFixture.navigate('Profile');
    mainFixture.navigate('Sync Code');
    cy.assertStepStatus('@first', 'process');
  });

  it('Profile page should not be cached', () => {
    const mainFixture = new MainFixture();
    const profile: Profile = { remote: 'test1', username: 'test2', password: 'test3' };
    mainFixture.visit('profile');
    cy.get('input[name="remote"]').as('remote').type(profile.remote);
    cy.get('input[name="username"]').as('username').type(profile.username);
    cy.get('input[name="password"]').as('password').type(profile.password);
    mainFixture.navigate('Sync Code');
    mainFixture.navigate('Profile');
    cy.get('@remote').should('be.empty');
    cy.get('@username').should('be.empty');
    cy.get('@password').should('be.empty');
  });
});

