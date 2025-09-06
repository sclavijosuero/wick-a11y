/// <reference types="cypress" />

// Import Accessibility Plugin
import "../../src/accessibility-commands.js";


describe('ACCESSIBILITY TESTS', { tags: ['@accessibility'] }, () => {

    beforeEach(() => {
        cy.visit('https://parabank.parasoft.com/parabank/index.htm')
        cy.wait(2000) // Using cy.wait(TIME) is a very bad practice, but it is used for simplicity in this example
    });

    // NOTE: AXE analysis can spend quite some time, so it is recommended to increase the default command timeout for such tests

    it('Test Sample Page Accessibility - Default analysis', {defaultCommandTimeout: 15000}, () => {
        //   - Analyze entire document
        //   - includedImpacts: ['critical', 'serious']
        //   - runOnly:['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']
        //   - generateReport: true
        //   - iframes: true

        cy.checkAccessibility()
    });

    it('Test Sample Page Accessibility - All levels of severity', {defaultCommandTimeout: 15000}, () => {
        cy.checkAccessibility(null, { includedImpacts: ['critical', 'serious', 'moderate', 'minor'] })
    });

    it.only('Test Sample Page Accessibility - All levels of severity', {defaultCommandTimeout: 15000}, () => {
        cy.checkAccessibility(null, { includedImpacts: ['critical', 'serious', 'moderate', 'minor'], runOnly:['wcag2a', 'wcag2aa', 'wcag2aaa', 'wcag21a', 'wcag21aa', 'wcag21aaa', 'wcag22a', 'wcag22aa',, 'wcag22aaa', 'best-practice'] })
    });

    it('Test Sample Page Accessibility - Custom colors by severity', {defaultCommandTimeout: 15000}, () => {
        const customImpactStyling = {
            serious: { icon: '🟢', style: 'fill: #42C600; fill-opacity: 0; stroke: #42C600; stroke-width: 7;' },
            moderate: { icon: '🟣', style: 'fill: #886DE7; fill-opacity: 0.3; stroke: #886DE7; stroke-width: 6; stroke-dasharray: 5,3;' },
            minor: { style: 'fill: #4598FF; fill-opacity: 0; stroke: #4598FF; stroke-width: 14; ' },
            fixme: { icon: '🪓' }
        }

        cy.checkAccessibility(null, { impactStyling: customImpactStyling, includedImpacts: ['critical', 'serious', 'moderate', 'minor'] })
    });

    it('Test Sample Page Accessibility - Disable rules "contrast" and "valid-lang"', {defaultCommandTimeout: 15000}, () => {
        // Disable in the analysis of the rules for color-contrast and valid-lang
        cy.checkAccessibility(null, { rules: { 'color-contrast': { enabled: false }, 'valid-lang': { enabled: false } }})
    });
    
    it('Test Sample Page Accessibility - Disable report generation', {defaultCommandTimeout: 15000}, () => {
        cy.checkAccessibility(null, { generateReport: false, includedImpacts: ['critical', 'serious', 'moderate', 'minor'] })
    });

    it('Test Sample Page Accessibility - Provide context as CSS selector String', {defaultCommandTimeout: 15000}, () => {
        cy.checkAccessibility(['div[role="banner"], ul'], { includedImpacts: ['critical', 'serious', 'moderate', 'minor'], runOnly:['best-practice'] })
    });

    it('Test Sample Page Accessibility - Provide context as Array of CSS selectors', {defaultCommandTimeout: 15000}, () => {
        cy.checkAccessibility(['div[role="banner"]', 'ul'], { includedImpacts: ['critical', 'serious', 'moderate', 'minor'], runOnly:['best-practice'] })
    });
    
    it('Test Sample Page Accessibility - Provide context as HTML Element', {defaultCommandTimeout: 15000}, () => {
        cy.document().then((doc) => {
            cy.checkAccessibility(doc.getElementById('my-navigation'), { includedImpacts: ['critical', 'serious', 'moderate', 'minor'] })
        })
    });

    it('Test Sample Page Accessibility - Provide context as Array of HTML Elements', {defaultCommandTimeout: 15000}, () => {
        cy.document().then((doc) => {
            cy.checkAccessibility([doc.getElementById('my-navigation'), doc.getElementById('name')], { includedImpacts: ['critical', 'serious', 'moderate', 'minor'] })
        })
    });
    
    it('Test Sample Page Accessibility - Provide context as HTML NodeList', {defaultCommandTimeout: 15000}, () => {
        cy.document().then((doc) => {
            cy.checkAccessibility(doc.querySelectorAll('div[role="banner"], ul'), { includedImpacts: ['critical', 'serious', 'moderate', 'minor'] })
        })
    });

    it('Test Sample Page Accessibility - Provide context as Object with "exclude" and "include"', {defaultCommandTimeout: 15000}, () => {
        // Note:
        //   - If you include a large set of elements and then exclude one of them, the excluded element will still be part of the selection.
        //   - If you exclude a large set of elements and then include one of them, the included element will be the only one part of the selection.
        cy.checkAccessibility({ exclude: 'li' , include: 'li:nth-child(2)' }, { includedImpacts: ['critical', 'serious', 'moderate', 'minor'] })
    });

    it('Test Sample Page Accessibility - Provide context as object with "include" that is an Array of CSS selectors', {defaultCommandTimeout: 15000}, () => {
        cy.checkAccessibility({ include: ['div[role="banner"]', 'ul'] }, { includedImpacts: ['critical', 'serious', 'moderate', 'minor'], runOnly:['best-practice'] })
    });

})
