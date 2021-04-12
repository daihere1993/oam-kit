import { Project } from '@oam-kit/utility/types';

export function addProjectAndExpectTheResult(
  project: Project = {
    name: 'TRUNK',
    serverAddr: '192.196.8.20',
    localPath: '/moam/trunk',
    remotePath: '/var/fpwork/zowu/moam/trunk',
  }
) {
  cy.get('nz-select').as('select').click();
  cy.get('a[data-btn-type="addBranch"]').click().wait(500);
  cy.get('input[name="name"]').type(project.name);
  cy.get('input[name="serverAddr"]').type(project.serverAddr);
  cy.get('input[name="localPath"]').type(project.localPath);
  cy.get('input[name="remotePath"]').type(project.remotePath);
  // Must wait some time when click save button to make sure corresponding code got execute then to update data.
  return cy
    .get('button')
    .contains('Save')
    .click()
    .wait(500)
    .then(() => {
      cy.get('@select').find('nz-select-item').should('contain.text', 'TRUNK');
    });
}
