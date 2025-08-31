/// <reference types="cypress" />

import * as accessibilityReport from './accessibility-report'
import * as accessibilityVoice from './accessibility-voice'


// Global variables to store the selected accessibility context and options
let accessibilityContext
let accessibilityOptions
let impactStyling


// Global variable to store the current test results
let testResults
// Global variable to store the current suite results after all te4sts are completed
let specResults


// PUBLIC FUNCTIONS
//*******************************************************************************

/**
 * Logs the accessibility violations in Cypress Log and Browser Console.
 *
 * @param {Array} violations - The array of accessibility violations.
 * @returns {Array} - The sorted array of accessibility violations.
 */
export const logViolations = (violations) => {
    // Log the accessibility violations in Cypress Log and the Browser Console
    recordViolations(violations, true)
}


/**
 * Logs the accessibility violations in Cypress Log and Browser Console and generates an HTML report with them.
 * 
 * @param {Array} violations - The array of accessibility violations.
 */
export const logViolationsAndGenerateReport = (violations) => {
    // Log the accessibility violations in Cypress Log and the Browser Console
    const violationsSorted = recordViolations(violations, false)

    // Log the accessibility violations in the HTML report
    recordViolations_Report(violationsSorted)

    // Log summary of violations at the end of the Cypress log if we are generating a report
    recordViolationsSummaryTotals_CypressLog(violationsSorted)
}


//*******************************************************************************
// PRIVATE FUNCTIONS AND CONSTANTS
//*******************************************************************************


/**
 * Array representing the priority levels of accessibility violations,
 * with the first element being the highest priority and the last element
 * being the lowest priority.
 * 
 * @type {string[]}
 */
const impactPriority = ['critical', 'serious', 'moderate', 'minor'];

/**
 * Object representing the dewfault impact styling for accessibility violations based in the severity level.
 * @typedef {Object} defaultImpactStyling
 * 
 * @property {Object} critical - The critical impact indicator.
 * @property {string} critical.icon - The icon for the critical impact indicator.
 * @property {string} critical.color - The color for the critical impact indicator.
 * @property {Object} serious - The serious impact indicator.
 * @property {string} serious.icon - The icon for the serious impact indicator.
 * @property {string} serious.color - The color for the serious impact indicator.
 * @property {Object} moderate - The moderate impact indicator.
 * @property {string} moderate.icon - The icon for the moderate impact indicator.
 * @property {string} moderate.color - The color for the moderate impact indicator.
 * @property {Object} minor - The minor impact indicator.
 * @property {string} minor.icon - The icon for the minor impact indicator.
 * @property {string} minor.color - The color for the minor impact indicator.
 * @property {Object} fixme - The fixme impact indicator.
 * @property {string} fixme.icon - The icon for the fixme impact indicator.
 */
const defaultImpactStyling = {
    critical: { icon: '🟥', style: 'fill: #DE071B; fill-opacity: 0; stroke: #DE071B; stroke-width: 10;' },
    serious: { icon: '🟧', style: 'fill: #FFA66A; fill-opacity: 0; stroke: #FFA66A; stroke-width: 10;' },
    moderate: { icon: '🟨', style: 'fill: #ECDE05; fill-opacity: 0; stroke: #ECDE05; stroke-width: 10;' },
    minor: { icon: '🟦', style: 'fill: #4598FF; fill-opacity: 0; stroke: #4598FF; stroke-width: 10;' },
    fixme: { icon: '🛠️' }
}

/**
 * Sorts the validations by severity.
 *
 * @param {Object} a - The first validation object.
 * @param {Object} b - The second validation object.
 * @returns {number} - The comparison result.
 */
const sortValidationsBySeverity = (a, b) => {
    let aIndex = impactPriority.indexOf(a.impact)
    let bIndex = impactPriority.indexOf(b.impact)
    if (aIndex > bIndex)
        return 1;
    if (aIndex < bIndex)
        return -1;
    return 0;
}

/**
 * Logs the accessibility violations in Cypress Log and Browser Console.
 *
 * @param {Array} violations - The array of accessibility violations.
 * @param {boolean} [logSummary=true] - Whether to log the summary of violations in Cypress log.
 * @returns {Array} - The sorted array of accessibility violations.
 */
const recordViolations = (violations, logSummary = true) => {
    // Retrieve the accessibility context and options
    accessibilityContext = Cypress.env('accessibilityContext')
    accessibilityOptions = Cypress.env('accessibilityOptions') || {}
    impactStyling = Cypress._.merge({}, defaultImpactStyling, accessibilityOptions.impactStyling)

    // Calculate the summary totals of violations by severity
    testResults = {
        testSummary: calculateViolationsSummaryBySeverity(violations),
        violations
    }

    // Sort the violations by severity
    const violationsSorted = violations.sort(sortValidationsBySeverity)

    // Log in the Cypress Log the accessibility violations
    recordViolations_CypressLog(violationsSorted)

    // Log in the Terminal the accessibility violations as a table
    recordViolations_Console(violationsSorted)

    // Log summary of violations at the end of the Cypress log if we are not generating a report
    if (logSummary) {
        recordViolationsSummaryTotals_CypressLog(violationsSorted)
    }

    return violationsSorted
}

/**
 * Calculates the summary of accessibility violations by severity.
 * 
 * @param {Array} violations - The array of accessibility violations.
 * @returns {Object} - The object containing the summary of violations by severity.
 */
const calculateViolationsSummaryBySeverity = (violations) => {
    let totals = {}
    impactPriority.forEach((impact) => {
        if (accessibilityOptions.includedImpacts && accessibilityOptions.includedImpacts.includes(impact)
            || accessibilityOptions.onlyWarnImpacts && accessibilityOptions.onlyWarnImpacts.includes(impact)) {
            totals[impact] = violations.filter(v => v.impact === impact).length
        }
    })
    return totals
}

/**
 * Records a summary of the accessibility violations by severity in the Cypress log.
 *
 * @param {Array} violations - An array of accessibility violations.
 */
const recordViolationsSummaryTotals_CypressLog = (violations) => {
    cy.then(() => {
        for (const [impact, totalPerImpact] of Object.entries(testResults.testSummary)) {
            let errorType = 'VIOLATIONS'
            if (accessibilityOptions.onlyWarnImpacts.includes(impact)) {
                errorType = 'WARNINGS'
            }

            Cypress.log({
                name: `• ${impact.toUpperCase()} ${errorType} ${impactStyling[impact].icon}:`,
                message: `${totalPerImpact}`,
                consoleProps: () => ({
                    total: totalPerImpact,
                    violations: violations.filter(v => v.impact === impact),
                })
            })
        }
        assertTestViolations(violations)
    })
}

const assertTestViolations = (violations) => {
    const { includedImpacts } = accessibilityOptions

    // Filter the violations based on the included impacts
    const includedViolations = violations.filter(v => includedImpacts.includes(v.impact))
    const numIncludedViolations = includedViolations.length

    assert.equal(numIncludedViolations, 0, `${numIncludedViolations} accessibility violation${violations.length === 1 ? '' : 's' 
        } ${numIncludedViolations === 1 ? 'was' : 'were'} detected with impact levels: [${includedImpacts.join(', ')}]`)
}

/**
 * Records accessibility violations in the Cypress log.
 *
 * @param {Array} violations - An array of accessibility violations.
 */
const recordViolations_CypressLog = (violations) => {
    cy.document().then(doc => {
        createViolationCssStyles(doc)

        const fixmeIcon = impactStyling.fixme.icon

        // Log violations in Cypress Log
        violations.forEach(violation => {
            const impact = violation.impact
            const impactIcon = impactStyling[impact].icon

            // nodes variable will store CSS selector for all the violation nodes (to highlight all of them when clicked the violation on the Cypress Log)
            const nodes = Cypress.$(violation.nodes.map((node) => node.target).join(','))

            // Log accessbility violation (impact) - Type of violation
            Cypress.log({
                name: `[${impactIcon}${impact.toUpperCase()}]`,
                message: `**${violation.help.toUpperCase()} _(Rule ID: ${violation.id})_.** [More info](${violation.helpUrl})`,
                $el: nodes,
                consoleProps: () => violation,
            })

            // Log all the individual violations (target) - Elements to fix
            violation.nodes.forEach(node => {
                const target = node.target // CSS selector (to highlight all of them when clicked the violation on the Cypress Log)
                const $elem = Cypress.$(target.join(','))

                // Log accessbility violation (for each HTML element
                Cypress.log({
                    name: `---(${fixmeIcon}Fixme)▶`,
                    $el: $elem,
                    message: target,
                    consoleProps: () => node,
                })

                // Flag the element with the violation in Cypress runner page
                flagViolationOnPage(doc, $elem[0], violation, node)
            })
        })
    })
}


/**
 * Logs accessibility violations in the terminal.
 * 
 * @param {Array} violations - An array of accessibility violations.
 */
const recordViolations_Console = (violations) => {
    // Log in the console summary of violations
    let violationsSummary = `\n************************ ACCESSIBILITY RESULTS FOR TEST "${Cypress.currentTest.title}"\n\n`
    for (const [impact, totalPerImpact] of Object.entries(testResults.testSummary)) {
        let errorType = 'VIOLATIONS'
        if (accessibilityOptions.onlyWarnImpacts.includes(impact)) {
            errorType = 'WARNINGS'
        }

        violationsSummary += `${impact.toUpperCase()} ${errorType}: ${totalPerImpact}\n`

    }
    cy.task('logViolationsSummary', violationsSummary)

    // Log in the console all the violations data
    const violationData = violations.map(({ id, impact, tags, description, nodes, help, helpUrl }) => ({
        //TOTAL: nodes.length,
        IMPACT: `${impact.toUpperCase()}`,
        RULEID: `${id} (${help})`,
        TAGS: `${tags.join(", ")}`,
        SELECTORS: `${nodes.map((node) => node.target).join(', ')}`,
        DESCRIPTION: `${description}`,
        MOREINFO: `${helpUrl}`,
    }))
    cy.task('logViolationsTable', violationData)
}

const recordViolations_Report = (violations) => {
    accessibilityReport.recordReportViolations(
        { testResults, violations, accessibilityContext, accessibilityOptions, impactStyling, impactPriority }
    )
}

/**
 * Returns a formatted tooltip for the failure summary on the Screen.
 *
 * @param {string} summary - The summary string to format.
 * @returns {string} The formatted tooltip string.
 */
const getFailureSummaryTooltipScreen = (summary) => {
    // return summary.split('\n').join('<br>&nbsp;&nbsp;&nbsp;- ')

    return summary.split('\n').map((line, index) => {
        if (/^Fix/.test(line)) {
            return line;
        }
        return `      • ${line}`
    }).join('\n')
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


/**
 * Highlights a violation by creating a div element with an SVG rectangle inside it.
 * The div element is positioned at the location of the specified element and is styled
 * with the specified color, and inserted with higher zIndex based on the impact level.
 *
 * @param {Document} doc - The document object.
 * @param {Element} elem - The element to highlight.
 * @param {Object} violation - The accessibility violation.
 * @param {Object} node - The node being processed for the violation.
 * @returns {HTMLDivElement} - The created div element.
 */
const flagViolationOnPage = (doc, elem, violation, node) => {
    const { impact, description, help } = violation
    const { failureSummary, html, target } = node
    const impactIcon = impactStyling[impact].icon

    // Get the bounding rectangle of the element
    const boundingRect = elem.getBoundingClientRect()

    // SVG Namespace
    const namespaceURI = 'http://www.w3.org/2000/svg'

    // DIV (wrapper to show in the right place the highlighted element when click in CY Log)
    const div = document.createElement(`div`)
    div.className = `${impact} severity${target.includes('html') ? ' send-back' : ''}`
    div.setAttribute('data-impact', impact)
    div.setAttribute('style', `width: ${boundingRect.width}px; height: ${boundingRect.height}px; top: ${boundingRect.y}px; left: ${boundingRect.x}px;`)

    // SVG
    const svg = document.createElementNS(namespaceURI, 'svg')

    // RECT
    const rect = document.createElementNS(namespaceURI, 'rect');
    rect.setAttribute('class', `enabled`)
    rect.setAttribute('x', '0')
    rect.setAttribute('y', '0')
    rect.setAttribute('rx', '10')
    rect.setAttribute('ry', '10')

    // TOOLTIP
    const tooltipInfo = {
        impact,  // E.g. 'serious'
        description,
        help,
        failureSummary,
        html,
        target,
        impactIcon
    }

    const tooltip = document.createElementNS(namespaceURI, 'title');
    const tooltipMessage = getTooltipViolation(tooltipInfo)
    tooltip.innerHTML = tooltipMessage

    if (mustEnableVoice()) {
        const messageToRead = accessibilityVoice.obtainDomElementViolationVoice(tooltipInfo)
        rect.addEventListener("click", (e) => {
            accessibilityVoice.readTooltipViolation(messageToRead)
        });
    }

    // Append DOM elements to the document
    rect.appendChild(tooltip);
    svg.appendChild(rect);
    div.appendChild(svg);
    doc.body.appendChild(div)

    return div
}


/**
 * Generates a tooltip violation message for the screen.
 *
 * @param {Object} tooltipInfo - The tooltip violation info.
 * @param {string} tooltipInfo.impact - The impact of the violation.
 * @param {string} tooltipInfo.description - The description of the violation.
 * @param {string} tooltipInfo.help - The help information for the violation.
 * @param {string} tooltipInfo.failureSummary - The failure summary of the violation.
 * @param {string} tooltipInfo.html - The HTML code related to the violation.
 * @param {string} tooltipInfo.target - The target information for the violation.
 * @param {string} tooltipInfo.impactIcon - The icon representing the impact of the violation.
 * @returns {string} The tooltip violation message.
 */
const getTooltipViolation = ({ impact, description, help, failureSummary, html, target, impactIcon }) => {
    return `
◼️ DOM element selector ➜ ${target}
◼️ Impact ➜ ${impactIcon} ${impact.toUpperCase()}
◼️ Help ➜ ${help.toUpperCase()}
◼️ Description ➜ ${description}
◼️ Failure Summary ➜ ${getFailureSummaryTooltipScreen(failureSummary)}
`
}

/**
 * Creates and appends CSS styles for violation elements based on their impact priority.
 * 
 * @param {Document} doc - The document object where the styles will be appended.
 */
const createViolationCssStyles = (doc) => {
    const styles = document.createElement('style')

    styles.textContent = impactPriority.map((impact, priority) => {
        const zIndex = 2147483647 - priority * 10
        const style = impactStyling[impact].style

        return `
            /* Violation style by severity */
            .${impact} {
                z-index: ${zIndex};
                position: absolute;
                margin: 0px;
                padding: 0px;
            }
            .${impact} rect {
                width: 100%;
                height: 100%;
                ${style}
            }
        `
    }).join(' ') + `
        .send-back {
            z-index: 2147482647 !important;
        }

        /* SVG everity */
        .severity svg {
            width: 100%;
            height: 100%;
        }
        /* Highlight sytyle when mouse over the violation */
        .severity rect.enabled:hover {
            fill: #FF00FF;
            fill-opacity: 0.3;
        }

        /* Disable highlight */
        .severity rect.disabled:hover {
            fill-opacity: 0;
        }

        /* CYPRESS CSS OVERRIDE - highlight to look same as rect:hover */
        [data-highlight-el] {
            z-index: 2147483597 !important;
            opacity: 0.4 !important;
        }
        [data-highlight-el] [data-layer] {
            z-index: 2147483597 !important;
            background-color: #FF00FF !important;
            opacity: 0.3 !important;
        }
        [data-highlight-el] [data-layer="Content"] {
            opacity: 0 !important;
        }
    `

    Cypress.$(doc.head).append(styles)
}


//*******************************************************************************
// HOOKS FOR ACCESSIBILITY VIOLATIONS VOICE MESSAGES
//*******************************************************************************

/**
 * Before all tests delete results of any previous run
 */
before(() => {
    // // Delete voice buttons for the previous runs
    accessibilityVoice.removeVoiceControls()

    if (mustEnableVoice()) {
        // Empty stored results in the first test of the suite
        if (cy.state().test.order === 1) {
            cy.task('emptySpecResults')
        }

        // Create event to stop voice when clicked in Aut Panel
        accessibilityVoice.createEventClickAutPanel()
    }
})

/**
 * Before each test start to run it cancels any voice message that might still being played and resets the test results for the next test to run
 */
Cypress.on('test:before:run', (testAttr, test) => {
    if (mustEnableVoice()) {
        accessibilityVoice.cancelVoice()
        testResults = {}
    }
})

/**
 * After running the last test create the voice controls
 */
Cypress.on('test:after:run', (testAttr, test) => {
    if (mustEnableVoice()) {
        const lastTest = test.order === Cypress.$('.test', window.top?.document).length
        if (lastTest) {
            // Last test in the suite

            if (specResults) {
                // Figure out number of pending tests (last piece missing) and complete the total count
                const pendingTests = Cypress.$('.runnable-pending', window.top?.document).length
                specResults.specSummary.pending = pendingTests
                specResults.specSummary.tests += pendingTests

                accessibilityVoice.createTestVoiceControlsInCypressLog(specResults)
                accessibilityVoice.captureEventsForCollapsibleElements(specResults)
            }
        }
    }
})

/**
 * After each test obtain the voice messages based in the test results, and save them for later use
 */
afterEach(() => {
    const test = cy.state().test

    const maxRetries = Cypress.config('retries').openMode || 0

    if (mustEnableVoice() && (test.state !== 'failed' || test.state === 'failed' && test._currentRetry === maxRetries)) {
        testResults.testTitle = test.title
        testResults.testState = test.state

        testResults.testSummaryVoice = accessibilityVoice.obtainTestSummaryVoiceMessage(testResults, test, accessibilityOptions)
        testResults.violationsResults = accessibilityVoice.obtainViolationsResultsVoiceMessage(testResults.violations)

        cy.task('saveTestResults', Cypress._.cloneDeep(testResults))
    }
})

/**
 * After all tests add the voice buttons styles to the page and retrieve the tests results for the whole suite
 */
after(() => {
    if (mustEnableVoice()) {
        accessibilityVoice.createVoiceCssStyles()

        cy.task('getSpecResults').then((theSpecResults) => {
            specResults = theSpecResults
        })
    }

})


/**
 * Determines if voice accessibility should be enabled.
 * @returns {boolean} - True if voice accessibility should be enabled, false otherwise.
 */
const mustEnableVoice = () => {
    return Cypress.config('isInteractive') && Cypress.env('enableAccessibilityVoice')
}
