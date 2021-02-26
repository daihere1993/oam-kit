/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-namespace */
// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************
declare namespace Cypress {
  interface Chainable<Subject> {
    setStepStatus(stepAlias: string, status: string): void;
  }
}

Cypress.Commands.add('setStepStatus', (stepAlias: string, status: string) => {
  cy.get(stepAlias).invoke('attr', 'ng-reflect-nz-status').should('contain', status);
});
