/// <reference types="cypress" />

// Import Accessibility Plugin
import "../../../src/accessibility-commands.js";


describe('TEST WITH WARNINGS', { tags: ['@accessibility'] }, () => {
    it('Simple passing test', () => {
        expect(true).to.be.true
    });

    it('Simple failing test', () => {
        expect(false).to.be.true
    });

    it(`Test 0 - Default options`, {defaultCommandTimeout: 15000}, () => {
        cy.visit('https://parabank.parasoft.com/parabank/index.htm')
        cy.wait(2000) // Using cy.wait(TIME) is a very bad practice, but it is used for simplicity in this example

        cy.checkAccessibility()
    });    

    it(`Test 2`, {defaultCommandTimeout: 15000}, () => {
        cy.visit('https://parabank.parasoft.com/parabank/index.htm')
        cy.wait(2000) // Using cy.wait(TIME) is a very bad practice, but it is used for simplicity in this example

        cy.checkAccessibility(null, { includedImpacts: ['critical', 'serious', 'moderate', 'minor'] })
    });

    // *********************************

    it(`Test 3`, {defaultCommandTimeout: 15000}, () => {
        cy.visit('https://parabank.parasoft.com/parabank/index.htm')
        cy.wait(2000) // Using cy.wait(TIME) is a very bad practice, but it is used for simplicity in this example

        cy.checkAccessibility(null, { includedImpacts: ['critical', 'serious'], onlyWarnImpacts: ['moderate', 'minor'] })
    });    

    it(`Test 4`, {defaultCommandTimeout: 15000}, () => {
        cy.visit('https://parabank.parasoft.com/parabank/index.htm')
        cy.wait(2000) // Using cy.wait(TIME) is a very bad practice, but it is used for simplicity in this example

        cy.checkAccessibility(null, { includedImpacts: [], onlyWarnImpacts: ['critical', 'serious'] })
    });

    it(`Test 5`, {defaultCommandTimeout: 15000}, () => {
        cy.visit('https://parabank.parasoft.com/parabank/index.htm')
        cy.wait(2000) // Using cy.wait(TIME) is a very bad practice, but it is used for simplicity in this example

        cy.checkAccessibility(null, { includedImpacts: [], onlyWarnImpacts: ['critical', 'serious', 'moderate', 'minor'] })
    });

    it(`Test 6`, {defaultCommandTimeout: 15000}, () => {
        cy.visit('https://parabank.parasoft.com/parabank/index.htm')
        cy.wait(2000) // Using cy.wait(TIME) is a very bad practice, but it is used for simplicity in this example

        cy.checkAccessibility(null, { includedImpacts: ['critical', 'serious', 'moderate'], onlyWarnImpacts: ['moderate', 'minor'] })
    });
    
    it(`Test 7`, {defaultCommandTimeout: 15000}, () => {
        cy.visit('https://parabank.parasoft.com/parabank/index.htm')
        cy.wait(2000) // Using cy.wait(TIME) is a very bad practice, but it is used for simplicity in this example

        cy.checkAccessibility(null, { includedImpacts: ['critical', 'serious', 'minor'], onlyWarnImpacts: ['moderate', 'minor'] })
    });    
});
