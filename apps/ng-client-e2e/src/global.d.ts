/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-namespace */

/// <reference types="cypress" />

declare namespace Cypress {
  import { Project } from '@oam-kit/utility/types';
  import { MainFixture } from './fixtures/mainFixture';
  import { NotificationStatus } from '../src/types';

  interface Chainable {
    /**
     * Almost all DOM would be selected by "data-test" attribute.
     * @param dataTestAttribute The attribute of "data-test"
     * @param args
     */
    getBySel(dataTestAttribute: string, args?: any): Chainable<Element>;
    getBySelLike(dataTestPrefixAttribute: string, args?: any): Chainable<Element>;

    /**
     * Fill each project field input by source project.
     * @param fixture
     * @param project
     */
    fillAllProjectInfo(fixture: MainFixture, project: Project): Chainable<any>;

    /**
     * Expect there was a nz-notification alert.
     * @param status 
     * @param message 
     */
    expectNotification(status: NotificationStatus, message: string): Chainable<any>;

    assertStepStatus(stepAlias: string, status: string): void;
  }
}
