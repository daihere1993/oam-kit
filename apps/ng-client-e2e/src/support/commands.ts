// @ts-check
///<reference path="../global.d.ts" />

import { NotificationStatus } from '../types';
import './custom-commands/sync-code.cmds';

Cypress.Commands.add('getBySel', (selector, ...args) => {
  return cy.get(`[data-test=${selector}]`, ...args);
});

Cypress.Commands.add("getBySelLike", (selector, ...args) => {
  return cy.get(`[data-test*=${selector}]`, ...args);
});

Cypress.Commands.add('expectNotification', (status: NotificationStatus, message: string) => {
  if (status === NotificationStatus.success) {
    cy.get('[ng-reflect-nz-type=check-circle]').should('exist');
    return cy.get('.ant-notification-notice-message').should('have.text', message);
  }
})
