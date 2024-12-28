/// <reference types="cypress" />


import 'cypress-axe'
import { logViolations, logViolationsAndGenerateReport } from './accessibility-log'


/**
 * Default options for accessibility commands.
 * @type {Object}
 * @property {string[]} runOnly - The accessibility guidelines to run. Default is ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'].
 * @property {string[]} includedImpacts - The impact levels to include. Default is ['critical', 'serious'].
 * @property {boolean} generateReport - Whether to generate an accessibility report. Default is true.
 */
const defaultOptions = {
    runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'],
    includedImpacts: ['critical', 'serious'],
    onlyWarnImpacts: [],
    generateReport: true
}

/**
 * Cypress custom commant to check the accessibility of a given context using Cypress and Axe. Only consider DOM elements that are visible on the screen.
 * For more details regarding parameters and options refer to https://www.deque.com/axe/core-documentation/api-documentation/, https://github.com/dequelabs/axe-core and https://www.npmjs.com/package/cypress-axe.
 * @public
 * 
 * @param {string | Element | NodeList | Object} [context] - (optional) Axe-core® plugin parameter - Defines the scope of the analysis - the part of the DOM that you would like to analyze. This will typically be a CSS Selector, and DOM Element such as returned by document.getElementById("content"), a NodeList such as returned by document.querySelectorAll, or an Object. By default the analysis will be done for the full document.
 * @param {Object} [context.exclude] - (optional) Axe-core® plugin option - An object with exclude properties to specify elements that should not be tested. E.g. { exclude: ['button'] }.
 * @param {Object} [context.include] - (optional) Axe-core® plugin option - An object with include properties to specify elements that should be tested. E.g. { include: ['button'] }.
 * @param {Object} [context.fromFrames] - (optional) Axe-core® plugin option - An object with a fromFrames property to specify frames that should be tested.
 * @param {Object} [context.fromShadowDom] - (optional) Axe-core® plugin option - An object with a fromShadowDom property to specify shadow DOM elements that should be tested.
 * @param {Object} [options] - (optional) Axe-core® plugin parameter - Object with options to configure the accessibility check.
 * @param {boolean} [options.generateReport=true] - (optional) WICK-A11Y plugin option - Whether to generate a report for accessibility violations. By default true.
 * @param {string[]} [options.includedImpacts=['critical', 'serious']] - (optional) CYPRESS-AXE plugin option - Array with the violations severities to include in the accessibility analysis that would make the analysis to fail. Map to impact levels in violations, where possible impact level values are "critical", "serious", "moderate", or "minor". By default { includedImpacts: ['critical', 'serious'] }.
 *        Examples:
 *          - { includedImpacts: ['critical', 'serious'] }
 *             Analysis will fail with critical or serious violations. No other severities will be considered.
 *          - { includedImpacts: ['critical', 'serious', 'moderate', 'minor'] }
 *             Analysis will fail with critical, serious, moderate or minor violations
 * @param {string[]} [options.onlyWarnImpacts=[]] - (optional) WICK-A11Y plugin option -  Array with the violations severities to include in the accessibility analysis that will provide a warning, but not to fail. Map to impact levels in violations, where possible impact level values are "critical", "serious", "moderate", or "minor". By default { onlyWarnImpacts: [] }.
 *        Examples:
 *          - { includedImpacts: ['critical', 'serious'], onlyWarnImpacts: ['moderate', 'minor'] }
 *             Analysis will fail with critical and serious violations, and will just provide a warning for moderate and minor violations.
 *          - { includedImpacts: [], onlyWarnImpacts: ['critical', 'serious'] }
 *             Analysis will provide a warning for critical and serious violations, but will not fail. No other severities will be considered.
 *          - { includedImpacts: [], onlyWarnImpacts: ['critical', 'serious', 'moderate', 'minor'] }
 *             Analysis will provide a warning for critical, serious, moderate and minor violations, but will not fail.
 *          - { includedImpacts: ['critical', 'serious', 'moderate'], onlyWarnImpacts: ['moderate', 'minor'] }
 *             If there is overlapping between includedImpacts and onlyWarnImpacts, the includedImpacts configuration will have precedence.
 * @param {object} [options.impactStyling] - (optional) WICK-A11Y plugin option - An object with an entry for each impact level you would like to override the plugin defaults ('critical', 'serious', 'moderate', 'minor'). Each impact level entry may have two properties: 'icon', which specifies the icon to use for that type of violation in the Cypress runner, and 'style', which specifies the CSS style to apply to the HTML element bounding box showing the violation on the page. The styles passed in this option will override the default ones used by the plugin.
 *        Default styles:
 *        {
 *            critical: { icon: '🟥', style: 'fill: #DE071B; fill-opacity: 0; stroke: #DE071B; stroke-width: 10;' },
 *            serious:  { icon: '🟧', style: 'fill: #FFA66A; fill-opacity: 0; stroke: #FFA66A; stroke-width: 10;' },
 *            moderate: { icon: '🟨', style: 'fill: #ECDE05; fill-opacity: 0; stroke: #ECDE05; stroke-width: 10;' },
 *            minor:    { icon: '🟦', style: 'fill: #4598FF; fill-opacity: 0; stroke: #4598FF; stroke-width: 10;' },
 *            fixme:    { icon: '🛠️'}
 *        }
 * @param {integer} [options.retries=0] - (optional) CYPRESS-AXE plugin option - Number of times to retry the check if there are initial findings. By default 0.
 * @param {integer} [options.interval=1000] - (optional) CYPRESS-AXE plugin option - Number of milliseconds to wait between retries. By default 1000 (1 second)
 * @param {string[]} [options.runOnly=['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice']] - (optional) Axe-core® plugin option - Limit which rules are executed, based on names or tags. By default { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'best-practice'] }.
 * @param {Object} [options.rules] - (optional) Axe-core® plugin option - Enable or disable rules using the enabled property. E.g. { rules: { 'color-contrast': { enabled: false }, 'valid-lang': { enabled: false } }}.
 * @param {string} [options.reporter] - (optional) Axe-core® plugin option - Which reporter to use. E.g. { reporter: 'v2'}.
 * @param {string[]} [options.resultTypes] - (optional) Axe-core® plugin option - Limit which result types are processed and aggregated. This can be useful for improving performance on very large or complicated pages when you are only interested in certain types of results. E.g. { resultTypes: ['violations', 'incomplete', 'inapplicable'] }.
 * @param {boolean} [options.selectors=true] - (optional) Axe-core® plugin option - Return CSS selector for elements, optimized for readability. By default true.
 * @param {boolean} [options.ancestry=false] - (optional) Axe-core® plugin option - Return CSS selector for elements, with all the element's ancestors. By default false.
 * @param {boolean} [options.xpath=false] - (optional) Axe-core® plugin option - Return xpath selectors for elements. By default false.
 * @param {boolean} [options.absolutePaths=false] - (optional) Axe-core® plugin option - Use absolute paths when creating element selectors. By default false.
 * @param {boolean} [options.iframes=true] - (optional) Axe-core® plugin option - Tell axe to run inside iframes. By default true.
 * @param {boolean} [options.elementRef=false] - (optional) Axe-core® plugin option - Return element references in addition to the target. By default false.
 * @param {number} [options.frameWaitTime=60000] - (optional) Axe-core® plugin option - How long (in milliseconds) axe waits for a response from embedded frames before timing out. By default 60000 (60 seconds).
 * @param {boolean} [options.preload=true] - (optional) Axe-core® option plugin - Any additional assets (eg: cssom) to preload before running rules. By default true.
 * @param {boolean} [options.performanceTimer=false] - (optional) Axe-core® plugin option - Log rule performance metrics to the console. By default false.
 * @param {number} [options.pingWaitTime=500] - (optional) Axe-core® option plugin - Time in milliseconds before axe-core® considers a frame unresponsive. By default 500 (0.5 seconds).
 * @returns {void}
 */
const checkAccessibility = (context, options) => {
    options = {
        ...defaultOptions,
        ...options
    }
    // If there is overlapping between includedImpacts and onlyWarnImpacts, the includedImpacts configuration will have precedence
    options.onlyWarnImpacts = options.onlyWarnImpacts.filter(impact => !options.includedImpacts.includes(impact))

    Cypress.env('accessibilityContext', context)
    Cypress.env('accessibilityOptions', options)

    // Cypress-axe and axe-core will analyze the impacts for both options (includedImpacts and onlyWarnImpacts)
    let { includedImpacts, onlyWarnImpacts, ...cypressAxeOptions } = { ...options }
    cypressAxeOptions.includedImpacts = [...new Set([...includedImpacts, ...onlyWarnImpacts])]
    
    cy.injectAxe()
    cy.checkA11y(
        context,
        cypressAxeOptions,
        options.generateReport ? logViolationsAndGenerateReport : logViolations,
        true // skipFailures = true (wick-a11y will handle the failures based in the configuration: includedImpacts and onlyWarnImpacts)
    )
}
Cypress.Commands.add('checkAccessibility', checkAccessibility)

