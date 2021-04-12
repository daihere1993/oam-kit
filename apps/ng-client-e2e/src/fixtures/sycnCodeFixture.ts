import { IpcChannel, Project } from '@oam-kit/utility/types';
import { MainFixture } from './mainFixture';

export function addProjectAndExpectTheResult(fixture: MainFixture) {
  const project: Partial<Project> = {
    name: 'TRUNK',
    localPath: '/moam/trunk',
    remotePath: '/var/fpwork/zowu/moam/trunk',
  };
  cy.get('nz-select').as('select').click();
  cy.get('a[data-btn-type="addBranch"]').click().wait(500);
  cy.get('input[name="name"]').type(project.name);
  cy.get('nz-select[formcontrolname="serverAddr"]').click();
  cy.get('nz-option-item')
    .children()
    .first()
    .click()
    .then(() => {
      fixture.simulateBackendResToClient(IpcChannel.SERVER_CHECK_RES, true);
    });
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
