// @ts-check
///<reference path="../../global.d.ts" />

import { IpcChannel, Project } from '@oam-kit/utility/types';
import { MainFixture } from '../../fixtures/mainFixture';

Cypress.Commands.add('fillAllProjectInfo', (fixture: MainFixture, project: Project) => {
  cy.getBySel('project-name-input').type(project.name);
  cy.getBySel('server-addr-select').click();

  cy.getBySel('server-addr-select').click();
  cy.get('nz-option-item')
    .first()
    .click()
    .then(() => {
      fixture.simulator.replyOkWithNoData(IpcChannel.SERVER_CHECK);
    });

  cy.getBySel('local-project-path-input').type(project.localPath);
  return cy.getBySel('remote-project-path-input')
    .type(project.remotePath)
    .then(() => {
      fixture.simulator.replyOkWithNoData(IpcChannel.SERVER_DIRECTORY_CHECK);
    });
});

Cypress.Commands.add('assertStepStatus', (stepAlias: string, status: string) => {
  cy.get(stepAlias).invoke('attr', 'ng-reflect-nz-status').should('contain', status);
});
