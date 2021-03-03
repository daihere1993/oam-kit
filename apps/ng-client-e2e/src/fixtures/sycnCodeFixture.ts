import { Branch } from "@oam-kit/store/types";

export function addBranchAndExpectTheResult(
  branch: Branch = {
    name: 'TRUNK',
    directory: {
      target: '/var/fpwork/zowu/moam/trunk',
      source: '/moam/trunk',
    },
  }
) {
  cy.get('nz-select').as('select').click();
  cy.get('a[data-btn-type="addBranch"]').click().wait(500);
  cy.get('input[name="branchName"]').type(branch.name);
  cy.get('input[name="target"]').type(branch.directory.target);
  cy.get('input[name="source"]').type(branch.directory.source);
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
