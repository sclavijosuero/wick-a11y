/// <reference types="cypress" />

declare global {
    namespace Cypress {
        interface Chainable {
            /**
             * Cypress custom command to check the accessibility of a given context using Cypress and Axe.
             * Only considers DOM elements that are visible on the screen.
             * For details on parameters and options, refer to Axe-core® documentation and the cypress-axe package.
             *
             * @param {string | Element | NodeList | Object} [context] - (optional) Defines the scope of the analysis.
             *   Can be a CSS Selector, DOM Element, NodeList, or Object, where object properties include:
             *   - {Object} exclude: Elements to exclude from testing. E.g., { exclude: ['button'] }.
             *   - {Object} include: Elements to include in testing.
             *   - {Object} fromFrames: Specifies frames to be tested.
             *   - {Object} fromShadowDom: Specifies shadow DOM elements to be tested.
             * @param {Object} [options] - (optional) Configuration options for the accessibility check.
             *   - {boolean} generateReport: Whether to generate a report for violations. Default is true.
             *   - {Object} impactStyling: Custom styling for impacts ('critical', 'serious', 'moderate', 'minor').
             *   - {string[]} includedImpacts: Impact levels to include. Default ['critical', 'serious'].
             *   - {string[]} onlyWarnImpacts: Impact levels to warn about. Default [].
             *   - {integer} retries: Number of times to retry the check if issues are found. Default is 0.
             *   - {integer} interval: Time in milliseconds between retries. Default 1000ms.
             *   - {string[]} runOnly: Rules to run, e.g., ['wcag2a', 'wcag2aa'].
             *   - {Object} rules: Enable or disable specific rules. E.g., { 'color-contrast': { enabled: false } }.
             *   - {string} reporter: Reporter version to use. E.g., 'v2'.
             *   - {string[]} resultTypes: Result types to process, like ['violations', 'inapplicable'].
             *   - Other options like selectors, ancestry, xpath, etc., to customize rule execution.
             * @returns {void}
             *
             * @example
             * // Without context and options
             * cy.checkAccessibility();
             *
             * // With context as a CSS Selector
             * cy.checkAccessibility('main');
             *
             * // With context as a DOM Element
             * cy.document().then(doc => {
             *   cy.checkAccessibility(doc.getElementById('root'));
             * });
             *
             * // With options to customize execution
             * cy.checkAccessibility(null, { includedImpacts: ['critical'], runOnly: ['wcag2aa'] });
             */
            checkAccessibility(
                context?: string | HTMLElement | NodeList | {
                    exclude?: string[];
                    include?: string[];
                    fromFrames?: object;
                    fromShadowDom?: object;
                },
                options?: {
                    generateReport?: boolean;
                    impactStyling?: Record<string, { icon: string; style: string }>;
                    includedImpacts?: string[];
                    onlyWarnImpacts?: string[];
                    retries?: number;
                    interval?: number;
                    runOnly?: string[];
                    rules?: Record<string, { enabled: boolean }>;
                    reporter?: string;
                    resultTypes?: string[];
                    selectors?: boolean;
                    ancestry?: boolean;
                    xpath?: boolean;
                    absolutePaths?: boolean;
                    iframes?: boolean;
                    elementRef?: boolean;
                    frameWaitTime?: number;
                    preload?: boolean;
                    performanceTimer?: boolean;
                    pingWaitTime?: number;
                }
            ): void;
        }
    }
}
export { };
