import { 
    help,
    defaultAccessibilityFolder,
    escapeHTML,
    normalizeFileName,
    getHumanReadableFormat
} from '../cypress/support/utils'


//*******************************************************************************
// FOR MULTIPLE ATTEMPTS CASES
//*******************************************************************************

let reportIdGlobal = ''


//*******************************************************************************
// PUBLIC FUNCTIONS AND CONSTANTS
//*******************************************************************************

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

            // Capture overlay data first
            let overlayData = []
            
            captureViolationOverlayData().then((data) => {
                overlayData = data
                
                // Generate screenshot of the page  
                const issuesScreenshotFilePath = takeScreenshotsViolations(reportId, reportFolder)

                // Build the content of the HTML report
                const fileBody = buildHtmlReportBody(reportInfo, { testSpec, testName, url, reportGeneratedOn, issuesScreenshotFilePath, overlayData })

                // Generate the HTML report
                const file = { folderPath: reportFolder, fileName: 'Accessibility Report.html', fileBody }
                cy.task('generateViolationsReport', file).then((result) => {
                    console.log(result)
                    cy.log(result)
                })
            })
        })
    })
}

//*******************************************************************************
// PRIVATE FUNCTIONS AND CONSTANTS
//*******************************************************************************


/**
 * Captures violation overlay data for interactive HTML report.
 *
 * @returns {Promise<Array>} - Array of violation overlay data with positions and styling.
 */
const captureViolationOverlayData = () => {
    return cy.then(() => {
        const overlayData = []
        
        // Find all violation overlays currently on the page
        Cypress.$('.severity').each((index, element) => {
            const $element = Cypress.$(element)
            const impact = $element.attr('data-impact')
            const style = $element.attr('style')
            const className = $element.attr('class')
            
            // Check if this violation targets the HTML element (has 'send-back' class)
            const isHtmlTarget = className && className.includes('send-back')
            
            // Extract position and size from style attribute
            const styleMatch = style.match(/width:\s*(\d+(?:\.\d+)?)px.*?height:\s*(\d+(?:\.\d+)?)px.*?top:\s*(\d+(?:\.\d+)?)px.*?left:\s*(\d+(?:\.\d+)?)px/)
            
            if (styleMatch && impact) {
                const [, width, height, top, left] = styleMatch
                
                // Get tooltip data from the SVG title element
                const tooltipElement = $element.find('title')[0]
                const tooltipMessage = tooltipElement ? tooltipElement.innerHTML : ''
                
                overlayData.push({
                    impact,
                    width: parseFloat(width),
                    height: parseFloat(height),
                    top: parseFloat(top),
                    left: parseFloat(left),
                    tooltip: tooltipMessage,
                    isHtmlTarget: isHtmlTarget,
                    zIndex: getComputedStyle(element).zIndex
                })
            }
        })
        
        return overlayData
    })
}

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
 * @param {Array} options.overlayData - The overlay data for interactive violation highlights.
 * @returns {string} The HTML report body.
 */
const buildHtmlReportBody = (reportInfo, options) => {
    const { testResults, violations, accessibilityContext, accessibilityOptions, impactStyling, impactPriority } = reportInfo
    const { testSpec, testName, url, reportGeneratedOn, issuesScreenshotFilePath, overlayData = [] } = options

    const fileBody = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Wick-A11y Accessibility Report</title>
        <style>
            /* CSS Custom Properties for consistent theming - WCAG 2.2 AAA Compliant - Compact Layout */
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
                --font-size-base: 15px; /* Slightly smaller for compactness */
                --font-size-small: 13px; /* Reduced but still readable */
                --font-size-large: 17px; /* WCAG AAA: Large text for better readability */
                --font-size-xlarge: 21px; /* More compact heading */
                --font-size-xxlarge: 26px; /* Smaller main heading */
                --spacing-xs: 6px; /* Tighter spacing */
                --spacing-sm: 8px; /* Reduced */
                --spacing-md: 12px; /* More compact */
                --spacing-lg: 20px; /* Significantly reduced */
                --spacing-xl: 24px; /* Compact but sufficient */
                --spacing-xxl: 28px; /* WCAG AAA: Enhanced spacing options */
                --border-radius: 6px; /* Slightly smaller radius */
                --border-radius-lg: 8px; /* More compact */
                --transition-fast: 0.15s ease;
                --transition-normal: 0.25s ease;
                --min-touch-size: 44px; /* WCAG AAA: Minimum touch target size - unchanged */
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
                z-index: 1000000000000;
                font-weight: 600;
            }

            .skip-link:focus {
                top: 6px;
            }

            /* Main container - Compact Layout */
            .container {
                max-width: 1200px;
                margin: 0 auto;
                padding: var(--spacing-md) var(--spacing-lg); /* Reduced vertical padding */
                background-color: var(--color-white);
            }

            @media (max-width: 768px) {
                .container {
                    padding: var(--spacing-sm) var(--spacing-md);
                }
            }

            /* Header styles - Compact */
            .header {
                text-align: center;
                color: var(--color-text-primary);
                font-size: var(--font-size-xxlarge);
                font-weight: 700;
                margin: 0 0 var(--spacing-md) 0; /* Reduced bottom margin */
                letter-spacing: -0.5px;
            }

            /* Control buttons - Compact */
            .control-buttons {
                display: flex;
                justify-content: center;
                gap: var(--spacing-xs); /* Tighter gap */
                margin-bottom: var(--spacing-md); /* Reduced margin */
                flex-wrap: wrap;
            }

            .control-button {
                padding: var(--spacing-xs) var(--spacing-md); /* More compact padding */
                min-height: var(--min-touch-size); /* WCAG AAA: Minimum touch size */
                min-width: var(--min-touch-size);
                background: linear-gradient(135deg, #e8f4fd 0%, #d1e9f8 100%);
                border: 2px solid var(--color-border-light); /* WCAG AAA: Enhanced border visibility */
                border-radius: var(--border-radius);
                color: var(--color-text-primary);
                font-size: var(--font-size-small); /* Smaller text for compactness */
                font-weight: 600;
                cursor: pointer;
                transition: all var(--transition-fast);
                text-decoration: none;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                gap: var(--spacing-xs); /* Tighter gap */
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

            /* Scroll to top container - centered positioning - Compact */
            .scroll-to-top-container {
                display: flex;
                justify-content: center;
                margin-top: var(--spacing-lg); /* Reduced margin */
                margin-bottom: var(--spacing-lg); /* Reduced margin */
            }

            /* Scroll to top button - distinctive blue styling */
            .control-button--scroll-top {
                background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
                border: 2px solid var(--color-border-light);
                color: var(--color-text-primary);
                font-weight: 700;
                position: relative;
            }

            .control-button--scroll-top:hover {
                background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
                border-color: #1e40af;
                box-shadow: 0 4px 12px rgba(29, 78, 216, 0.25);
                transform: translateY(-1px);
            }

            .control-button--scroll-top:focus {
                background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
                border-color: #1d4ed8;
                outline: 3px solid #1d4ed8;
                outline-offset: 2px;
                box-shadow: 0 4px 16px rgba(29, 78, 216, 0.3);
                transform: translateY(-1px);
            }

            .control-button--scroll-top:active {
                transform: translateY(0px);
                box-shadow: 0 2px 6px rgba(29, 78, 216, 0.2);
            }

            /* Summary section wrapper - Compact */
            .summary-wrapper {
                border: 1px solid var(--color-border-light);
                border-radius: var(--border-radius-lg);
                background: var(--color-white);
                margin-bottom: var(--spacing-md); /* Reduced margin */
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
                padding: var(--spacing-xs) var(--spacing-sm); /* More compact padding */
                background: linear-gradient(135deg, #e8f4fd 0%, #d1e9f8 100%);
                border: none;
                border-radius: var(--border-radius-lg) var(--border-radius-lg) 0 0;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: space-between;
                font-size: var(--font-size-base); /* Smaller font for compactness */
                font-weight: 600;
                color: var(--color-text-primary);
                transition: background-color var(--transition-fast);
                list-style: none;
            }

            .summary-wrapper__toggle::-webkit-details-marker {
                display: none;
            }

            .summary-wrapper__toggle:hover {
                background: linear-gradient(135deg, #d1e9f8 0%, #b8ddf3 100%);
                outline: 2px solid var(--color-text-link);
                outline-offset: -2px;
            }

            .summary-wrapper__toggle:focus {
                background: linear-gradient(135deg, #d1e9f8 0%, #b8ddf3 100%);
                outline: 3px solid var(--color-focus);
                outline-offset: 2px;
            }

            /* Fix rounded corners when collapsed */
            .summary-wrapper:not([open]) .summary-wrapper__toggle {
                border-radius: var(--border-radius-lg);
            }

            .summary-wrapper__icon {
                transition: transform var(--transition-fast);
                font-size: 0.8em;
            }

            .summary-wrapper[open] .summary-wrapper__icon {
                transform: rotate(90deg);
            }

            /* Horizontal summary grid layout - Compact */
            .summary-grid {
                display: grid;
                grid-template-columns: 2fr 1.3fr 1fr;
                gap: var(--spacing-xs); /* Tighter gap */
                padding: var(--spacing-xs) var(--spacing-sm); /* More compact padding */
            }

            @media (max-width: 1024px) {
                .summary-grid {
                    grid-template-columns: 1fr;
                    gap: var(--spacing-xs);
                    padding: var(--spacing-xs); /* Compact mobile padding */
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
                padding: var(--spacing-xs); /* More compact padding */
                background: linear-gradient(135deg, #e8f4fd 0%, #d1e9f8 100%);
                border: none;
                border-radius: var(--border-radius-lg) var(--border-radius-lg) 0 0;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: space-between;
                font-size: var(--font-size-small); /* Smaller font for compactness */
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

            /* Fix rounded corners when collapsed */
            .summary-section:not([open]) .summary-section__toggle {
                border-radius: var(--border-radius-lg);
            }

            .summary-section__icon {
                transition: transform var(--transition-fast);
                font-size: 0.8em;
            }

            .summary-section[open] .summary-section__icon {
                transform: rotate(90deg);
            }

            /* Static header for non-expandable summary sections - Compact */
            .summary-section__header {
                padding: var(--spacing-xs); /* More compact padding */
                background: linear-gradient(135deg, #e8f4fd 0%, #d1e9f8 100%);
                border-radius: var(--border-radius-lg) var(--border-radius-lg) 0 0;
                // font-size: var(--font-size-small); /* Smaller font for compactness */
                font-weight: 600;
                color: var(--color-text-primary);
            }

            .summary-section__content {
                padding: var(--spacing-xs) var(--spacing-sm); /* More compact padding */
            }

            /* Configuration item 2-line layout - Compact */
            .config-item {
                display: flex;
                flex-direction: column;
                gap: 2px; /* Tighter gap between label and value */
                margin-bottom: var(--spacing-xs); /* Reduced margin */
            }

            .config-item:last-child {
                margin-bottom: 0;
            }

            .config-item__label {
                font-weight: 600;
                color: var(--color-text-primary);
                font-size: var(--font-size-base);
            }

            .config-item__value {
                color: var(--color-text-secondary);
                word-break: break-word;
                font-size: var(--font-size-base);
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

            /* Summary items - Compact */
            .summary-item {
                display: flex;
                flex-wrap: wrap;
                align-items: center;
                margin-bottom: var(--spacing-xs); /* Reduced margin */
                font-size: var(--font-size-base); /* Smaller font */
                line-height: 1.4; /* Slightly tighter line height but still accessible */
            }

            .summary-item:last-child {
                margin-bottom: 0;
            }

            .summary-item__label {
                font-weight: 600;
                margin-right: var(--spacing-xs);
                color: var(--color-text-primary);
                min-width: 60px; /* Reduced width for compactness */
            }

            .summary-item__value {
                color: var(--color-text-secondary);
                word-break: break-word;
            }

            /* Impact severity indicators - Compact */
            .impact-indicator {
                display: flex;
                align-items: center;
                margin-bottom: var(--spacing-xs); /* Reduced margin */
                padding: 2px var(--spacing-xs); /* More compact padding */
                border-radius: var(--border-radius);
                background: rgba(255, 255, 255, 0.7);
                border: 1px solid var(--color-border-light);
                transition: background-color var(--transition-fast);
            }

            .impact-indicator:hover {
                background: rgba(255, 255, 255, 0.9);
            }

            .impact-indicator__icon {
                margin-right: var(--spacing-xs); /* Reduced margin */
                font-size: var(--font-size-base); /* Smaller icon */
            }

            .impact-indicator__label {
                font-weight: 600;
                margin-right: var(--spacing-xs);
                text-transform: uppercase;
                font-size: var(--font-size-base);
                letter-spacing: 0.5px;
            }

            .impact-indicator__count {
                color: var(--color-text-secondary);
                font-weight: 500;
                font-size: var(--font-size-base);
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
                z-index: 1000000000000;
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

            /* Violations section - Compact */
            .violations-section {
                margin-top: var(--spacing-md); /* Reduced margin */
            }

            /* Severity-based violation sections - Compact */
            .severity-section {
                border: 1px solid var(--color-border-light);
                border-radius: var(--border-radius-lg);
                background: var(--color-white);
                margin-bottom: var(--spacing-xl);
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
                padding: var(--spacing-xs) var(--spacing-sm); /* More compact padding */
                border: none;
                border-radius: var(--border-radius-lg) var(--border-radius-lg) 0 0;
                cursor: pointer;
                display: flex;
                align-items: center;
                justify-content: space-between;
                font-size: var(--font-size-base); /* Smaller font for compactness */
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

            /* Fix rounded corners when collapsed */
            .severity-section:not([open]) .severity-section__toggle {
                border-radius: var(--border-radius-lg);
            }

             .severity-section--critical .severity-section__toggle {
                 background: linear-gradient(135deg, #fed7d7 0%, #fecaca 100%);
                 border-left: 6px solid #dc2626;
             }

             .severity-section--serious .severity-section__toggle {
                 background: linear-gradient(135deg, #fed7aa 0%, #fdba74 100%);
                 border-left: 6px solid #ea580c;
             }

             .severity-section--moderate .severity-section__toggle {
                 background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); 
                 border-left: 6px solid #d97706;
             }

             .severity-section--minor .severity-section__toggle {
                 background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
                 border-left: 6px solid #2563eb;
             }

            
            .severity-section--critical .severity-section__toggle:hover {
                outline: 3px solid #dc2626;
                outline-offset: -2px;
            }

            .severity-section--serious .severity-section__toggle:hover {
                outline: 3px solid #ea580c;
                outline-offset: -2px;
            }

            .severity-section--moderate .severity-section__toggle:hover {
                outline: 3px solid #d97706;
                outline-offset: -2px;
            }

            .severity-section--minor .severity-section__toggle:hover {
                outline: 3px solid #2563eb;
                outline-offset: -2px;
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
                 padding: var(--spacing-xs) var(--spacing-sm); /* More compact padding */
                 border-radius: 0 0 var(--border-radius-lg) var(--border-radius-lg);
                 margin: 0;
             }
             
             /* Severity-specific content styling with proper rounded corners */
             .severity-section--critical .severity-section__content {
                 background: linear-gradient(135deg, #fffafa 0%, #fffefe 100%);
                 border-left: 6px solid #dc2626;
                 border-radius: 0 0 var(--border-radius-lg) var(--border-radius-lg);
             }

             .severity-section--serious .severity-section__content {
                 background: linear-gradient(135deg, #fffaf3 0%, #fff5e6 100%);
                 border-left: 6px solid #ea580c;
                 border-radius: 0 0 var(--border-radius-lg) var(--border-radius-lg);
             }

             .severity-section--moderate .severity-section__content {
                 background: linear-gradient(135deg, #fffefb 0%, #fffde7 100%);
                 border-left: 6px solid #d97706;
                 border-radius: 0 0 var(--border-radius-lg) var(--border-radius-lg);
             }

             .severity-section--minor .severity-section__content {
                 background: linear-gradient(135deg, #f8fbff 0%, #f3f8fe 100%);
                 border-left: 6px solid #2563eb;
                 border-radius: 0 0 var(--border-radius-lg) var(--border-radius-lg);
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
                margin-bottom: var(--spacing-md); /* Reduced margin */
                box-shadow: 0 2px 8px var(--color-shadow);
                overflow: hidden;
                transition: box-shadow var(--transition-normal), transform var(--transition-fast);
            }

            .violation-card:hover {
                box-shadow: 0 6px 24px var(--color-shadow-hover);
                transform: translateY(-2px);
            }

            .violation-card__header {
                padding: var(--spacing-xs) var(--spacing-sm); /* More compact padding */
                background: linear-gradient(135deg, var(--color-primary-blue) 0%, var(--color-secondary-blue) 100%);
                border-bottom: 1px solid var(--color-border-light);
            }

            .violation-card__title {
                font-size: var(--font-size-base); /* Smaller font for compactness */
                font-weight: 600;
                margin: 0 0 var(--spacing-xs) 0; /* Reduced margin */
                color: var(--color-text-primary);
                display: flex;
                align-items: center;
                flex-wrap: wrap;
                gap: var(--spacing-xs); /* Tighter gap */
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
                gap: var(--spacing-sm); /* Reduced gap */
                align-items: center;
                margin-top: var(--spacing-xs); /* Reduced margin */
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
                padding: var(--spacing-xs) var(--spacing-sm); /* More compact padding */
            }


            .affected-elements {
                list-style: none;
                padding: 0 var(--spacing-xs) 0 var(--spacing-xs); /* More compact padding */
                margin: 0;
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); /* Slightly smaller min width */
                gap: var(--spacing-xs); /* Tighter gap */
            }

            .violation-card__content h4 {
                padding: 0 var(--spacing-xs) 0 var(--spacing-xs); /* More compact padding */
                margin-bottom: var(--spacing-xs); /* Reduced margin */
                font-size: var(--font-size-base); /* Smaller font */
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
                padding: var(--spacing-xs); /* More compact padding */
                transition: background-color var(--transition-fast);
            }

            .affected-element:hover {
                background: #fef6d0;
            }

            .affected-element__header {
                display: flex;
                align-items: center;
                gap: var(--spacing-xs); /* Tighter gap */
                margin-bottom: var(--spacing-xs); /* Reduced margin */
                font-weight: 600;
                font-size: var(--font-size-small);
                color: var(--color-text-primary);
            }

             /* Affected element expandable details container - Compact */
             .affected-element__details {
                 width: 100%;
                 margin-bottom: var(--spacing-xs); /* Reduced spacing between collapsed elements */
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

             /* When collapsed, selector should have rounded corners on all sides */
             .affected-element__details:not([open]) .affected-element__selector-toggle {
                 border-radius: var(--border-radius);
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

             /* Expandable content - Compact */
             .affected-element__expandable-content {
                 padding: var(--spacing-xs); /* More compact padding */
                 background: linear-gradient(180deg, rgba(255, 255, 255, 0.3) 0%, rgba(255, 255, 255, 0.5) 100%);
                 border: 1px solid var(--color-border-light);
                 border-top: 2px solid rgba(30, 64, 175, 0.1); /* Stylish visual separator */
                 border-radius: 0 0 var(--border-radius) var(--border-radius);
                 font-size: var(--font-size-small);
                 line-height: 1.4; /* Slightly tighter line height but still accessible */
                 color: var(--color-text-secondary);
                 margin-bottom: var(--spacing-xs); /* Reduced bottom margin for spacing between elements */
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

             /* Fix rounded corners when collapsed */
             .expandable:not([open]) .expandable__toggle {
                 border-radius: var(--border-radius);
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

            /* Screenshot section - Compact */
            .screenshot-section {
                margin-top: var(--spacing-xxl); /* Reduced margin */
                text-align: center;
            }

            .screenshot-title {
                font-size: var(--font-size-xlarge); /* Smaller font for compactness */
                font-weight: 700;
                margin: 0 0 var(--spacing-md) 0; /* Reduced margin */
                color: var(--color-text-primary);
            }

            /* Mobile responsive adjustments for screenshot section - Compact */
            @media (max-width: 768px) {
                .screenshot-section {
                    margin-top: var(--spacing-md); /* More compact */
                    text-align: center;
                }
                
                .screenshot-title {
                    font-size: var(--font-size-base); /* Smaller for mobile compactness */
                    margin: 0 0 var(--spacing-sm) 0; /* Reduced margin */
                    line-height: 1.4; /* WCAG 2.2 AAA: Better line height for readability */
                }
            }

            @media (max-width: 480px) {
                .screenshot-section {
                    margin-top: var(--spacing-sm); /* Very compact for small screens */
                }
                
                .screenshot-title {
                    font-size: var(--font-size-small); /* Smaller font */
                    font-weight: 600;
                    margin: 0 0 var(--spacing-xs) 0; /* Minimal margin */
                    padding: 0 var(--spacing-xs); /* Prevent text from touching edges */
                }
            }

            .screenshot-container {
                display: block;
                width: 100%;
                max-width: 1200px;
                margin: 0 auto;
                border-radius: var(--border-radius-lg);
                overflow: hidden;
                box-shadow: 0 8px 32px var(--color-shadow);
                transition: transform var(--transition-normal);
            }

            /* Desktop hover effect */
            @media (hover: hover) and (pointer: fine) {
                .screenshot-container:hover {
                    transform: scale(1.02);
                }
            }

            /* Mobile responsive adjustments */
            @media (max-width: 768px) {
                .screenshot-container {
                    margin: 0 auto;
                    border-radius: var(--border-radius);
                    box-shadow: 0 4px 16px var(--color-shadow);
                }
            }

            @media (max-width: 480px) {
                .screenshot-container {
                    border-radius: var(--border-radius);
                    box-shadow: 0 2px 8px var(--color-shadow);
                }
            }

            .screenshot-image {
                width: 100%;
                height: auto;
                display: block;
                border: 2px solid var(--color-border-medium);
            }

            /* Interactive overlay styles for screenshot */

            .screenshot-overlay svg {
                width: 100%;
                height: 100%;
                border-radius: 10px;
                position: absolute;
                transform: translateX(-50%);
            }

            .screenshot-overlay rect {
                width: 100%;
                height: 100%;
                border-radius: 10px;
                transition: all var(--transition-fast);
            }

            /* Severity-specific overlay styles */
            .screenshot-overlay--critical rect {
                fill: #DE071B;
                fill-opacity: 0;
                stroke: none;
                stroke-width: 0;
            }

            .screenshot-overlay--serious rect {
                fill: #FFA66A;
                fill-opacity: 0;
                stroke: none;
                stroke-width: 0;
            }

            .screenshot-overlay--moderate rect {
                fill: #ECDE05;
                fill-opacity: 0;
                stroke: none;
                stroke-width: 0;
            }

            .screenshot-overlay--minor rect {
                fill: #4598FF;
                fill-opacity: 0;
                stroke: none;
                stroke-width: 0;
            }

            /* Hover effects for overlays */
            .screenshot-overlay:hover rect {
                fill: #FF00FF;
                fill-opacity: 0.3;
                stroke: none;
                stroke-width: 0;
                transform: scale(1.05);
            }


            /* Footer - Compact */
            .footer {
                margin-top: var(--spacing-md); /* Reduced margin */
                padding: var(--spacing-xs) var(--spacing-md); /* More compact padding */
                background: linear-gradient(135deg, var(--color-primary-blue) 0%, var(--color-secondary-blue) 100%);
                border-radius: var(--border-radius-lg);
                text-align: center;
                color: var(--color-text-secondary);
                font-size: var(--font-size-small);
                line-height: 1.3; /* Slightly more line height for better readability in compact layout */
            }

            /* Focus management for better accessibility */
            .focusable {
                transition: outline var(--transition-fast);
            }

            .focusable:focus {
                outline: 2px solid var(--color-focus);
                outline-offset: 2px;
            }


            /* Z-index hierarchy for violations by severity */
            .screenshot-overlay.screenshot-overlay--critical {
                z-index: 1000000000;
            }
            .screenshot-overlay.screenshot-overlay--serious {
                z-index: 10000000;
            }
            .screenshot-overlay.screenshot-overlay--moderate {
                z-index: 100000;
            }
            .screenshot-overlay.screenshot-overlay--minor {
                z-index: 1000;
            }

            /* HTML violations always go to the back (lowest z-index) */
            .screenshot-overlay.screenshot-overlay--send-back {
                z-index: 1 !important;
            }

            /* Ensure overlays stay within image bounds */
            .screenshot-overlay-container {
                position: relative;
                display: block;
                width: 100%; !important
                height: 100%; !important
                overflow: hidden; /* Clip overlays to image bounds */
            }

             .screenshot-overlay {
                 position: absolute;
                 pointer-events: auto;
                 cursor: pointer;
                 transition: all var(--transition-fast);
                 border-radius: 10px;
                 z-index: 10;
                 /* Ensure overlays don't exceed container bounds */
                 max-width: 100%;
                 max-height: 100%;
                 box-sizing: border-box;
                 /* Minimum size for visibility - handled dynamically in JavaScript */
                 min-width: 4px;
                 min-height: 4px;
             }

            /* Mobile-specific overlay adjustments */
            @media (max-width: 768px) {
                .screenshot-overlay {
                    /* Mobile styling - sizes handled dynamically in JavaScript */
                    border-radius: 8px;
                }
            }

            @media (max-width: 480px) {
                .screenshot-overlay {
                    /* Small screen styling - sizes handled dynamically in JavaScript */
                    border-radius: 6px;
                }
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
                <h1 class="header" tabindex="-1">Wick-A11y Accessibility Report</h1>
                
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
                        <span>📊 Report Summary</span>
                        <span class="summary-wrapper__icon">▶</span>
                    </summary>
                    <div class="summary-grid">
                        <div class="summary-section">
                            <div class="summary-section__header" id="summary-heading">
                                <span>📋 Test Summary</span>
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
                                                ${help.context}
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
                                                ${help.runOnly}
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
                                                    ${help.rules}
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
                                                        ${help.impactSeverityDescription[impact]}
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
                        <div class="screenshot-overlay-container" id="screenshot-overlay-container">
                            <img 
                                src="${issuesScreenshotFilePath}" 
                                alt="Screenshot showing accessibility violations highlighted with colored borders based on severity level"
                                class="screenshot-image"
                                loading="lazy"
                                onload="initializeScreenshotOverlays()"
                            />
                            ${overlayData.map((overlay, index) => `
                                <div class=".focusable screenshot-overlay screenshot-overlay--${overlay.impact}${overlay.isHtmlTarget ? ' screenshot-overlay--send-back' : ''}" 
                                     style="
                                         width: ${overlay.width}px; 
                                         height: ${overlay.height}px; 
                                         top: ${overlay.top}px; 
                                         left: ${overlay.left}px;
                                     "
                                     data-overlay-index="${index}"
                                     data-impact="${overlay.impact}"
                                     data-original-width="${overlay.width}"
                                     data-original-height="${overlay.height}"
                                     data-original-top="${overlay.top}"
                                     data-original-left="${overlay.left}"
                                     role="button"
                                     tabindex="0"
                                     aria-label="Accessibility violation: ${overlay.impact} severity"
                                     onkeypress="handleOverlayKeyPress(event, ${index})"
                                     title="${overlay.tooltip.replace(/"/g, '&quot;').replace(/\n/g, '&#10;')}">
                                    <svg xmlns="http://www.w3.org/2000/svg">
                                        <rect x="0" y="0" rx="10" ry="10"></rect>
                                        <!-- <title>${overlay.tooltip.replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}</title> -->  
                                    </svg>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </section>
            </main>

            <!-- Scroll to Top Button -->
            <div class="scroll-to-top-container">
                <button type="button" class="control-button control-button--scroll-top" onclick="scrollToTop()" aria-label="Scroll to the top of the report">
                    <span class="control-button__icon">⬆️</span>
                    <span>Back to Top</span>
                </button>
            </div>

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

            function scrollToTop() {
                // Smooth scroll to top of the page
                window.scrollTo({
                    top: 0,
                    behavior: 'smooth'
                });
                
                // Enhanced focus management for WCAG AAA accessibility
                setTimeout(() => {
                    // Focus on the main header for screen reader users
                    const mainHeader = document.querySelector('.header');
                    if (mainHeader) {
                        mainHeader.focus({preventScroll: true});
                    }
                    
                    // Announce the arrival to screen readers
                    const announcement = document.createElement('div');
                    announcement.setAttribute('aria-live', 'polite');
                    announcement.setAttribute('aria-atomic', 'true');
                    announcement.textContent = 'Scrolled to the top of the accessibility report';
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

            // Interactive Screenshot Overlays Functions
            let overlayScaleFactor = 1;

            function initializeScreenshotOverlays() {
                const screenshotImage = document.querySelector('.screenshot-image');
                const overlayContainer = document.getElementById('screenshot-overlay-container');
                
                if (!screenshotImage || !overlayContainer) return;

                // Calculate scale factor when image loads/resizes
                function updateOverlayPositions() {
                    const naturalWidth = screenshotImage.naturalWidth;
                    const naturalHeight = screenshotImage.naturalHeight;
                    const containerWidth = screenshotImage.offsetWidth;
                    const containerHeight = screenshotImage.offsetHeight;
                    
                    if (!naturalWidth || !naturalHeight || !containerWidth || !containerHeight) return;
                    
                    // Calculate how the image is actually displayed within its container
                    const containerAspectRatio = containerWidth / containerHeight;
                    const imageAspectRatio = naturalWidth / naturalHeight;
                    
                    let actualImageWidth, actualImageHeight, offsetX, offsetY;
                    
                    if (containerAspectRatio > imageAspectRatio) {
                        // Image is letterboxed (black bars on left/right)
                        actualImageHeight = containerHeight;
                        actualImageWidth = actualImageHeight * imageAspectRatio;
                        offsetX = (containerWidth - actualImageWidth) / 2;
                        offsetY = 0;
                    } else {
                        // Image is pillarboxed (black bars on top/bottom)
                        actualImageWidth = containerWidth;
                        actualImageHeight = actualImageWidth / imageAspectRatio;
                        offsetX = 0;
                        offsetY = (containerHeight - actualImageHeight) / 2;
                    }
                    
                    // Calculate the uniform scale factor based on actual displayed image
                    overlayScaleFactor = actualImageWidth / naturalWidth;
                    
                    // Update all overlay positions and add event handlers
                    const overlays = overlayContainer.querySelectorAll('.screenshot-overlay');
                    overlays.forEach(overlay => {
                        // Add click event handlers for custom tooltips if not already added
                        if (!overlay._clickEventsAdded) {
                            // Click - toggle tooltip
                            overlay.addEventListener('click', function(e) {
                                e.preventDefault();
                                e.stopPropagation();
                                
                                // First, remove any existing tooltips from other overlays
                                const allOverlays = overlayContainer.querySelectorAll('.screenshot-overlay');
                                allOverlays.forEach(otherOverlay => {
                                    if (otherOverlay !== overlay && otherOverlay._customTooltipDiv) {
                                        removeTooltip(otherOverlay);
                                    }
                                });
                                
                                // Toggle tooltip for this overlay
                                if (overlay._customTooltipDiv && overlay._customTooltipDiv.parentNode) {
                                    // Tooltip is visible, hide it
                                    removeTooltip(overlay);
                                } else {
                                    // Show tooltip
                                    const tooltipText = overlay.getAttribute('data-original-title') || overlay.getAttribute('title');
                                    if (tooltipText) {
                                        showCustomTooltip(overlay, tooltipText);
                                    }
                                }
                            });

                            overlay._clickEventsAdded = true;
                        }

                        // Store original title and remove it to prevent native hover tooltips
                        if (overlay.hasAttribute('title') && !overlay.hasAttribute('data-original-title')) {
                            overlay.setAttribute('data-original-title', overlay.getAttribute('title'));
                            overlay.removeAttribute('title');
                        }
                        // Get original data attributes if available, fallback to style parsing
                        let originalWidth = parseFloat(overlay.dataset.originalWidth);
                        let originalHeight = parseFloat(overlay.dataset.originalHeight);
                        let originalTop = parseFloat(overlay.dataset.originalTop);
                        let originalLeft = parseFloat(overlay.dataset.originalLeft);
                        
                        // If data attributes don't exist, parse from style attribute
                        if (isNaN(originalWidth)) {
                            const originalStyle = overlay.getAttribute('style');
                            const widthMatch = originalStyle.match(/width: (\d+(?:\.\d+)?)px/);
                            const heightMatch = originalStyle.match(/height: (\d+(?:\.\d+)?)px/);
                            const topMatch = originalStyle.match(/top: (\d+(?:\.\d+)?)px/);
                            const leftMatch = originalStyle.match(/left: (\d+(?:\.\d+)?)px/);
                            
                            if (widthMatch && heightMatch && topMatch && leftMatch) {
                                originalWidth = parseFloat(widthMatch[1]);
                                originalHeight = parseFloat(heightMatch[1]);
                                originalTop = parseFloat(topMatch[1]);
                                originalLeft = parseFloat(leftMatch[1]);
                                
                                // Store for future use
                                overlay.dataset.originalWidth = originalWidth;
                                overlay.dataset.originalHeight = originalHeight;
                                overlay.dataset.originalTop = originalTop;
                                overlay.dataset.originalLeft = originalLeft;
                            }
                        }
                        
                         if (!isNaN(originalWidth)) {
                             // Calculate scaled dimensions relative to the natural image
                             // This maintains exact 1:1 correspondence with DOM element boundaries
                             const scaledWidth = originalWidth * overlayScaleFactor;
                             const scaledHeight = originalHeight * overlayScaleFactor;
                             const scaledTop = (originalTop * overlayScaleFactor) + offsetY;
                             const scaledLeft = (originalLeft * overlayScaleFactor) + offsetX;
                            
                             // Use exact DOM element dimensions for accurate representation
                             // Only apply minimal accessibility enhancements for truly microscopic elements
                             let finalWidth = scaledWidth;
                             let finalHeight = scaledHeight;
                             let adjustedLeft = scaledLeft;
                             let adjustedTop = scaledTop;
                             
                             // Only enlarge extremely small elements (< 3px) for basic visibility
                             // This preserves the exact DOM representation while ensuring visibility
                             const minVisibleSize = 3; // Minimum size for visibility
                             
                             if (scaledWidth < minVisibleSize) {
                                 finalWidth = minVisibleSize;
                                 adjustedLeft = scaledLeft - ((finalWidth - scaledWidth) / 2);
                             }
                             
                             if (scaledHeight < minVisibleSize) {
                                 finalHeight = minVisibleSize;
                                 adjustedTop = scaledTop - ((finalHeight - scaledHeight) / 2);
                             }
                            
                            // Ensure overlays stay within the actual image bounds (not container)
                            const imageLeft = offsetX;
                            const imageTop = offsetY;
                            const imageRight = offsetX + actualImageWidth;
                            const imageBottom = offsetY + actualImageHeight;
                            
                            const clampedLeft = Math.max(imageLeft, Math.min(adjustedLeft, imageRight - finalWidth));
                            const clampedTop = Math.max(imageTop, Math.min(adjustedTop, imageBottom - finalHeight));
                            const clampedWidth = Math.min(finalWidth, imageRight - clampedLeft);
                            const clampedHeight = Math.min(finalHeight, imageBottom - clampedTop);
                            
                            // Apply calculated values
                            overlay.style.width = Math.max(0, clampedWidth) + 'px';
                            overlay.style.height = Math.max(0, clampedHeight) + 'px';
                            overlay.style.top = clampedTop + 'px';
                            overlay.style.left = clampedLeft + 'px';
                            
                            // Check if overlay is within visible image area
                            const isWithinImageBounds = 
                                clampedLeft < imageRight && 
                                clampedTop < imageBottom &&
                                (clampedLeft + clampedWidth) > imageLeft && 
                                (clampedTop + clampedHeight) > imageTop;
                            
                             // Hide overlays that are completely outside bounds or too small to see
                             const isVisible = clampedWidth > 0 && clampedHeight > 0;
                             
                             if (!isWithinImageBounds || !isVisible) {
                                 overlay.style.display = 'none';
                                 overlay.setAttribute('aria-hidden', 'true');
                                 overlay.setAttribute('tabindex', '-1');
                             } else {
                                 overlay.style.display = 'block';
                                 overlay.removeAttribute('aria-hidden');
                                 overlay.setAttribute('tabindex', '0');
                             }
                        }
                    });
                }

                // Ensure overlay container matches image dimensions exactly
                function updateContainerSize() {
                    // Do not alter manually the dimension and let the browser do it

                    // if (!screenshotImage || !overlayContainer) return;
                    
                    // // Get the exact displayed dimensions of the image
                    // const containerWidth = screenshotImage.offsetWidth;
                    // const containerHeight = screenshotImage.offsetHeight;
                    
                    // // Set container dimensions to match image exactly
                    // overlayContainer.style.width = containerWidth + 'px';
                    // overlayContainer.style.height = containerHeight + 'px';
                    
                    // // Ensure container is positioned exactly over the image
                    // overlayContainer.style.position = 'relative';
                    // overlayContainer.style.display = 'block';
                    // overlayContainer.style.overflow = 'hidden';
                }

                // Combined update function with error handling
                function updateAll() {
                    try {
                        updateContainerSize();
                        // Small delay to ensure DOM updates are complete
                        requestAnimationFrame(() => {
                            updateOverlayPositions();
                        });
                    } catch (error) {
                        console.warn('Error updating screenshot overlays:', error);
                    }
                }

                // Debounced update function for performance
                let updateTimeout;
                function debouncedUpdate(delay = 16) {
                    clearTimeout(updateTimeout);
                    updateTimeout = setTimeout(updateAll, delay);
                }

                // Initialize when image is ready
                function initialize() {
                    if (screenshotImage.complete && screenshotImage.naturalWidth > 0) {
                        updateAll();
                    } else {
                        screenshotImage.addEventListener('load', updateAll, { once: true });
                    }
                }

                // Start initialization
                initialize();
                
                // Use ResizeObserver for better performance if available
                if (window.ResizeObserver) {
                    const resizeObserver = new ResizeObserver(() => {
                        debouncedUpdate(16);
                    });
                    resizeObserver.observe(screenshotImage);
                    resizeObserver.observe(overlayContainer);
                } else {
                    // Fallback to window resize event
                    window.addEventListener('resize', () => debouncedUpdate(50));
                }
                
                // Additional image load listener for dynamic content
                screenshotImage.addEventListener('load', updateAll);
                
                // Mobile-specific event handling
                let orientationChangeTimeout;
                
                // Handle orientation changes on mobile devices
                window.addEventListener('orientationchange', () => {
                    clearTimeout(orientationChangeTimeout);
                    orientationChangeTimeout = setTimeout(() => {
                        // Force a full update after orientation change
                        updateAll();
                    }, 300); // Allow time for orientation change to complete
                });
                
                // Enhanced resize handling with mobile considerations  
                window.addEventListener('resize', () => {
                    // Use shorter delay for mobile responsiveness
                    const delay = window.innerWidth <= 768 ? 16 : 50;
                    debouncedUpdate(delay);
                });
                
                // Handle viewport changes (mobile keyboard, scrolling, etc.)
                let viewportTimeout;
                window.addEventListener('scroll', () => {
                    clearTimeout(viewportTimeout);
                    viewportTimeout = setTimeout(() => {
                        // Only update container size on scroll for performance
                        updateContainerSize();
                    }, 16); // ~60fps
                });
                
                // Handle visibility changes (tab switching, etc.)
                document.addEventListener('visibilitychange', () => {
                    if (!document.hidden) {
                        // Re-validate when tab becomes visible
                        setTimeout(updateAll, 100);
                    }
                });

                // Global click handler to close tooltips when clicking outside overlays
                document.addEventListener('click', function(e) {
                    // Check if click was on an overlay or its children
                    const clickedOverlay = e.target.closest('.screenshot-overlay');
                    if (!clickedOverlay) {
                        // Click was outside all overlays, close any open tooltips
                        const allOverlays = overlayContainer.querySelectorAll('.screenshot-overlay');
                        allOverlays.forEach(overlay => {
                            if (overlay._customTooltipDiv) {
                                removeTooltip(overlay);
                            }
                        });
                    }
                });
            }

            // Helper function to show custom tooltip
            function showCustomTooltip(overlay, tooltipText) {
                const improvedTooltipText = tooltipText.replaceAll("•", "\u00A0\u00A0•");

                // Remove any existing tooltip for this overlay first
                removeTooltip(overlay);

                const tooltipDiv = document.createElement('div');
                tooltipDiv.className = 'custom-tooltip';

                // Add an anchor arrow for clarity
                const anchor = document.createElement('div');
                anchor.className = 'custom-tooltip-anchor';
                anchor.style.position = 'absolute';
                anchor.style.width = '0';
                anchor.style.height = '0';
                anchor.style.borderLeft = '8px solid transparent';
                anchor.style.borderRight = '8px solid transparent';
                anchor.style.zIndex = 1001;

                // Set tooltip text
                tooltipDiv.textContent = improvedTooltipText;

                // Basic styling for the tooltip
                tooltipDiv.style.position = 'absolute';
                tooltipDiv.style.zIndex = 1000;
                tooltipDiv.style.background = '#222';
                tooltipDiv.style.color = '#fff';
                tooltipDiv.style.padding = '12px 24px';
                tooltipDiv.style.borderRadius = '8px';
                tooltipDiv.style.fontSize = '13px';
                tooltipDiv.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
                tooltipDiv.style.pointerEvents = 'none';
                tooltipDiv.style.whiteSpace = 'pre-line';
                tooltipDiv.style.maxWidth = '500px';
                tooltipDiv.style.wordBreak = 'break-word';

                // Helper to position tooltip and anchor
                function positionTooltipAndAnchor() {
                    // Position the tooltip so it does NOT overlap the focus ring
                    // Place it above or below the overlay, offset by a few pixels, and anchor must point to the exact interactive element
                    const rect = overlay.getBoundingClientRect();
                    const scrollY = window.scrollY || window.pageYOffset;
                    const scrollX = window.scrollX || window.pageXOffset;
                    const tooltipMargin = 8; // space between overlay and tooltip

                    // Temporarily set visibility hidden to measure
                    tooltipDiv.style.visibility = 'hidden';
                    tooltipDiv.style.left = '0px';
                    tooltipDiv.style.top = '0px';
                    document.body.appendChild(tooltipDiv);
                    // Now we can measure the tooltip
                    const tooltipRect = tooltipDiv.getBoundingClientRect();
                    const tooltipWidth = tooltipRect.width;
                    const tooltipHeight = tooltipRect.height;
                    // Remove from DOM for now, will re-append after positioning
                    document.body.removeChild(tooltipDiv);
                    tooltipDiv.style.visibility = '';

                    // Calculate horizontal center of overlay
                    const overlayCenterX = rect.left + rect.width / 2 + scrollX;

                    // Default: show above
                    let top = rect.top + scrollY - tooltipHeight - tooltipMargin;
                    let showAbove = true;
                    if (top < scrollY) {
                        // Not enough space above, show below
                        top = rect.bottom + scrollY + tooltipMargin;
                        showAbove = false;
                    }

                    // Position tooltip horizontally so anchor points to overlay center
                    let left = overlayCenterX - tooltipWidth / 2;

                    // Clamp to viewport with 10px margin
                    const viewportWidth = window.innerWidth;
                    const minLeft = scrollX + 10;
                    const maxLeft = scrollX + viewportWidth - tooltipWidth - 10;
                    left = Math.max(minLeft, Math.min(left, maxLeft));

                    // Calculate anchor position relative to tooltip
                    const anchorLeft = overlayCenterX - left - 8; // 8px is half arrow width

                    // Position tooltip
                    tooltipDiv.style.top = top + 'px';
                    tooltipDiv.style.left = left + 'px';

                    // Position anchor
                    if (showAbove) {
                        anchor.style.borderTop = '8px solid #222';
                        anchor.style.borderBottom = 'none';
                        anchor.style.top = tooltipHeight + 'px';
                    } else {
                        anchor.style.borderBottom = '8px solid #222';
                        anchor.style.borderTop = 'none';
                        anchor.style.top = '-8px';
                    }
                    anchor.style.left = Math.max(0, Math.min(anchorLeft, tooltipWidth - 16)) + 'px';

                    // Append the anchor to tooltip
                    tooltipDiv.appendChild(anchor);

                    // Add to DOM
                    document.body.appendChild(tooltipDiv);
                }

                // Store tooltip reference
                overlay._customTooltipDiv = tooltipDiv;

                // Position and show tooltip
                positionTooltipAndAnchor();

                // Clean up function for removing the tooltip
                overlay._tooltipCleanup = function() {
                    if (tooltipDiv && tooltipDiv.parentNode) {
                        tooltipDiv.parentNode.removeChild(tooltipDiv);
                    }
                    overlay._customTooltipDiv = null;
                    overlay._tooltipCleanup = null;
                };
            }

            // Helper function to remove tooltip
            function removeTooltip(overlay) {
                if (overlay._customTooltipDiv && overlay._customTooltipDiv.parentNode) {
                    overlay._customTooltipDiv.parentNode.removeChild(overlay._customTooltipDiv);
                    overlay._customTooltipDiv = null;
                }
                if (overlay._tooltipCleanup) {
                    overlay._tooltipCleanup();
                    overlay._tooltipCleanup = null;
                }
            }

            function handleOverlayKeyPress(event, overlayIndex) {
                // Handle keyboard navigation for overlays
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();

                    // Announce overlay information for screen readers
                    const overlay = event.currentTarget;
                    const impact = overlay.getAttribute('data-impact');
                    const tooltipText = overlay.getAttribute('data-original-title') || overlay.getAttribute('title');

                    if (tooltipText) {
                        const improvedTooltipText = tooltipText.replaceAll("•", "\u00A0\u00A0•");

                        // Create announcement for screen readers
                        const announcement = document.createElement('div');
                        announcement.setAttribute('aria-live', 'polite');
                        announcement.setAttribute('aria-atomic', 'true');
                        announcement.textContent = 'Accessibility violation details: ' + improvedTooltipText;
                        announcement.style.position = 'absolute';
                        announcement.style.left = '-10000px';
                        announcement.style.width = '1px';
                        announcement.style.height = '1px';
                        announcement.style.overflow = 'hidden';

                        document.body.appendChild(announcement);
                        setTimeout(() => {
                            if (document.body.contains(announcement)) {
                                document.body.removeChild(announcement);
                            }
                        }, 1000);

                        // First, remove any existing tooltips from other overlays
                        const overlayContainer = document.getElementById('screenshot-overlay-container');
                        if (overlayContainer) {
                            const allOverlays = overlayContainer.querySelectorAll('.screenshot-overlay');
                            allOverlays.forEach(otherOverlay => {
                                if (otherOverlay !== overlay && otherOverlay._customTooltipDiv) {
                                    removeTooltip(otherOverlay);
                                }
                            });
                        }

                        // Toggle tooltip for this overlay
                        if (overlay._customTooltipDiv && overlay._customTooltipDiv.parentNode) {
                            // Tooltip is visible, hide it
                            removeTooltip(overlay);
                        } else {
                            // Show tooltip using the shared function
                            showCustomTooltip(overlay, tooltipText);

                            // Remove tooltip when overlay loses focus
                            overlay.addEventListener('blur', function removeTooltipOnBlur() {
                                removeTooltip(overlay);
                                overlay.removeEventListener('blur', removeTooltipOnBlur);
                            });
                        }








                    }
                }

                // Mobile-specific: Handle swipe-like gestures on focused overlays
                if ((event.key === 'ArrowLeft' || event.key === 'ArrowRight') && window.innerWidth <= 768) {
                    event.preventDefault();
                    const allOverlays = Array.from(document.querySelectorAll('.screenshot-overlay[tabindex="0"]'));
                    const currentIndex = allOverlays.indexOf(event.currentTarget);
                    let nextIndex;

                    if (event.key === 'ArrowRight') {
                        nextIndex = (currentIndex + 1) % allOverlays.length;
                    } else {
                        nextIndex = (currentIndex - 1 + allOverlays.length) % allOverlays.length;
                    }

                    if (allOverlays[nextIndex]) {
                        allOverlays[nextIndex].focus();
                    }
                }
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

