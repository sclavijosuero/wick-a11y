/// <reference types="cypress" />

// Import Accessibility Plugin
import "../../../src/accessibility-commands.js";


describe('OTHER ACCESSIBILITY TESTS', { tags: ['@accessibility'] }, () => {
    // NOTE: AXE analysis can spend quite some time, so it is recommended to increase the default command timeout for such tests

    it('Test https://parabank.parasoft.com/parabank/index.htm Accessibility', {defaultCommandTimeout: 15000}, () => {
        cy.visit('https://parabank.parasoft.com/parabank/index.htm')
        cy.wait(2000) // Using cy.wait(TIME) is a very bad practice, but it is used for simplicity in this example

        cy.checkAccessibility(null, { includedImpacts: ['critical', 'serious', 'moderate', 'minor'] })
        // cy.checkAccessibility()
    });

    it.only('Test practicesoftwaretesting.com Accessibility', {defaultCommandTimeout: 15000}, () => {
        cy.visit('https://practicesoftwaretesting.com/#/')
        cy.wait(2000) // Using cy.wait(TIME) is a very bad practice, but it is used for simplicity in this example

        cy.checkAccessibility(null, { generateReport: 'detailed', includedImpacts: ['critical', 'serious', 'moderate', 'minor'] })
    });
    
    it('Test https://example.cypress.io/ Accessibility', {defaultCommandTimeout: 15000}, () => {
        cy.visit('https://example.cypress.io/')
        cy.wait(2000) // Using cy.wait(TIME) is a very bad practice, but it is used for simplicity in this example

        cy.checkAccessibility(null, { includedImpacts: ['critical', 'serious', 'moderate', 'minor'] })
    });

    it('Test https://qa-practice.netlify.app/ Accessibility', {defaultCommandTimeout: 15000}, () => {
        cy.visit('https://qa-practice.netlify.app/')
        cy.wait(2000) // Using cy.wait(TIME) is a very bad practice, but it is used for simplicity in this example

        cy.checkAccessibility(null, { includedImpacts: ['critical', 'serious', 'moderate', 'minor'] })
    });

    it('Test https://demo.applitools.com/ Accessibility', {defaultCommandTimeout: 15000}, () => {
        cy.visit('https://demo.applitools.com/')
        cy.wait(2000) // Using cy.wait(TIME) is a very bad practice, but it is used for simplicity in this example

        cy.checkAccessibility(null, { includedImpacts: ['critical', 'serious', 'moderate', 'minor'] })
    });

    it('Test https://bstackdemo.com/ Accessibility', {defaultCommandTimeout: 15000}, () => {
        cy.visit('https://bstackdemo.com/')
        cy.wait(2000) // Using cy.wait(TIME) is a very bad practice, but it is used for simplicity in this example

        cy.checkAccessibility(null, { includedImpacts: ['critical', 'serious', 'moderate', 'minor'] })
    });

    it.skip('Test http://ecommerce.test.k6.io/ Accessibility', {defaultCommandTimeout: 15000}, () => {
        cy.visit('http://ecommerce.test.k6.io/')
        cy.wait(2000) // Using cy.wait(TIME) is a very bad practice, but it is used for simplicity in this example

        cy.checkAccessibility(null, { includedImpacts: ['critical', 'serious', 'moderate', 'minor'] })
    });
});
