//*******************************************************************************
// FOR MULTIPLE ATTEMPTS CASES
//*******************************************************************************

let reportIdGlobal = ''


//*******************************************************************************
// PUBLIC FUNCTIONS AND CONSTANTS
//*******************************************************************************


/**
 * Defines the scope considered in the accessibility analysis.
 * @type {string}
 */
const contextHelp = 'Context defines the scope considered in the accessibility analysis, specifying which elements have been tested and which have not been tested.'

/**
 * Tags define the severity of violations that have been considered in the accessibility analysis.
 * @type {string}
 */
const runOnlyHelp = 'Tags define the severity of violations that have been considered in the accessibility analysis.'

/**
 * Defines what specific accessibility rules should be enabled or disabled for the analysis.
 * @type {string}
 */
const rulesHelp = 'Rules define what specific accessibility rules should be enable or disabled for the analysis, like "color-contrast" or "valid-lang".'

/**
 * @typedef {Object} ImpactSeverityDescription
 * @property {string} critical - <Description of critical violations>
 * @property {string} serious - <Description of serious violations>
 * @property {string} moderate - <Description of moderate violations>
 * @property {string} minor - <Description of minor violations>
 */
const impactSeverityDescription = {
    critical: `A 'CRITICAL' accessibility violation represents a significant barrier that prevents users with disabilities
               from accessing core functionality or content.<br>For example, images must have alternate text (alt text) to
               ensure that visually impaired users can understand the content of the images through screen readers.
               Missing alt text on critical images can be a substantial obstacle to accessibility.`,
    serious: `A 'SERIOUS' accessibility violation significantly degrades the user experience for individuals with disabilities
               but does not completely block access.<br>For instance, elements must meet minimum color contrast ratio thresholds.
               If text and background colors do not have sufficient contrast, users with visual impairments or color blindness may
               find it difficult to read the content.`,
    moderate: `A 'MODERATE' accessibility violation impacts the user experience but with less severe consequences.
               These issues can cause some confusion or inconvenience.<br>For example, all page content should be contained by landmarks.
               Properly defining landmarks (like header, main, nav) helps screen reader users to navigate and understand the structure
               of the page better.`,
    minor: `A 'MINOR' accessibility violation has a minimal impact on accessibility. These issues are typically more related to best
               practices and can slightly inconvenience users.<br>For instance, the ARIA role should be appropriate for the element means
               that ARIA roles assigned to elements should match their purpose to avoid confusion for screen reader users, though it does
               not significantly hinder access if not perfectly used.`
}

/**
 * @public
 * Records the accessibility violations and generates an HTML report with the violations detected.
 * The report includes a screenshot of the page with the elements that have violations highlighted in different colors based on severity.
 *
 * @param {Object} reportInfo - The information to be used to create the report.
 * @param {Object} reportInfo.testResults - The test results object.
 * @param {Array} reportInfo.violations - The array of accessibility violations.
 * @param {Object} reportInfo.accessibilityContext - The context parameter of the accessibility analysis.
 * @param {Object} reportInfo.accessibilityOptions - The options for the accessibility analysis.
 * @param {Array} reportInfo.impactPriority - List of accessibility impact priorities supported
 * @param {Object} reportInfo.impactStyling - The impact styling object.
 */
export const recordReportViolations = (reportInfo) => {

    cy.url({ log: false }).then(url => {
        const day = new Date()
        const reportGeneratedOn = day.toString()
        const fileDate = day.toLocaleString({ timezone: "short" }).replace(/\//g, '-').replace(/:/g, '_').replace(/,/g, '')

        const testSpec = Cypress.spec.name
        const testName = Cypress._.last(Cypress.currentTest.titlePath)

        // Accessibility folder
        const accessibilityFolder = Cypress.config('accessibilityFolder') || defaultAccessibilityFolder
        // const reportId = normalizeFileName(`Accessibility Report --- ${testSpec} --- ${testName} (${fileDate})`)

        // Report Id folder
        const attempt = Cypress.currentRetry
        let reportId
        if (attempt === 0) {
            reportIdGlobal = normalizeFileName(`Accessibility Report --- ${testSpec} --- ${testName} (${fileDate})`)
            reportId = reportIdGlobal
        } else {
            reportId = `${reportIdGlobal} (attempt ${attempt + 1})`
        }

        const reportFolder = `${accessibilityFolder}/${reportId}`

        // Generate the HTML report with the violations detected, including screenshot of the page with the elements vith violations highlighted in different colors based on severity
        cy.task('createFolderIfNotExist', `${reportFolder}`).then(() => {

            // Generate screenshot of the page
            const issuesScreenshotFilePath = takeScreenshotsViolations(reportId, reportFolder)

            // Build the content of the HTML report
            const fileBody = buildHtmlReportBody(reportInfo, { testSpec, testName, url, reportGeneratedOn, issuesScreenshotFilePath })

            // Generate the HTML report
            const file = { folderPath: reportFolder, fileName: 'Accessibility Report.html', fileBody }
            cy.task('generateViolationsReport', file).then((result) => {
                console.log(result)
                cy.log(result)
            })
        })
    })
}

//*******************************************************************************
// PRIVATE FUNCTIONS AND CONSTANTS
//*******************************************************************************

/**
 * The default folder path for storing accessibility reports.
 * @type {string}
 */
const defaultAccessibilityFolder = 'cypress/accessibility'


/**
 * Takes screenshot of accessibility violations and moves them to the accessibility results folder.
 *
 * @param {string} reportId - The ID of the accessibility report.
 * @param {string} reportFolder - The folder where the screenshots will be moved to.
 * @returns {string} - The filename of the moved screenshot.
 */
const takeScreenshotsViolations = (reportId, reportFolder) => {
    // reportId - E.g. 'Accessibility Report --- accessibility-tests-samples.js --- Test Sample Page Accessibility (6-23-2024 3_13_03 PM)'
    // reportFolder - E.g. 'cypress/accessibility/Accessibility Report --- accessibility-tests-samples.js --- Test Sample Page Accessibility (6-23-2024 3_13_03 PM)'

    const attempt = Cypress.currentRetry
    const attemptSuffix = attempt > 0 ? ` (attempt ${attempt + 1})` : ''

    const issuesFileNameOrigin = `${reportId} Accessibility Issues Image`
    const issuesFileNameTarget = `Accessibility Issues Image`
    const targetFileName = `${issuesFileNameTarget}${attemptSuffix}.png`
    const targetFilePath = `${reportFolder}/${targetFileName}`
    let originFilePath = ''

    setViolationsHover('disabled')
    cy.screenshot(`${issuesFileNameOrigin}`, { capture: 'fullPage' })
    setViolationsHover('enabled')

    // To get the *exact path* of the screenshot file, we temporarily override Cypress's global screenshot default configuration.
    // `onAfterScreenshot` is a callback function that Cypress ran immediately after the screenshot
    // It provides a `details` object containing metadata, including the actual screenshot `path` which we need to access.
    const restoreScreenshotDefaults = Cypress.Screenshot.defaults({
        onAfterScreenshot: (_el, details) => { originFilePath = details.path }
    })
    
    cy.then(() => {
        // It's critical to restore the original Cypress screenshot defaults. If we don't, our
        // custom `onAfterScreenshot` function would affect every other screenshot path in the entire test suite.
        if (typeof restoreScreenshotDefaults === 'function') restoreScreenshotDefaults()

        // In case of path error, throw error messages without interrupting users tests
        if (originFilePath === '') {    
            Cypress.log({
                name: 'wick-a11y', // Package name for the command
                displayName: 'Wick-A11y Screenshot', // What the user sees
                message: '⚠️ Warning: Could not save screenshot to report folder.',
                consoleProps: () => ({ // Debugging info in the console
                    'Plugin': 'wick-a11y',
                    'Warning': 'Could not capture the screenshot path from onAfterScreenshot.',
                    'Effect': 'The test will pass, but the screenshot file was not moved to the report folder. It may exist in the default Cypress screenshots directory.',
                }),
            });
            
            console.warn('Wick-A11y Screenshot Warning: Could not capture screenshot path from onAfterScreenshot.');
            
            return; // Exit and allow users test to continue.
        }

        return cy.task('moveScreenshotToFolder', { originFilePath, targetFilePath }).then(console.log)
    })
  
    return targetFileName
}

/**
 * Sets the hover class for the severity rectangles.
 *
 * @param {string} className - The class name to be set: 'enabled', 'disabled'.
 */
const setViolationsHover = (className) => {
    cy.then(() => {
        Cypress.$('.severity rect').attr('class', className)
    })
}

/**
 * Builds the HTML report body for accessibility violations.
 *
 * @param {Object} reportInfo - The information to be used to create the report.
 * @param {Object} reportInfo.testResults - The test results object.
 * @param {Array} reportInfo.violations - The array of accessibility violations.
 * @param {Object} reportInfo.accessibilityContext - The context parameter of the accessibility analysis.
 * @param {Object} reportInfo.accessibilityOptions - The options for the accessibility analysis.
 * @param {Object} reportInfo.impactStyling - The impact styling object.
 * @param {Array} reportInfo.impactPriority - List of accessibility impact priorities supported
 * @param {Object} options - The options for building the report body.
 * @param {string} options.testSpec - The test spec (test file).
 * @param {string} options.testName - The name of the test with the accessibility analysis is performed
 * @param {string} options.url - The URL of the page being tested.
 * @param {string} options.reportGeneratedOn - The date and time when the report was generated.
 * @param {string} options.issuesScreenshotFilePath - The file path of the screenshot showing the accessibility violations.
 * @returns {string} The HTML report body.
 */
const buildHtmlReportBody = (reportInfo, options) => {
    const { testResults, violations, accessibilityContext, accessibilityOptions, impactStyling, impactPriority } = reportInfo
    const { testSpec, testName, url, reportGeneratedOn, issuesScreenshotFilePath } = options

    const fileBody = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Accessibility Report (Axe-core®)</title>
        <style>
            /* CSS Custom Properties for consistent theming - WCAG 2.2 AAA Compliant */
            :root {
                --color-white: #ffffff;
                --color-primary-blue: #f0f8ff;
                --color-secondary-blue: #e6f3ff;
                --color-primary-yellow: #fffbe0;
                --color-border-light: #d1d5db;
                --color-border-medium: #9ca3af;
                --color-text-primary: #111827; /* WCAG AAA: Enhanced contrast 12.63:1 */
                --color-text-secondary: #374151; /* WCAG AAA: Enhanced contrast 9.76:1 */
                --color-text-link: #1e40af; /* WCAG AAA: Enhanced contrast 7.04:1 */
                --color-text-link-hover: #1e3a8a; /* WCAG AAA: Enhanced contrast 8.59:1 */
                --color-focus: #2563eb; /* WCAG AAA: Enhanced focus visibility */
                --color-success: #065f46; /* WCAG AAA: 7.77:1 contrast */
                --color-warning: #92400e; /* WCAG AAA: 7.04:1 contrast */
                --color-error: #991b1b; /* WCAG AAA: 8.89:1 contrast */
                --color-shadow: rgba(0, 0, 0, 0.1);
                --color-shadow-hover: rgba(0, 0, 0, 0.25);
                --font-family-primary: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;
                --font-size-base: 16px;
                --font-size-small: 14px;
                --font-size-large: 18px; /* WCAG AAA: Large text for better readability */
                --font-size-xlarge: 24px;
                --font-size-xxlarge: 32px;
                --spacing-xs: 8px;
                --spacing-sm: 12px;
                --spacing-md: 16px;
                --spacing-lg: 24px;
                --spacing-xl: 32px;
                --spacing-xxl: 48px; /* WCAG AAA: Enhanced spacing options */
                --border-radius: 8px;
                --border-radius-lg: 12px;
                --transition-fast: 0.15s ease;
                --transition-normal: 0.25s ease;
                --min-touch-size: 44px; /* WCAG AAA: Minimum touch target size */
            }

            /* Reset and base styles */
            * {
                box-sizing: border-box;
            }

            html, body {
                margin: 0;
                padding: 0;
                font-family: var(--font-family-primary);
                font-size: var(--font-size-base);
                line-height: 1.5; /* WCAG AAA: Improved line height for better readability */
                color: var(--color-text-primary);
                background-color: var(--color-white);
                scroll-behavior: smooth;
            }

            /* Skip link for keyboard navigation */
            .skip-link {
                position: absolute;
                top: -40px;
                left: 6px;
                background: var(--color-focus);
                color: var(--color-white);
                padding: var(--spacing-sm) var(--spacing-md);
                text-decoration: none;
                border-radius: var(--border-radius);
                z-index: 1000;
                font-weight: 600;
            }

            .skip-link:focus {
                top: 6px;
            }

            /* Main container */
            .container {
                max-width: 1200px;
                margin: 0 auto;
                padding: var(--spacing-lg);
                background-color: var(--color-white);
            }

            @media (max-width: 768px) {
                .container {
                    padding: var(--spacing-md);
                }
            }

            /* Header styles */
            .header {
                text-align: center;
                color: var(--color-text-primary);
                font-size: var(--font-size-xxlarge);
                font-weight: 700;
                margin: 0 0 var(--spacing-lg) 0;
                letter-spacing: -0.5px;
            }

            /* Control buttons */
            .control-buttons {
                display: flex;
                justify-content: center;
                gap: var(--spacing-sm);
                margin-bottom: var(--spacing-lg);
                flex-wrap: wrap;
            }

            .control-button {
                padding: var(--spacing-sm) var(--spacing-lg); /* WCAG AAA: Enhanced touch target */
                min-height: var(--min-touch-size); /* WCAG AAA: Minimum touch size */
                min-width: var(--min-touch-size);
                background: linear-gradient(135deg, #e8f4fd 0%, #d1e9f8 100%);
                border: 2px solid var(--color-border-light); /* WCAG AAA: Enhanced border visibility */
                border-radius: var(--border-radius);
                color: var(--color-text-primary);
                font-size: var(--font-size-base); /* WCAG AAA: Larger text for buttons */
                font-weight: 600;
                cursor: pointer;
                transition: all var(--transition-fast);
                text-decoration: none;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: var(--spacing-sm);
            }

            .control-button:hover {
                background: linear-gradient(135deg, #d1e9f8 0%, #b8ddf3 100%);
                border-color: var(--color-text-link);
                transform: translateY(-1px);
                box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
            }

            .control-button:focus {
                background: linear-gradient(135deg, #d1e9f8 0%, #b8ddf3 100%);
                border-color: var(--color-focus);
                outline: 3px solid var(--color-focus); /* WCAG AAA: 3px minimum focus indicator */
                outline-offset: 2px;
                box-shadow: 0 4px 12px rgba(37, 99, 235, 0.25);
                transform: translateY(-1px);
            }

            .control-button__icon {
                font-size: 0.9em;
            }

            /* Screenshot button - distinctive styling for image viewing */
            .control-button--screenshot {
                background: linear-gradient(135deg, #fefce8 0%, #fef3c7 100%);
                border: 2px solid #d97706;
                color: var(--color-text-primary);
                font-weight: 700;
                position: relative;
            }

            .control-button--screenshot:hover {
                background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%);
                border-color: #c2410c;
                box-shadow: 0 4px 12px rgba(217, 119, 6, 0.25);
                transform: translateY(-1px);
            }

            .control-button--screenshot:focus {
                background: linear-gradient(135deg, #fef3c7 0%, #fed7aa 100%);
                border-color: #d97706;
                outline: 3px solid #d97706;
                outline-offset: 2px;
                box-shadow: 0 4px 16px rgba(217, 119, 6, 0.3);
                transform: translateY(-1px);
            }

            .control-button--screenshot:active {
                transform: translateY(0px);
                box-shadow: 0 2px 6px rgba(217, 119, 6, 0.2);
            }

            /* Summary section wrapper */
            .summary-wrapper {
                border: 1px solid var(--color-border-light);
                border-radius: var(--border-radius-lg);
                background: var(--color-white);
                margin-bottom: var(--spacing-lg);
                box-shadow: 0 2px 8px var(--color-shadow);
                transition: box-shadow var(--transition-normal);
            }

            .summary-wrapper:hover {
                box-shadow: 0 4px 12px var(--color-shadow-hover);
            }

            .summary-wrapper[open] {
                box-shadow: 0 4px 12px var(--color-shadow-hover);
            }

            .summary-wrapper__toggle {
                width: 100%;
                padding: var(--spacing-sm);
                background: linear-gradient(135deg, #e8f4fd 0%, #d1e9f8 100%);
                border: none;
                border-radius: var(--border-radius-lg) var(--border-radius-lg) 0 0;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: space-between;
                font-size: var(--font-size-large);
                font-weight: 600;
                color: var(--color-text-primary);
                transition: background-color var(--transition-fast);
                list-style: none;
            }

            .summary-wrapper__toggle::-webkit-details-marker {
                display: none;
            }

            .summary-wrapper__toggle:hover,
            .summary-wrapper__toggle:focus {
                background: linear-gradient(135deg, #d1e9f8 0%, #b8ddf3 100%);
                outline: 2px solid var(--color-focus);
                outline-offset: -2px;
            }

            .summary-wrapper__icon {
                transition: transform var(--transition-fast);
                font-size: 0.8em;
            }

            .summary-wrapper[open] .summary-wrapper__icon {
                transform: rotate(90deg);
            }

            /* Horizontal summary grid layout */
            .summary-grid {
                display: grid;
                grid-template-columns: 2fr 1.3fr 1fr;
                gap: var(--spacing-sm);
                padding: var(--spacing-sm);
            }

            @media (max-width: 1024px) {
                .summary-grid {
                    grid-template-columns: 1fr;
                    gap: var(--spacing-xs);
                }
            }

            /* Collapsible summary sections */
            .summary-section {
                border: 1px solid var(--color-border-light);
                border-radius: var(--border-radius-lg);
                background: var(--color-white);
                box-shadow: 0 2px 8px var(--color-shadow);
                transition: box-shadow var(--transition-normal);
            }

            .summary-section:hover {
                box-shadow: 0 4px 12px var(--color-shadow-hover);
            }

            .summary-section[open] {
                box-shadow: 0 4px 12px var(--color-shadow-hover);
            }

            .summary-section__toggle {
                width: 100%;
                padding: var(--spacing-sm);
                background: linear-gradient(135deg, #e8f4fd 0%, #d1e9f8 100%);
                border: none;
                border-radius: var(--border-radius-lg) var(--border-radius-lg) 0 0;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: space-between;
                font-size: var(--font-size-base);
                font-weight: 600;
                color: var(--color-text-primary);
                transition: background-color var(--transition-fast);
                list-style: none;
            }

            .summary-section__toggle::-webkit-details-marker {
                display: none;
            }

            .summary-section__toggle:hover {
                background: linear-gradient(135deg, #d1e9f8 0%, #b8ddf3 100%);
            }

            .summary-section__toggle:focus {
                background: linear-gradient(135deg, #d1e9f8 0%, #b8ddf3 100%);
                outline: 3px solid var(--color-focus); /* WCAG AAA: Enhanced focus indicator */
                outline-offset: 2px;
                box-shadow: 0 0 0 1px var(--color-focus);
            }

            .summary-section__icon {
                transition: transform var(--transition-fast);
                font-size: 0.8em;
            }

            .summary-section[open] .summary-section__icon {
                transform: rotate(90deg);
            }

            /* Static header for non-expandable summary sections */
            .summary-section__header {
                padding: var(--spacing-sm);
                background: linear-gradient(135deg, #e8f4fd 0%, #d1e9f8 100%);
                border-radius: var(--border-radius-lg) var(--border-radius-lg) 0 0;
                font-size: var(--font-size-base);
                font-weight: 600;
                color: var(--color-text-primary);
            }

            .summary-section__content {
                padding: var(--spacing-sm);
            }

            /* Configuration item 2-line layout */
            .config-item {
                display: flex;
                flex-direction: column;
                gap: var(--spacing-xs);
                margin-bottom: var(--spacing-sm);
            }

            .config-item:last-child {
                margin-bottom: 0;
            }

            .config-item__label {
                font-weight: 600;
                color: var(--color-text-primary);
            }

            .config-item__value {
                color: var(--color-text-secondary);
                word-break: break-word;
            }

            /* Legacy card layout - keep for backward compatibility */
            .card-grid {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: var(--spacing-lg);
                margin-bottom: var(--spacing-xl);
            }

            @media (max-width: 768px) {
                .card-grid {
                    grid-template-columns: 1fr;
                    gap: var(--spacing-md);
                }
            }

            .card {
                background: var(--color-white);
                border: 1px solid var(--color-border-light);
                border-radius: var(--border-radius-lg);
                padding: var(--spacing-sm);
                box-shadow: 0 2px 8px var(--color-shadow);
                transition: box-shadow var(--transition-normal), transform var(--transition-fast);
            }

            .card:hover {
                box-shadow: 0 6px 20px var(--color-shadow-hover);
                transform: translateY(-2px);
            }

            .card--blue {
                background: linear-gradient(135deg, var(--color-primary-blue) 0%, var(--color-secondary-blue) 100%);
            }

            .card--yellow {
                background: linear-gradient(135deg, var(--color-primary-yellow) 0%, #fef8e0 100%);
            }

            .card--full-width {
                grid-column: 1 / -1;
            }

            /* Card headers */
            .card__header {
                font-size: var(--font-size-large);
                font-weight: 600;
                margin: 0 0 var(--spacing-md) 0;
                color: var(--color-text-primary);
                border-bottom: 2px solid var(--color-border-light);
                padding-bottom: var(--spacing-sm);
            }

            /* Summary items */
            .summary-item {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                margin-bottom: var(--spacing-sm);
                font-size: var(--font-size-base);
                line-height: 1.5;
            }

            .summary-item:last-child {
                margin-bottom: 0;
            }

            .summary-item__label {
                font-weight: 600;
                margin-right: var(--spacing-xs);
                color: var(--color-text-primary);
                min-width: 80px;
            }

            .summary-item__value {
                color: var(--color-text-secondary);
                word-break: break-word;
            }

            /* Impact severity indicators */
            .impact-indicator {
                display: flex;
                align-items: center;
                margin-bottom: var(--spacing-sm);
                padding: var(--spacing-xs) var(--spacing-sm);
                border-radius: var(--border-radius);
                background: rgba(255, 255, 255, 0.7);
                border: 1px solid var(--color-border-light);
                transition: background-color var(--transition-fast);
            }

            .impact-indicator:hover {
                background: rgba(255, 255, 255, 0.9);
            }

            .impact-indicator__icon {
                margin-right: var(--spacing-sm);
                font-size: var(--font-size-large);
            }

            .impact-indicator__label {
                font-weight: 600;
                margin-right: var(--spacing-xs);
                text-transform: uppercase;
                font-size: var(--font-size-small);
                letter-spacing: 0.5px;
            }

            .impact-indicator__count {
                color: var(--color-text-secondary);
                font-weight: 500;
            }

            /* Severity navigation links */
            .severity-link {
                color: inherit;
                text-decoration: none;
                text-transform: uppercase;
                font-weight: 600;
                border-bottom: 2px solid transparent;
                transition: all var(--transition-normal);
                padding: var(--spacing-xs) var(--spacing-sm);
                display: inline-block;
                position: relative;
                border-radius: var(--border-radius);
                cursor: pointer;
            }

            .severity-link:hover {
                color: var(--color-text-link);
                border-bottom-color: var(--color-text-link);
                text-decoration: none;
                background: rgba(30, 64, 175, 0.1);
                transform: translateY(-1px);
                box-shadow: 0 2px 8px rgba(30, 64, 175, 0.15);
            }

            .severity-link:focus {
                outline: 3px solid var(--color-focus); /* WCAG AAA: Enhanced focus indicator */
                outline-offset: 2px;
                border-radius: var(--border-radius);
                color: var(--color-text-link);
                border-bottom-color: var(--color-text-link);
                text-decoration: none;
                background: rgba(30, 64, 175, 0.1);
                transform: translateY(-1px);
                box-shadow: 0 2px 8px rgba(30, 64, 175, 0.15);
            }

            .severity-link:active {
                transform: translateY(0px);
                box-shadow: 0 1px 4px rgba(30, 64, 175, 0.1);
            }

            /* Links */
            a {
                color: var(--color-text-link);
                text-decoration: underline;
                transition: color var(--transition-fast);
            }

            a:hover {
                color: var(--color-text-link-hover);
            }

            a:focus {
                outline: 3px solid var(--color-focus); /* WCAG AAA: Enhanced focus indicator */
                outline-offset: 3px;
                border-radius: 3px;
                background: rgba(37, 99, 235, 0.1); /* WCAG AAA: Enhanced focus background */
            }

            /* Tooltip improvements with smart positioning */
            .tooltip {
                position: relative;
                display: inline;
                cursor: help;
                border-bottom: 1px dotted var(--color-text-link);
                color: var(--color-text-link);
                transition: color var(--transition-fast);
            }

            .tooltip:hover,
            .tooltip:focus {
                color: var(--color-text-link-hover);
                border-bottom-color: var(--color-text-link-hover);
            }

            .tooltip:focus {
                outline: 3px solid var(--color-focus); /* WCAG AAA: Enhanced focus indicator */
                outline-offset: 2px;
                border-radius: 3px;
                background: rgba(37, 99, 235, 0.1);
            }

            .tooltip__content {
                visibility: hidden;
                opacity: 0;
                position: absolute;
                bottom: 125%;
                left: 50%;
                transform: translateX(-50%);
                width: max-content;
                max-width: 500px;
                background: var(--color-text-primary);
                color: var(--color-white);
                padding: var(--spacing-sm) var(--spacing-md);
                border-radius: var(--border-radius);
                font-size: var(--font-size-small);
                line-height: 1.4;
                text-align: left;
                z-index: 1000;
                transition: opacity var(--transition-normal), visibility var(--transition-normal);
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
                /* Ensure consistent paragraph and text formatting */
                font-family: var(--font-family-primary);
                font-weight: 400;
                letter-spacing: normal;
                word-spacing: normal;
                text-transform: none;
            }

            /* Consistent paragraph spacing within tooltips for both sections */
            .tooltip__content br {
                line-height: 1.4;
                margin: var(--spacing-xs) 0;
            }

            /* Ensure consistent text formatting within tooltips */
            .tooltip__content p {
                margin: var(--spacing-xs) 0;
                font-size: var(--font-size-small);
                line-height: 1.4;
                font-weight: 400;
            }

            .tooltip__content p:first-child {
                margin-top: 0;
            }

            .tooltip__content p:last-child {
                margin-bottom: 0;
            }

            /* Analysis Configuration tooltips - narrower and positioned to the left */
            .card--yellow .tooltip__content {
                max-width: 300px;
                left: 0;
                transform: translateX(0);
                /* Ensure consistent font and paragraph styling */
                font-family: var(--font-family-primary);
                font-size: var(--font-size-small);
                line-height: 1.4;
                font-weight: 400;
            }

            .card--yellow .tooltip__content::after {
                left: 20px;
                transform: translateX(0);
            }

            /* Mobile layout: all tooltips anchored to the left when cards are stacked */
            @media (max-width: 1024px) {
                .summary-section:nth-child(2) .tooltip__content, /* Analysis Configuration */
                .summary-section:nth-child(3) .tooltip__content  /* Violations Summary */
                {
                    left: 0;
                    transform: translateX(0);
                    max-width: 300px;
                    /* Ensure consistent font and paragraph styling */
                    font-family: var(--font-family-primary);
                    font-size: var(--font-size-small);
                    line-height: 1.4;
                    font-weight: 400;
                }

                .summary-section:nth-child(2) .tooltip__content::after, /* Analysis Configuration */
                .summary-section:nth-child(3) .tooltip__content::after  /* Violations Summary */
                {
                    left: 20px;
                    transform: translateX(0);
                }
            }

            /* Desktop layout: Violations Summary tooltips anchored to the right */
            @media (min-width: 1025px) {
                .summary-section:nth-child(3) .tooltip__content /* Violations Summary */
                {
                    left: auto;
                    right: 0;
                    transform: translateX(0);
                    max-width: 400px;
                    /* Ensure consistent font and paragraph styling */
                    font-family: var(--font-family-primary);
                    font-size: var(--font-size-small);
                    line-height: 1.4;
                    font-weight: 400;
                }

                .summary-section:nth-child(3) .tooltip__content::after /* Violations Summary */
                {
                    left: auto;
                    right: 20px;
                    transform: translateX(0);
                }
            }

            /* Smart positioning for tooltips near viewport edges */
            .tooltip--left .tooltip__content {
                left: 0;
                transform: translateX(0);
            }

            .tooltip--right .tooltip__content {
                left: auto;
                right: 0;
                transform: translateX(0);
            }

            .tooltip--bottom .tooltip__content {
                bottom: auto;
                top: 125%;
            }

            .tooltip__content::after {
                content: "";
                position: absolute;
                top: 100%;
                left: 50%;
                transform: translateX(-50%);
                border: 6px solid transparent;
                border-top-color: var(--color-text-primary);
            }

            .tooltip--left .tooltip__content::after {
                left: 20px;
                transform: translateX(0);
            }

            .tooltip--right .tooltip__content::after {
                left: auto;
                right: 20px;
                transform: translateX(0);
            }

            .tooltip--bottom .tooltip__content::after {
                top: -6px;
                border-top-color: transparent;
                border-bottom-color: var(--color-text-primary);
            }

            .tooltip:hover .tooltip__content,
            .tooltip:focus .tooltip__content {
                visibility: visible;
                opacity: 1;
            }

            /* Violations section */
            .violations-section {
                margin-top: var(--spacing-lg);
            }

            /* Severity-based violation sections */
            .severity-section {
                border: 1px solid var(--color-border-light);
                border-radius: var(--border-radius-lg);
                background: var(--color-white);
                margin-bottom: var(--spacing-lg);
                box-shadow: 0 2px 8px var(--color-shadow);
                transition: box-shadow var(--transition-normal);
            }

            .severity-section:hover {
                box-shadow: 0 4px 12px var(--color-shadow-hover);
            }

            .severity-section[open] {
                box-shadow: 0 4px 12px var(--color-shadow-hover);
            }

            .severity-section__toggle {
                width: 100%;
                padding: var(--spacing-sm);
                border: none;
                border-radius: var(--border-radius-lg) var(--border-radius-lg) 0 0;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: space-between;
                font-size: var(--font-size-large);
                font-weight: 600;
                color: var(--color-text-primary);
                transition: background-color var(--transition-fast);
                list-style: none;
            }

            .severity-section__toggle::-webkit-details-marker {
                display: none;
            }

            .severity-section__toggle:hover {
                filter: brightness(0.95);
            }

            .severity-section__toggle:focus {
                outline: 3px solid var(--color-focus); /* WCAG AAA: Enhanced focus indicator */
                outline-offset: 2px;
                box-shadow: 0 0 0 1px var(--color-focus);
            }

            .severity-section--critical .severity-section__toggle {
                background: linear-gradient(135deg, #fed7d7, #feb2b2);
            }

            .severity-section--serious .severity-section__toggle {
                background: linear-gradient(135deg, #fed7aa, #fbb670);
            }

            .severity-section--moderate .severity-section__toggle {
                background: linear-gradient(135deg, #fef08a, #fde047);
            }

            .severity-section--minor .severity-section__toggle {
                background: linear-gradient(135deg, #e8f4fd, #d1e9f8);
            }

            .severity-section__icon {
                transition: transform var(--transition-fast);
                font-size: 0.8em;
                margin-left: var(--spacing-xs);
            }

            .severity-section[open] .severity-section__icon {
                transform: rotate(90deg);
            }

            .severity-section__content {
                padding: var(--spacing-sm);
            }

            .violations-title {
                font-size: var(--font-size-xlarge);
                font-weight: 700;
                margin: 0 0 var(--spacing-lg) 0;
                color: var(--color-text-primary);
                text-align: center;
            }

            .violations-list {
                list-style: none;
                padding: 0;
                margin: 0;
            }

            .violation-card {
                background: var(--color-white);
                border: 1px solid var(--color-border-light);
                border-radius: var(--border-radius-lg);
                margin-bottom: var(--spacing-lg);
                box-shadow: 0 2px 8px var(--color-shadow);
                overflow: hidden;
                transition: box-shadow var(--transition-normal), transform var(--transition-fast);
            }

            .violation-card:hover {
                box-shadow: 0 6px 24px var(--color-shadow-hover);
                transform: translateY(-2px);
            }

            .violation-card__header {
                padding: var(--spacing-sm);
                background: linear-gradient(135deg, var(--color-primary-blue) 0%, var(--color-secondary-blue) 100%);
                border-bottom: 1px solid var(--color-border-light);
            }

            .violation-card__title {
                font-size: var(--font-size-large);
                font-weight: 600;
                margin: 0 0 var(--spacing-sm) 0;
                color: var(--color-text-primary);
                display: flex;
                align-items: center;
                flex-wrap: wrap;
                gap: var(--spacing-sm);
            }

            .violation-card__impact {
                background: rgba(255, 255, 255, 0.9);
                padding: var(--spacing-xs) var(--spacing-sm);
                border-radius: var(--border-radius);
                font-size: var(--font-size-small);
                font-weight: 600;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                display: flex;
                align-items: center;
                gap: var(--spacing-xs);
            }

            .violation-card__rule-id {
                font-style: italic;
                color: var(--color-text-secondary);
                font-weight: 400;
            }

            .violation-card__meta {
                display: flex;
                flex-wrap: wrap;
                gap: var(--spacing-md);
                align-items: center;
                margin-top: var(--spacing-sm);
            }

            .violation-card__link {
                display: inline-flex;
                align-items: center;
                padding: var(--spacing-xs) var(--spacing-md);
                background: var(--color-white);
                border: 1px solid var(--color-text-link);
                border-radius: var(--border-radius);
                text-decoration: none;
                font-size: var(--font-size-small);
                font-weight: 500;
                transition: all var(--transition-fast);
            }

            .violation-card__link:hover {
                background: var(--color-text-link);
                color: var(--color-white);
                transform: translateY(-1px);
            }

            .violation-card__tags {
                font-size: var(--font-size-small);
                color: var(--color-text-secondary);
                font-weight: 500;
            }

            .violation-card__content {
                padding: var(--spacing-sm);
            }


            .affected-elements {
                list-style: none;
                padding: 0;
                margin: 0;
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                gap: var(--spacing-sm);
            }

            @media (min-width: 1200px) {
                .affected-elements {
                    grid-template-columns: 1fr 1fr 1fr;
                }
            }

            @media (max-width: 768px) {
                .affected-elements {
                    grid-template-columns: 1fr;
                }
            }

            .affected-element {
                background: var(--color-primary-yellow);
                border: 1px solid var(--color-border-light);
                border-radius: var(--border-radius);
                padding: var(--spacing-sm);
                transition: background-color var(--transition-fast);
            }

            .affected-element:hover {
                background: #fef6d0;
            }

            .affected-element__header {
                display: flex;
                align-items: center;
                gap: var(--spacing-sm);
                margin-bottom: var(--spacing-sm);
                font-weight: 600;
                font-size: var(--font-size-small);
                color: var(--color-text-primary);
            }

             /* Affected element expandable details container */
             .affected-element__details {
                 width: 100%;
                 margin-bottom: var(--spacing-sm); /* Spacing between collapsed elements */
             }

             /* Remove margin when expanded since expandable content has its own margin */
             .affected-element__details[open] {
                 margin-bottom: 0;
             }

             /* Selector with integrated toggle control */
             .affected-element__selector-toggle {
                 width: 100%;
                 display: flex;
                 align-items: flex-start; /* Align to top instead of center */
                 justify-content: space-between;
                 padding: var(--spacing-xs) var(--spacing-sm);
                 background: rgba(255, 255, 255, 0.8);
                 border: 1px solid var(--color-border-light);
                 border-radius: var(--border-radius);
                 cursor: pointer;
                 font-size: var(--font-size-small);
                 color: var(--color-text-primary);
                 transition: all var(--transition-fast);
                 list-style: none;
                 margin-bottom: 0; /* Remove spacing */
                 min-height: var(--min-touch-size); /* WCAG AAA: Minimum touch target */
             }

             /* When expanded, selector should have rounded top corners only */
             .affected-element__details[open] .affected-element__selector-toggle {
                 border-radius: var(--border-radius) var(--border-radius) 0 0;
                 border-bottom: none;
             }

             .affected-element__selector-toggle::-webkit-details-marker {
                 display: none;
             }

             .affected-element__selector-toggle::marker {
                 display: none;
             }

             .affected-element__selector-toggle:hover {
                 background: rgba(255, 255, 255, 1);
                 border-color: var(--color-text-link);
                 box-shadow: 0 2px 4px rgba(30, 64, 175, 0.1);
             }

             .affected-element__selector-toggle:focus {
                 outline: 3px solid var(--color-focus); /* WCAG AAA: Enhanced focus indicator */
                 outline-offset: 2px;
                 background: rgba(255, 255, 255, 1);
                 border-color: var(--color-focus);
                 box-shadow: 0 2px 8px rgba(37, 99, 235, 0.2);
             }

             /* Selector text with monospace font */
             .affected-element__selector-text {
                 font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
                 flex: 1;
                 word-break: break-all;
                 text-align: left;
                 margin-right: var(--spacing-sm);
                 line-height: 1.4; /* Consistent line height for multi-line selectors */
             }

             /* Toggle control on the right */
             .affected-element__toggle-control {
                 display: flex;
                 align-items: center;
                 gap: var(--spacing-xs);
                 font-size: var(--font-size-small);
                 color: var(--color-text-link);
                 font-weight: 500;
                 flex-shrink: 0;
                 line-height: 1.2; /* Match selector text line height for perfect alignment */
                 padding-top: 2px; /* Fine-tune alignment with first line of text */
             }

             /* Toggle icon with rotation animation */
             .affected-element__toggle-icon {
                 font-size: 12px;
                 transition: transform var(--transition-fast);
                 color: var(--color-text-link);
                 display: inline-block;
             }

             .affected-element__details[open] .affected-element__toggle-icon {
                 transform: rotate(90deg);
             }

             /* Toggle label */
             .affected-element__toggle-label {
                 font-size: var(--font-size-small);
                 font-weight: 500;
                 color: var(--color-text-link);
             }

             /* Expandable content */
             .affected-element__expandable-content {
                 padding: var(--spacing-sm);
                 background: linear-gradient(180deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.5) 100%);
                 border: 1px solid var(--color-border-light);
                 border-top: 2px solid rgba(30, 64, 175, 0.1); /* Stylish visual separator */
                 border-radius: 0 0 var(--border-radius) var(--border-radius);
                 font-size: var(--font-size-small);
                 line-height: 1.5;
                 color: var(--color-text-secondary);
                 margin-bottom: var(--spacing-sm); /* Keep bottom margin for spacing between elements */
                 position: relative;
             }

             /* Optional: Add a subtle decorative element */
             .affected-element__expandable-content::before {
                 content: "";
                 position: absolute;
                 top: 0;
                 left: var(--spacing-sm);
                 right: var(--spacing-sm);
                 height: 1px;
                 background: linear-gradient(90deg, transparent 0%, rgba(30, 64, 175, 0.2) 50%, transparent 100%);
                 pointer-events: none;
             }

             /* Legacy expandable styles for other components */
             .expandable {
                 border: 1px solid var(--color-border-light);
                 border-radius: var(--border-radius);
                 background: rgba(255, 255, 255, 0.9);
                 margin-top: var(--spacing-sm);
             }

             .expandable__toggle {
                 width: 100%;
                 padding: var(--spacing-sm);
                 background: none;
                 cursor: pointer;
                 display: flex;
                 align-items: center;
                 gap: var(--spacing-xs);
                 font-size: var(--font-size-small);
                 font-weight: 500;
                 color: var(--color-text-primary);
                 transition: background-color var(--transition-fast);
                 list-style: none;
             }

             .expandable__toggle::-webkit-details-marker {
                 display: none;
             }

             .expandable__toggle::marker {
                 display: none;
             }

             .expandable__toggle:hover {
                 background: rgba(0, 0, 0, 0.05);
             }

             .expandable__toggle:focus {
                 outline: 3px solid var(--color-focus); /* WCAG AAA: Enhanced focus indicator */
                 outline-offset: 2px;
                 background: rgba(37, 99, 235, 0.1);
                 box-shadow: 0 0 0 1px var(--color-focus);
             }

             .expandable__icon {
                 font-size: 12px;
                 transition: transform var(--transition-fast);
                 color: var(--color-text-link);
                 display: inline-block;
             }

             .expandable[open] .expandable__icon {
                 transform: rotate(90deg);
             }

             .expandable__content {
                 padding: 0 var(--spacing-sm) var(--spacing-sm) var(--spacing-sm);
                 border-top: 1px solid var(--color-border-light);
                 background: rgba(255, 255, 255, 0.5);
                 font-size: var(--font-size-small);
                 line-height: 1.5;
                 color: var(--color-text-secondary);
             }

            /* Screenshot section */
            .screenshot-section {
                margin-top: var(--spacing-xl);
                text-align: center;
            }

            .screenshot-title {
                font-size: var(--font-size-xlarge);
                font-weight: 700;
                margin: 0 0 var(--spacing-lg) 0;
                color: var(--color-text-primary);
            }

            .screenshot-container {
                display: inline-block;
                max-width: 100%;
                border-radius: var(--border-radius-lg);
                overflow: hidden;
                box-shadow: 0 8px 32px var(--color-shadow);
                transition: transform var(--transition-normal);
            }

            .screenshot-container:hover {
                transform: scale(1.02);
            }

            .screenshot-image {
                width: 100%;
                height: auto;
                display: block;
                border: 2px solid var(--color-border-medium);
            }

            /* Footer */
            .footer {
                margin-top: var(--spacing-xl);
                padding: var(--spacing-xs) var(--spacing-lg);
                background: linear-gradient(135deg, var(--color-primary-blue) 0%, var(--color-secondary-blue) 100%);
                border-radius: var(--border-radius-lg);
                text-align: center;
                color: var(--color-text-secondary);
                font-size: var(--font-size-small);
                line-height: 1.2;
            }

            /* Focus management for better accessibility */
            .focusable {
                transition: outline var(--transition-fast);
            }

            .focusable:focus {
                outline: 2px solid var(--color-focus);
                outline-offset: 2px;
            }

            /* Print styles */
            @media print {
                .container {
                    max-width: none;
                    margin: 0;
                    padding: 20px;
                }
                
                .card {
                    break-inside: avoid;
                    box-shadow: none;
                    border: 1px solid #ccc;
                }
                
                .violation-card {
                    break-inside: avoid;
                    box-shadow: none;
                    border: 1px solid #ccc;
                }
            }
        </style>
    </head>
    <body>
        <a href="#main-content" class="skip-link">Skip to main content</a>
        
        <div class="container">
            <header role="banner">
                <h1 class="header">Accessibility Report (Axe-core®)</h1>
                
                <!-- Control Buttons -->
                <div class="control-buttons">
                    <button type="button" class="control-button" onclick="expandAllSections()" aria-label="Expand all collapsible sections to show their content">
                        <span class="control-button__icon">⬇️</span>
                        <span>Expand All</span>
                    </button>
                    <button type="button" class="control-button" onclick="collapseAllSections()" aria-label="Collapse all collapsible sections to hide their content">
                        <span class="control-button__icon">⬆️</span>
                        <span>Collapse All</span>
                    </button>
                    <button type="button" class="control-button control-button--screenshot" onclick="scrollToScreenshot()" aria-label="Scroll to accessibility violations screenshot image">
                        <span class="control-button__icon">📷</span>
                        <span>View Screenshot</span>
                    </button>
                </div>
            </header>

            <main id="main-content" role="main">
                <!-- Summary Cards Group -->
                <details class="summary-wrapper" open id="summary-wrapper">
                    <summary class="summary-wrapper__toggle">
                        <span>📋 Report Summary</span>
                        <span class="summary-wrapper__icon">▶</span>
                    </summary>
                    <div class="summary-grid">
                        <div class="summary-section">
                            <div class="summary-section__header" id="summary-heading">
                                <span>📊 Test Summary</span>
                            </div>
                            <div class="summary-section__content">
                                <div class="summary-item">
                                    <span class="summary-item__label">Spec:</span>
                                    <span class="summary-item__value">${escapeHTML(testSpec)}</span>
                                </div>
                                <div class="summary-item">
                                    <span class="summary-item__label">Test:</span>
                                    <span class="summary-item__value">${escapeHTML(testName)}</span>
                                </div>
                                <div class="summary-item">
                                    <span class="summary-item__label">Page URL:</span>
                                    <span class="summary-item__value">
                                        <a href="${url}" target="_blank" rel="noopener noreferrer" aria-label="Open tested page in new tab">${escapeHTML(url)}</a>
                                    </span>
                                </div>
                                <div class="summary-item">
                                    <span class="summary-item__label">Generated:</span>
                                    <span class="summary-item__value">${reportGeneratedOn}</span>
                                </div>
                            </div>
                        </div>

                        <div class="summary-section">
                            <div class="summary-section__header">
                                <span>⚙️ Analysis Configuration</span>
                            </div>
                            <div class="summary-section__content">
                                <div class="config-item">
                                    <div class="config-item__label">
                                        <span tabindex="0" class="tooltip focusable" aria-describedby="tooltip-context">
                                            Context
                                            <span id="tooltip-context" class="tooltip__content" role="tooltip">
                                                ${contextHelp}
                                            </span>
                                        </span>:
                                    </div>
                                    <div class="config-item__value">${getHumanReadableFormat(accessibilityContext)}</div>
                                </div>
                                <div class="config-item">
                                    <div class="config-item__label">
                                        <span tabindex="0" class="tooltip focusable" aria-describedby="tooltip-tags">
                                            Tags
                                            <span id="tooltip-tags" class="tooltip__content" role="tooltip">
                                                ${runOnlyHelp}
                                            </span>
                                        </span>:
                                    </div>
                                    <div class="config-item__value">${accessibilityOptions.runOnly.join(', ')}</div>
                                </div>
                                ${accessibilityOptions.rules ? `
                                    <div class="config-item">
                                        <div class="config-item__label">
                                            <span tabindex="0" class="tooltip focusable" aria-describedby="tooltip-rules">
                                                Rules
                                                <span id="tooltip-rules" class="tooltip__content" role="tooltip">
                                                    ${rulesHelp}
                                                </span>
                                            </span>:
                                        </div>
                                        <div class="config-item__value">${getHumanReadableFormat(accessibilityOptions.rules)}</div>
                                    </div>` : ''
                                }
                            </div>
                        </div>

                        <div class="summary-section">
                            <div class="summary-section__header">
                                <span>⚠️ Violations Summary</span>
                            </div>
                            <div class="summary-section__content">
                                ${impactPriority.map((impact) => {
                                    const totalIssues = testResults.testSummary[impact] !== undefined ? testResults.testSummary[impact] : 'n/a'
                                    return `
                                        <div class="impact-indicator">
                                            <span class="impact-indicator__icon" aria-hidden="true">${impactStyling[impact].icon}</span>
                                            <span class="impact-indicator__label">
                                                <a href="#section-${impact}" class="severity-link tooltip focusable" aria-describedby="tooltip-${impact}" aria-label="Go to ${impact} violations section">
                                                    ${impact}
                                                    <span id="tooltip-${impact}" class="tooltip__content" role="tooltip">
                                                        ${impactSeverityDescription[impact]}
                                                    </span>
                                                </a>:
                                            </span>
                                            <span class="impact-indicator__count">${totalIssues}</span>
                                        </div>`
                                }).join('')}
                            </div>
                        </div>
                    </div>
                </details>

                <!-- Violations Details by Severity -->
                <section aria-labelledby="violations-heading" class="violations-section">
                    <h2 id="violations-heading" class="violations-title">Accessibility Violations Details</h2>
                    ${impactPriority.map((impact) => {
                        // Skip if this impact level was not part of the analysis (n/a value)
                        const totalIssuesInSummary = testResults.testSummary[impact];
                        if (totalIssuesInSummary === undefined || totalIssuesInSummary === 'n/a') {
                            return '';
                        }

                        const violationsForImpact = violations.filter(violation => violation.impact === impact);
                        const violationCount = violationsForImpact.length;
                        
                        if (violationCount === 0) {
                            return `
                                <details class="severity-section severity-section--${impact}" open id="section-${impact}">
                                    <summary class="severity-section__toggle">
                                        <span>
                                            <span aria-hidden="true">${impactStyling[impact].icon}</span>
                                            ${impact.toUpperCase()} VIOLATIONS (${violationCount})
                                        </span>
                                        <span class="severity-section__icon">▶</span>
                                    </summary>
                                    <div class="severity-section__content">
                                        <p style="text-align: center; color: var(--color-text-secondary); font-style: italic; padding: var(--spacing-md);">
                                            No ${impact} violations found.
                                        </p>
                                    </div>
                                </details>
                            `;
                        }
                        
                        return `
                            <details class="severity-section severity-section--${impact}" open id="section-${impact}">
                                <summary class="severity-section__toggle">
                                    <span>
                                        <span aria-hidden="true">${impactStyling[impact].icon}</span>
                                        ${impact.toUpperCase()} VIOLATIONS (${violationCount})
                                    </span>
                                    <span class="severity-section__icon">▶</span>
                                </summary>
                                <div class="severity-section__content">
                                    <ul class="violations-list" style="list-style: none; padding: 0; margin: 0;">
                                        ${violationsForImpact.map((violation, violationIndex) => `
                                            <li class="violation-card">
                                                <div class="violation-card__header">
                                                    <h3 class="violation-card__title" id="violation-${impact}-${violationIndex}">
                                                        <span class="violation-card__impact">
                                                            <span aria-hidden="true">${impactStyling[violation.impact].icon}</span>
                                                            ${violation.impact}
                                                        </span>
                                                        <span>${escapeHTML(violation.help)}</span>
                                                        <span class="violation-card__rule-id">(Rule: ${escapeHTML(violation.id)})</span>
                                                    </h3>
                                                    <div class="violation-card__meta">
                                                        <a href="${violation.helpUrl}" target="_blank" rel="noopener noreferrer" class="violation-card__link" aria-label="Learn more about ${escapeHTML(violation.help)} rule">
                                                            Learn More
                                                        </a>
                                                        <span class="violation-card__tags">
                                                            <strong>Tags:</strong> ${violation.tags.join(", ")}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div class="violation-card__content">
                                                    <h4 class="affected-elements-title">Affected Elements (${violation.nodes.length})</h4>
                                                    <ul class="affected-elements">
                                                         ${violation.nodes.map((node, nodeIndex) => `
                                                             <li class="affected-element">
                                                                 <div class="affected-element__header">
                                                                     <span aria-hidden="true">${impactStyling.fixme.icon}</span>
                                                                     <span>Element ${nodeIndex + 1}</span>
                                                                 </div>
                                                                 <details class="affected-element__details">
                                                                     <summary class="affected-element__selector-toggle">
                                                                         <span class="affected-element__selector-text">
                                                                             ${escapeHTML(node.target.join(', '))}
                                                                         </span>
                                                                         <span class="affected-element__toggle-control">
                                                                             <span class="affected-element__toggle-icon">▶</span>
                                                                             <span class="affected-element__toggle-label">Details</span>
                                                                         </span>
                                                                     </summary>
                                                                     <div class="affected-element__expandable-content">
                                                                         ${getFailureSummaryExpandableHtml(node.failureSummary)}
                                                                     </div>
                                                                 </details>
                                                             </li>
                                                         `).join("")}
                                                    </ul>
                                                </div>
                                            </li>
                                        `).join("")}
                                    </ul>
                                </div>
                            </details>
                        `;
                    }).join('')}
                </section>

                <!-- Screenshot Section -->
                <section aria-labelledby="screenshot-heading" class="screenshot-section">
                    <h2 id="screenshot-heading" class="screenshot-title" tabindex="-1">Accessibility Violations Screenshot</h2>
                    <div class="screenshot-container">
                        <img 
                            src="${issuesScreenshotFilePath}" 
                            alt="Screenshot showing accessibility violations highlighted with colored borders based on severity level"
                            class="screenshot-image"
                            loading="lazy"
                        />
                    </div>
                </section>
            </main>

            <footer role="contentinfo" class="footer">
                <p>
                    🎓 <strong>Note:</strong> As per the axe-core® library, automated testing can find on average 57% of WCAG issues automatically.
                </p>
                <p>
                    It only analyzes DOM elements that are visible in the browser viewport.
                </p>
                <p>
                    Axe-core® (<a href="https://github.com/dequelabs/axe-core" target="_blank" rel="noopener noreferrer">https://github.com/dequelabs/axe-core</a>) 
                    is a trademark of Deque Systems, Inc (<a href="https://www.deque.com/" target="_blank" rel="noopener noreferrer">https://www.deque.com/</a>) 
                    in the US and other countries.
                </p>
            </footer>
        </div>

        <script>
            function expandAllSections() {
                const allDetails = document.querySelectorAll('details');
                allDetails.forEach(detail => {
                    detail.open = true;
                });
            }

            function collapseAllSections() {
                const allDetails = document.querySelectorAll('details');
                allDetails.forEach(detail => {
                    detail.open = false;
                });
            }

            function scrollToScreenshot() {
                const screenshotSection = document.getElementById('screenshot-heading');
                if (screenshotSection) {
                    // Calculate position to place screenshot section at top of viewport with some offset
                    const headerOffset = 20; // 20px from top for better visibility
                    const elementPosition = screenshotSection.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                    
                    // Smooth scroll to position
                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                    
                    // Enhanced focus management for WCAG AAA accessibility
                    setTimeout(() => {
                        // Focus on the screenshot section heading for screen reader users
                        screenshotSection.focus({preventScroll: true});
                        
                        // Announce the arrival to screen readers
                        const announcement = document.createElement('div');
                        announcement.setAttribute('aria-live', 'polite');
                        announcement.setAttribute('aria-atomic', 'true');
                        announcement.textContent = 'Scrolled to accessibility violations screenshot section';
                        announcement.style.position = 'absolute';
                        announcement.style.left = '-10000px';
                        announcement.style.width = '1px';
                        announcement.style.height = '1px';
                        announcement.style.overflow = 'hidden';
                        
                        document.body.appendChild(announcement);
                        setTimeout(() => {
                            document.body.removeChild(announcement);
                        }, 1000);
                    }, 300);
                }
            }

            // WCAG AAA: Enhanced smooth scrolling with proper positioning
            function smoothScrollToSection() {
                // Handle severity link clicks
                document.addEventListener('DOMContentLoaded', function() {
                    const severityLinks = document.querySelectorAll('.severity-link[href^="#section-"]');
                    
                    severityLinks.forEach(link => {
                        link.addEventListener('click', function(e) {
                            e.preventDefault();
                            
                            const targetId = this.getAttribute('href').substring(1);
                            const targetElement = document.getElementById(targetId);
                            
                            if (targetElement) {
                                // Ensure the target section is expanded
                                if (targetElement.tagName === 'DETAILS') {
                                    targetElement.open = true;
                                }
                                
                                // Calculate position to place target at top of viewport with some offset
                                const headerOffset = 20; // 20px from top for better visibility
                                const elementPosition = targetElement.getBoundingClientRect().top;
                                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
                                
                                // Smooth scroll to position
                                window.scrollTo({
                                    top: offsetPosition,
                                    behavior: 'smooth'
                                });
                                
                                // Enhanced focus management for WCAG AAA
                                setTimeout(() => {
                                    const focusableElement = targetElement.querySelector('summary') || targetElement;
                                    if (focusableElement) {
                                        focusableElement.focus();
                                        focusableElement.scrollIntoView({ block: 'start', behavior: 'smooth' });
                                    }
                                }, 100);
                            }
                        });
                    });
                });
            }

            // Initialize smooth scrolling
            smoothScrollToSection();
        </script>
    </body>
    </html>
    `
    return fileBody
}

/**
 * Escapes special characters in a string to their corresponding HTML entities.
 *
 * @param {string} str - The string to escape.
 * @returns {string} The escaped string.
 */
const escapeHTML = (str = '') =>
    str.replace(
        /[&<>'"]/g,
        tag =>
        ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    )

/**
 * Returns a formatted tooltip for the failure summary on the Report.
 *
 * @param {string} summary - The summary string to format.
 * @returns {string} The formatted tooltip string.
 */
const getFailureSummaryTooltipHtml = (summary) => {
    // return summary.split('\n').join('<br>&nbsp;&nbsp;&nbsp;- ')

    return summary.split('\n').map((line, index) => {
        if (/^Fix/.test(line)) {
            return line;
        }
        return `&nbsp;&nbsp;&nbsp;- ${line}`
    }).join('<br>')
}

/**
 * Returns a formatted expandable content for the failure summary on the Report.
 *
 * @param {string} summary - The summary string to format.
 * @returns {string} The formatted expandable content string.
 */
const getFailureSummaryExpandableHtml = (summary) => {
    const lines = summary.split('\n').filter(line => line.trim() !== '');
    
    return lines.map((line, index) => {
        if (/^Fix/.test(line)) {
            return `<p><strong>${escapeHTML(line)}</strong></p>`;
        }
        return `<p>• ${escapeHTML(line)}</p>`;
    }).join('');
}

/**
 * Replaces special characters in a file name with underscores.
 *
 * @param {string} fileName - The original file name.
 * @returns {string} The normalized file name with special characters replaced by underscores.
 */
const normalizeFileName = (fileName) => {
    return fileName.replace(/\/|\\|\?|\:|\*|\"|\<|\>|\|/g, "_")
}


/**
 * Returns the context parameter of the accessibility analysis as a string human-readable format.
 *
 * @param {Element|NodeList|Object|Array|String|null} context - The context parameter.
 * 
 * @returns {string} The context as a human-readable string.
 */
const getHumanReadableFormat = (context) => {
    if (context == null) {
        return '(Entire document)'

    } else if (Cypress._.isElement(context)) {
        return escapeHTML(`${context.outerHTML.split('>')[0]}>...</${context.tagName.toLowerCase()}>`)

    } else if (Cypress._.isArray(context) || isNodeList(context)) {
        return Array.from(context).map((elem) => getHumanReadableFormat(elem)).join(', ')

    } else if (Cypress._.isPlainObject(context)) {
        let intermediateString = JSON.stringify(context).replace(/\\"/g, '__TEMP_ESCAPED_QUOTE__');
        let singleQuoteJsonString = intermediateString.replace(/"([^"]*?)"/g, (match, p1) => {
            return `'${p1}'`;
        });
        return singleQuoteJsonString.replace(/__TEMP_ESCAPED_QUOTE__/g, '"');

    } else {
        return context + ''
    }
}


/**
 * Checks if the given object is a NodeList.
 *
 * @param {Object} obj - The object to be checked.
 * @returns {boolean} - Returns true if the object is a NodeList, false otherwise.
 */
const isNodeList = (obj) => {
    return Object.prototype.toString.call(obj) === '[object NodeList]';
}
