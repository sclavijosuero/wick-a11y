import { defaultAccessibilityFolder, normalizeFileName } from '../cypress/support/utils'
import buildDetailedHtmlReportBody from './detailed-report'
import buildBasicHtmlReportBody from './basic-report'


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
                let fileBody = ''
                if (reportInfo.accessibilityOptions.generateReport === 'basic' ) {
                    fileBody = buildBasicHtmlReportBody(reportInfo, { testSpec, testName, url, reportGeneratedOn, issuesScreenshotFilePath, overlayData })
                } else {
                    // Default report is Detailed
                    fileBody = buildDetailedHtmlReportBody(reportInfo, { testSpec, testName, url, reportGeneratedOn, issuesScreenshotFilePath, overlayData })
                }

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
