/// <reference types="cypress" />

// Import Accessibility Plugin
import "../../src/accessibility-commands.js";


describe('ACCESSIBILITY TESTS - root', { tags: ['@accessibility'] }, () => {
    // NOTE: AXE analysis can spend quite some time, so it is recommended to increase the default command timeout for such tests

    it('Check accessibility Cypress.io web site', { defaultCommandTimeout: 15000 }, () => {
        cy.visit('https://example.cypress.io/')
        cy.wait(2000) // Using cy.wait(TIME) is a very bad practice, but it is used for simplicity in this example

        cy.checkAccessibility(null, { includedImpacts: ['critical'], onlyWarnImpacts: ['serious', 'moderate', 'minor'] })
    });

    it(`Test parasoft at root level`, { defaultCommandTimeout: 15000 }, () => {
        cy.visit('https://parabank.parasoft.com/parabank/index.htm')
        cy.wait(2000) // Using cy.wait(TIME) is a very bad practice, but it is used for simplicity in this example

        cy.checkAccessibility(null, { includedImpacts: ['critical', 'serious'], onlyWarnImpacts: ['moderate', 'minor'] })
    });

    it('Check accessibility google.com web site', { defaultCommandTimeout: 15000 }, () => {
        cy.visit('https://www.google.com')
        cy.wait(2000) // Using cy.wait(TIME) is a very bad practice, but it is used for simplicity in this example

        cy.checkAccessibility()
    });
    
    it(`Another Parasoft test at root level`, { defaultCommandTimeout: 15000 }, () => {
        cy.visit('https://parabank.parasoft.com/parabank/index.htm')
        cy.wait(2000) // Using cy.wait(TIME) is a very bad practice, but it is used for simplicity in this example

        cy.checkAccessibility(null, { includedImpacts: ['critical'], onlyWarnImpacts: ['serious', 'moderate', 'minor'] })
    });

    it(`And one more Parasoft test at root level`, { defaultCommandTimeout: 15000 }, () => {
        cy.visit('https://parabank.parasoft.com/parabank/index.htm')
        cy.wait(2000) // Using cy.wait(TIME) is a very bad practice, but it is used for simplicity in this example

        cy.checkAccessibility(null, { includedImpacts: [], onlyWarnImpacts: ['critical', 'serious', 'moderate', 'minor'] })
    });

    it('Simple passing test', () => {
        expect(true).to.be.true
    });

    context('Context 1', () => {
        it(`One more Test Parasoft at level 1`, { defaultCommandTimeout: 15000 }, () => {
            cy.visit('https://parabank.parasoft.com/parabank/index.htm')
            cy.wait(2000) // Using cy.wait(TIME) is a very bad practice, but it is used for simplicity in this example

            cy.checkAccessibility(null, { includedImpacts: [], onlyWarnImpacts: ['critical', 'serious', 'moderate', 'minor'] })
        });

        context('Context 2', () => {
            it(`And now Parasoft at level 2`, { defaultCommandTimeout: 15000 }, () => {
                cy.visit('https://parabank.parasoft.com/parabank/index.htm')
                cy.wait(2000) // Using cy.wait(TIME) is a very bad practice, but it is used for simplicity in this example

                cy.checkAccessibility(null, { includedImpacts: ['critical', 'serious'], onlyWarnImpacts: ['moderate', 'minor'] })
            });
        });
    })
});

