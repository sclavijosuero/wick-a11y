/// <reference types="cypress" />

// Import Accessibility Plugin
import "../../../../src/accessibility-commands.js";

it('Check accessibility google.com web site', { defaultCommandTimeout: 15000 }, () => {
    cy.visit('https://www.google.com')
    cy.wait(2000) // Using cy.wait(TIME) is a very bad practice, but it is used for simplicity in this example

    cy.checkAccessibility()
});

it('Example of passing test in the second attempt', () => {
    if (Cypress.currentRetry === 1) {
        expect(true).to.be.true
    } else {
        expect(true).to.be.false
    }
});

it('Example of failing test', () => {
    expect(true).to.be.false
});

it.skip('Example of skipped test', () => {
    expect(true).to.be.true
});

it('Check accessibility Parabank web site', { defaultCommandTimeout: 15000 }, () => {
    cy.visit('https://parabank.parasoft.com/parabank/index.htm')
    cy.wait(2000) // Using cy.wait(TIME) is a very bad practice, but it is used for simplicity in this example

    cy.checkAccessibility(null, { includedImpacts: ['critical', 'serious', 'moderate', 'minor'] })
});

// it.skip('Check accessibility cypress.io web site', {defaultCommandTimeout: 15000}, () => {
//     cy.visit('https://example.cypress.io/')
//     cy.wait(2000) // Using cy.wait(TIME) is a very bad practice, but it is used for simplicity in this example

//     cy.checkAccessibility(null, { includedImpacts: ['critical', 'serious', 'moderate', 'minor'] })
// });

// it('Check accessibility BrowserStack Demo web site', { defaultCommandTimeout: 15000 }, () => {
//     cy.visit('https://bstackdemo.com/')
//     cy.wait(2000) // Using cy.wait(TIME) is a very bad practice, but it is used for simplicity in this example

//     cy.checkAccessibility(null, { includedImpacts: ['critical', 'serious', 'moderate', 'minor'] })
// });
