/// <reference types="cypress" />

// Import Accessibility Plugin
import "../../src/accessibility-commands.js";


describe.skip('ACCESSIBILITY TESTS', { tags: ['@accessibility'] }, () => {
    // NOTE: AXE analysis can spend quite some time, so it is recommended to increase the default command timeout for such tests

    it('Test google.com', {defaultCommandTimeout: 15000}, () => {
        cy.visit('https://www.google.com')
        cy.wait(2000) // Using cy.wait(TIME) is a very bad practice, but it is used for simplicity in this example

        cy.checkAccessibility()
    });
});
