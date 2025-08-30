/// <reference types="cypress" />

// Import Accessibility Plugin
import "../../../../../src/accessibility-commands.js";


describe('TEST SUITE 1', { tags: ['@accessibility'] }, () => {
    
    it('Check accessibility Parabank web site - 6', { defaultCommandTimeout: 15000 }, () => {
        cy.visit('https://parabank.parasoft.com/parabank/index.htm')
        cy.wait(2000) // Using cy.wait(TIME) is a very bad practice, but it is used for simplicity in this example

        cy.checkAccessibility(null, { includedImpacts: ['critical', 'serious', 'moderate', 'minor'] })
    });

    context('Context 1', () => {
        it('Check accessibility Practice Software Testing web site - 10', { defaultCommandTimeout: 15000 }, () => {
            cy.visit('https://practicesoftwaretesting.com/#/')
            cy.wait(2000) // Using cy.wait(TIME) is a very bad practice, but it is used for simplicity in this example

            cy.checkAccessibility()
        });
    })

    context('Context 2', () => {
        it('Check accessibility Cypress.io web site - 12', { defaultCommandTimeout: 15000 }, () => {
            cy.visit('https://example.cypress.io/')
            cy.wait(2000) // Using cy.wait(TIME) is a very bad practice, but it is used for simplicity in this example

            cy.checkAccessibility(null, { includedImpacts: ['critical', 'serious', 'moderate', 'minor'] })
        });

        it.skip('Simple passing test - 13', () => {
            expect(true).to.be.true
        });
    })

    it('Check accessibility google.com web site - 7', { defaultCommandTimeout: 15000 }, () => {
        cy.visit('https://www.google.com')
        cy.wait(2000) // Using cy.wait(TIME) is a very bad practice, but it is used for simplicity in this example

        cy.checkAccessibility()
    });

    it('Another simple passing test - 8', () => {
        expect(true).to.be.true
    });

})


describe('TEST SUITE 2', { tags: ['@accessibility'] }, () => {

    it('Another simple passing test - 14', () => {
        expect(true).to.be.true
    });

    it('Another simple failing test - 15', () => {
        expect(true).to.be.false
    });

    it.skip('Another simple skipping test - 16', () => {
        expect(true).to.be.true
    });

    it('Check accessibility BrowserStack Demo web site - 17', { defaultCommandTimeout: 15000 }, () => {
        cy.visit('https://bstackdemo.com/')
        cy.wait(2000) // Using cy.wait(TIME) is a very bad practice, but it is used for simplicity in this example

        cy.checkAccessibility(null, { includedImpacts: ['critical', 'serious', 'moderate', 'minor'] })
    });
})


it('Another simple passing test - 2', () => {
    expect(true).to.be.true
});

it.skip('Another simple skipping test - 3', () => {
    expect(true).to.be.true
});

it.only('Check accessibility BrowserStack Demo web site - 4', { defaultCommandTimeout: 15000 }, () => {
    cy.visit('https://bstackdemo.com/')
    cy.wait(2000) // Using cy.wait(TIME) is a very bad practice, but it is used for simplicity in this example

    cy.checkAccessibility(null, { includedImpacts: ['critical', 'serious'], onlyWarnImpacts: ['moderate', 'minor'] })
});

it.skip('Another simple failing test - 5 (Ok in second attempt)', () => {
    if (Cypress.currentRetry === 1) {
        expect(true).to.be.true
    } else {
        expect(true).to.be.false
    }
});
