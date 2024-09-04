/// <reference types="cypress" />

// Import Accessibility Plugin
import "../../src/accessibility-commands.js";


// #1
describe('TEST SUITE 1', { tags: ['@accessibility'] }, () => {

    // FAILING TESTS
    // -------------

    // #6
    it('Check accessibility Parabank web site - 6', { defaultCommandTimeout: 15000 }, () => {
        cy.visit('https://parabank.parasoft.com/parabank/index.htm')
        cy.wait(2000) // Using cy.wait(TIME) is a very bad practice, but it is used for simplicity in this example

        cy.checkAccessibility(null, { includedImpacts: ['critical', 'serious', 'moderate', 'minor'] })
    });

    context('Context 1', () => {
        // #9
        it('Check accessibility Practice Software Testing web site - 9', { defaultCommandTimeout: 15000 }, () => {
            cy.visit('https://practicesoftwaretesting.com/#/')
            cy.wait(2000) // Using cy.wait(TIME) is a very bad practice, but it is used for simplicity in this example

            cy.checkAccessibility()
        });

        // #10
        it('Simple failing test - 10', () => {
            cy.wrap(false).as('falseValue')
            cy.get('@falseValue').should('be.true')
            // expect(true).to.be.false
        });
    })

    // SKIPPED TESTS
    // -------------
    context('Context 2', () => {
        // #11
        it.skip('Check accessibility Cypress.io web site - 11', { defaultCommandTimeout: 15000 }, () => {
            cy.visit('https://example.cypress.io/')
            cy.wait(2000) // Using cy.wait(TIME) is a very bad practice, but it is used for simplicity in this example

            cy.checkAccessibility(null, { includedImpacts: ['critical', 'serious', 'moderate', 'minor'] })
        });

        // PASSING TESTS
        // -------------

        // #12
        it('Simple passing test - 12', () => {
            expect(true).to.be.true
        });
    })

    // #7
    it('Check accessibility google.com web site - 7', { defaultCommandTimeout: 15000 }, () => {
        cy.visit('https://www.google.com')
        cy.wait(2000) // Using cy.wait(TIME) is a very bad practice, but it is used for simplicity in this example

        cy.checkAccessibility()
    });

    // #8
    it('Check accessibility Applitools web site - 8', { defaultCommandTimeout: 15000 }, () => {
        cy.visit('https://demo.applitools.com/')
        cy.wait(2000) // Using cy.wait(TIME) is a very bad practice, but it is used for simplicity in this example

        cy.checkAccessibility(null, { includedImpacts: ['critical', 'serious', 'moderate', 'minor'] })
    });

})

// #11
describe('TEST SUITE 2', { tags: ['@accessibility'] }, () => {

    // #13
    it('Another simple passing test - 13', () => {
        expect(true).to.be.true
    });

    // #14
    it('Another simple failing test - 14', () => {
        expect(true).to.be.false
    });

    // #15
    it.skip('Another simple skipping test - 15', () => {
        expect(true).to.be.true
    });

    // 16
    it('Check accessibility BrowserStack Demo web site - 16', {defaultCommandTimeout: 15000}, () => {
        cy.visit('https://bstackdemo.com/')
        cy.wait(2000) // Using cy.wait(TIME) is a very bad practice, but it is used for simplicity in this example

        cy.checkAccessibility(null, { includedImpacts: ['critical', 'serious', 'moderate', 'minor'] })
    });
})


// 1
it('Check accessibility BrowserStack Demo web site - 1', { defaultCommandTimeout: 15000 }, () => {
    cy.visit('https://bstackdemo.com/')
    cy.wait(2000) // Using cy.wait(TIME) is a very bad practice, but it is used for simplicity in this example

    cy.checkAccessibility(null, { includedImpacts: ['critical', 'serious', 'moderate', 'minor'] })
});

// 2
it('Another simple passing test - 2', () => {
    expect(true).to.be.true
});

// 3
it.skip('Another simple skipping test - 3', () => {
    expect(true).to.be.true
});

// 4
it('Check accessibility BrowserStack Demo web site - 4', { defaultCommandTimeout: 15000 }, () => {
    cy.visit('https://bstackdemo.com/')
    cy.wait(2000) // Using cy.wait(TIME) is a very bad practice, but it is used for simplicity in this example

    cy.checkAccessibility(null, { includedImpacts: ['critical', 'serious', 'moderate', 'minor'] })
});

// 5
it('Another simple failing test - 5 (Ok in second attempt)', () => {
    if (Cypress.currentRetry === 1) {
        expect(true).to.be.true
    } else {
        expect(true).to.be.false
    }
});


