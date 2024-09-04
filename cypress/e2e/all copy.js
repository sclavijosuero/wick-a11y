/// <reference types="cypress" />

// Import Accessibility Plugin
import "../../src/accessibility-commands.js";


// // #1
// describe('TEST SUITE 1', { tags: ['@accessibility'] }, () => {

//     // FAILING TESTS
//     // -------------

//     // // #2
//     // it('Check accessibility Parabank web site', { defaultCommandTimeout: 15000 }, () => {
//     //     cy.visit('https://parabank.parasoft.com/parabank/index.htm')
//     //     cy.wait(2000) // Using cy.wait(TIME) is a very bad practice, but it is used for simplicity in this example

//     //     cy.checkAccessibility(null, { includedImpacts: ['critical', 'serious', 'moderate', 'minor'] })
//     // });

//     // // // #5
//     // // context('Context 1', () => {
//     // //     // #6
//     // //     it('Check accessibility Practice Software Testing web site', { defaultCommandTimeout: 15000 }, () => {
//     // //         cy.visit('https://practicesoftwaretesting.com/#/')
//     // //         cy.wait(2000) // Using cy.wait(TIME) is a very bad practice, but it is used for simplicity in this example

//     // //         cy.checkAccessibility()
//     // //     });

//     // //     // #7
//     // //     it('Simple failing test', () => {
//     // //         cy.wrap(false).as('falseValue')
//     // //         cy.get('@falseValue').should('be.true')
//     // //         // expect(true).to.be.false
//     // //     });
//     // // })

//     // // // SKIPPED TESTS
//     // // // -------------
//     // // // #8
//     // // context('Context 2', () => {
//     // //     // #9
//     // //     it.skip('Check accessibility Cypress.io web site', { defaultCommandTimeout: 15000 }, () => {
//     // //         cy.visit('https://example.cypress.io/')
//     // //         cy.wait(2000) // Using cy.wait(TIME) is a very bad practice, but it is used for simplicity in this example

//     // //         cy.checkAccessibility(null, { includedImpacts: ['critical', 'serious', 'moderate', 'minor'] })
//     // //     });

//     // //     // PASSING TESTS
//     // //     // -------------

//     // //     // #10
//     // //     it('Simple passing test', () => {
//     // //         expect(true).to.be.true
//     // //     });
//     // // })

//     // #3
//     // it('Check accessibility google.com web site', { defaultCommandTimeout: 15000 }, () => {
//     //     cy.visit('https://www.google.com')
//     //     cy.wait(2000) // Using cy.wait(TIME) is a very bad practice, but it is used for simplicity in this example

//     //     cy.checkAccessibility()
//     // });

//     // #4
//     it('Check accessibility Applitools web site', { defaultCommandTimeout: 15000 }, () => {
//         cy.visit('https://demo.applitools.com/')
//         cy.wait(2000) // Using cy.wait(TIME) is a very bad practice, but it is used for simplicity in this example

//         cy.checkAccessibility(null, { includedImpacts: ['critical', 'serious', 'moderate', 'minor'] })
//     });

// })

// // #11
// describe('TEST SUITE 2', { tags: ['@accessibility'] }, () => {

//     // // #12
//     // it('Another simple passing test', () => {
//     //     expect(true).to.be.true
//     // });

//     // #13
//     // it('Another simple failing test', () => {
//     //     expect(true).to.be.false
//     // });

//     // #14
//     it.skip('Another simple skipping test', () => {
//         expect(true).to.be.true
//     });

//     // it('Check accessibility BrowserStack Demo web site', {defaultCommandTimeout: 15000}, () => {
//     //     cy.visit('https://bstackdemo.com/')
//     //     cy.wait(2000) // Using cy.wait(TIME) is a very bad practice, but it is used for simplicity in this example

//     //     cy.checkAccessibility(null, { includedImpacts: ['critical', 'serious', 'moderate', 'minor'] })
//     // });
// })


it('Check accessibility google.com web site 22', { defaultCommandTimeout: 15000 }, () => {
    cy.visit('https://www.google.com')
    cy.wait(2000) // Using cy.wait(TIME) is a very bad practice, but it is used for simplicity in this example

    cy.checkAccessibility()
});



it('Check accessibility Applitools web site 22', { defaultCommandTimeout: 15000 }, () => {
    cy.visit('https://demo.applitools.com/')
    cy.wait(2000) // Using cy.wait(TIME) is a very bad practice, but it is used for simplicity in this example

    cy.checkAccessibility(null, { includedImpacts: ['critical', 'serious', 'moderate', 'minor'] })
});


// #12
it('Another simple passing test 22', () => {
    expect(true).to.be.true
});

// #14
it.skip('Another simple skipping test 22', () => {
    expect(true).to.be.true
});

// #13
it('Another simple failing test 22', () => {
    if (Cypress.currentRetry === 1) {
        expect(true).to.be.true
    } else {
        expect(true).to.be.false
    }
});

it('Check accessibility BrowserStack Demo web site 22', { defaultCommandTimeout: 15000 }, () => {
    cy.visit('https://bstackdemo.com/')
    cy.wait(2000) // Using cy.wait(TIME) is a very bad practice, but it is used for simplicity in this example

    cy.checkAccessibility(null, { includedImpacts: ['critical', 'serious', 'moderate', 'minor'] })
});


