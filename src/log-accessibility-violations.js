/// <reference types="Cypress" />

const path = require('path');

let accessibilityContext
let accessibilityOptions
let impactStyling

//*******************************************************************************
// FOR MULTIPLE ATTEMPTS CASES
//*******************************************************************************

let reportIdGlobal = ''


//*******************************************************************************
// PUBLIC FUNCTIONS
//*******************************************************************************

/**
 * Logs the accessibility violations in Cypress Log and Browser Console.
 *
 * @param {Array} violations - The array of accessibility violations.
 * @returns {Array} - The sorted array of accessibility violations.
 */
export const logViolations = (violations) => {

    accessibilityContext = Cypress.env('accessibilityContext')
    accessibilityOptions = Cypress.env('accessibilityOptions') || {}
    impactStyling = Cypress._.merge({}, defaultImpactStyling, accessibilityOptions.impactStyling)

    // Sort the violations by severity
    const violationsSorted = violations.sort(sortValidationsBySeverity)

    // Log in the Cypress Log the accessibility violations
    recordViolations_CypressLog(violationsSorted)

    // Log in the Browser console the accessibility violations
    recordViolations_Console(violationsSorted)

    return violationsSorted
}

/**
 * Logs the accessibility violations in Cypress Log and Browser Console and generates an HTML report with them.
 * 
 * @param {Array} violations - The array of accessibility violations.
 */
export const logViolationsAndGenerateReport = (violations) => {
    // Log the accessibility violations in Cypress Log and the Browser Console
    const violationsSorted = logViolations(violations)

    // Get url of the page analysed to include in the report and create HTMLreport with the accessibility violations
    recordViolations_Report(violationsSorted)
}


//*******************************************************************************
// PRIVATE FUNCTIONS AND CONSTANTS
//*******************************************************************************

/**
 * The default folder path for storing accessibility reports.
 * @type {string}
 */
const defaultAccessibilityFolder =  'cypress/accessibility'

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
    serious:  { icon: '🟧', style: 'fill: #FFA66A; fill-opacity: 0; stroke: #FFA66A; stroke-width: 10;' },
    moderate: { icon: '🟨', style: 'fill: #ECDE05; fill-opacity: 0; stroke: #ECDE05; stroke-width: 10;' },
    minor:    { icon: '🟦', style: 'fill: #4598FF; fill-opacity: 0; stroke: #4598FF; stroke-width: 10;' },
    fixme:    { icon: '🛠️'}
}


const impactSeverityDescription = {
    critical: `A 'critical' accessibility violation represents a significant barrier that prevents users with disabilities
               from accessing core functionality or content.<br>For example, images must have alternate text (alt text) to
               ensure that visually impaired users can understand the content of the images through screen readers.
               Missing alt text on critical images can be a substantial obstacle to accessibility.`,
    serious:  `A 'serious' accessibility violation significantly degrades the user experience for individuals with disabilities
               but does not completely block access.<br>For instance, elements must meet minimum color contrast ratio thresholds.
               If text and background colors do not have sufficient contrast, users with visual impairments or color blindness may
               find it difficult to read the content.`,
    moderate: `A 'moderate' accessibility violation impacts the user experience but with less severe consequences.
               These issues can cause some confusion or inconvenience.<br>For example, all page content should be contained by landmarks.
               Properly defining landmarks (like header, main, nav) helps screen reader users to navigate and understand the structure
               of the page better.`,
    minor:    `A 'minor' accessibility violation has a minimal impact on accessibility. These issues are typically more related to best
               practices and can slightly inconvenience users.<br>For instance, the ARIA role should be appropriate for the element means
               that ARIA roles assigned to elements should match their purpose to avoid confusion for screen reader users, though it does
               not significantly hinder access if not perfectly used.`
}

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
 * Logs accessibility violations in the console.
 * @param {Array} violations - An array of accessibility violations.
 */
const recordViolations_Console = (violations) => {
    // Log in the console summary of violations
    const violationsSummary = `\n${'TEST RESULTS'} - Accessibility violations detected: ${violations.length}\n`
    cy.task('logViolationsSummary', violationsSummary)

    // Log in the console all the violations data
    const violationData = violations.map(({ id, impact, tags, description, nodes, help, helpUrl }) => ({
        //TOTAL: nodes.length,
        IMPACT: `${impactStyling[impact].icon} ${impact.toUpperCase()}`,
        RULEID: `${id} (${help})`,
        TAGS: `${tags.join(", ")}`,
        SELECTORS: `${nodes.map((node) => node.target).join(', ')}`,
        DESCRIPTION: `${description}`,
        MOREINFO: `${helpUrl}`,
    }))
    cy.task('logViolationsTable', violationData)
}

/**
 * Records the accessibility violations and generates an HTML report with the violations detected.
 * The report includes a screenshot of the page with the elements that have violations highlighted in different colors based on severity.
 *
 * @param {Array} violations - An array of accessibility violations.
 */
const recordViolations_Report = (violations) => {

    cy.url({ log: false }).then(url => {
        const day = new Date()
        const reportGeneratedOn  = day.toString()
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
            const fileBody = buildHtmlReportBody(violations, { testSpec, testName, url, reportGeneratedOn , issuesScreenshotFilePath })

            // Generate the HTML report
            const file = { folderPath: reportFolder, fileName: 'Accessibility Report.html', fileBody }
            cy.task('generateViolationsReport', file).then((result) => {
                console.log(result)
                cy.log(result)
            })
        })
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

    setViolationsHover('disabled')
    cy.screenshot(`${issuesFileNameOrigin}`, { capture: 'fullPage' })
    setViolationsHover('enabled')

    let subFolder = ''
    if (!Cypress.config('isInteractive')) {
        subFolder = `${Cypress.spec.name}/` // If executed in run mode it creates a folder with test name for the screenshots
    }

    const targetFileName = `${issuesFileNameTarget}${attemptSuffix}.png`

    const originFilePath = `${Cypress.config('screenshotsFolder')}/${subFolder}${issuesFileNameOrigin}${attemptSuffix}.png`
    const targetFilePath = `${reportFolder}/${targetFileName}`

    cy.task('moveScreenshotToFolder', { originFilePath, targetFilePath }).then((result) => {
        console.log(result)
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
 * @param {Array} violations - The array of accessibility violations.
 * @param {Object} options - The options for building the report body.
 * @param {string} options.testSpec - The test spec (test file).
 * @param {string} options.testName - The name of the test with the accessibility analysis is performed
 * @param {string} options.url - The URL of the page being tested.
 * @param {string} options.reportGeneratedOn - The date and time when the report was generated.
 * @param {string} options.issuesScreenshotFilePath - The file path of the screenshot showing the accessibility violations.
 * @returns {string} The HTML report body.
 */
const buildHtmlReportBody = (violations, { testSpec, testName, url, reportGeneratedOn, issuesScreenshotFilePath }) => {
    const fileBody = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Accessibility Report (Axe-core®)</title>
        <style>
            * {
                box-sizing: border-box;
            }

            #root,body,html {
                font-family: Arial, Helvetica, sans-serif;
                font-size: 0.95em;
            }

            .header {
                font-size: 2.3em;
            }

            /* Summary bubbles */
            .summary {
                font-size: 1.2em;
                line-height: 18px;               
            }

            .row {
                display: grid;
                grid-template-columns: 1fr 1fr;
                margin-bottom: 10px;

                padding-top: 5px;
            }

            /* Clear floats after the columns */
            .row:after {
                content: "";
                display: table;
                clear: both;
            }

            /* Create two equal columns that floats next to each other */
            .column {
                float: left;
                padding: 0px 10px;
                line-height: 100%;
                border-radius: 10px;
                margin: 0px 5px;
                word-break: break-word;
            }

            .single_column {
                /* Firefox */
                width: -moz-calc(100% - 10px);
                /* WebKit */
                width: -webkit-calc(100% - 10px);
                /* Opera */
                width: -o-calc(100% - 10px);
                /* Standard */
                width: calc(100% - 10px);

                margin-bottom: 12px;
            }

            /* List style */
            li { margin-bottom: 1rem; }

            /* Tooltip container */
            .tooltip {
                position: relative;
                display: inline-block;
                border-bottom: 1px dotted black; /* If you want dots under the hoverable text */
            }

            .tooltip:hover {
                /*position: relative;
                display: inline-block;*/
                border-bottom: 1px dotted #0000FF; /* If you want dots under the hoverable text */
                color: #0000FF;
            }

            /* Tooltip text */
            .summary .tooltip .tooltiptext {
                font-size: 0.75em;
                max-width: 600px
            }

            .tooltip .tooltiptext {
                visibility: hidden;

                /* Tooltip box */
                width: max-content !important;
                background-color: #555555;
                color: #fff;
                text-align: left;
                padding: 10px;
                border-radius: 6px;

                /* Position the tooltip text */
                position: absolute;
                z-index: 1;
                bottom: 125%;
                left: 50%;
                margin-left: -20px;

                /* Fade in tooltip */
                opacity: 0;
                transition: opacity 0.3s;
            }

            /* Tooltip arrow */
            .tooltip .tooltiptext::after {
                content: "";
                position: absolute;
                top: 100%;
                left: 20px;
                margin-left: -5px;
                border-width: 5px;
                border-style: solid;
                border-color: #555 transparent transparent transparent;
            }

            /* Show the tooltip text when you mouse over the tooltip container */
            .tooltip:hover .tooltiptext {
                visibility: visible;
                opacity: 1;
            }
                
            /* Screenshot image */
            .imagecontainer {
                display: flex;
                justify-content: center;
                margin-bottom: 20px;
            }
            
            .image {
                border: 2px solid;
                padding: 10px;
                box-shadow: 6px 4px 8px;
                border-radius: 8px;
            }

            /* Footer */
            .footer {
                text-align: center;
                margin: 10px 0px;
            }
        </style>
    </head>
    <body>
        <div role="main">
            <h1 class="header">Accessibility Report (Axe-core®)</h1>
            <hr/>

            <div class="row" role="region" aria-label="Main Summary">
                <div class="column" style="background-color:#cce6ff; height: 100%;"  aria-label="Test Summary">
                    <p class="summary"><strong>Spec: </strong>${escapeHTML(testSpec)}</p>
                    <p class="summary"><strong>Test: </strong>${escapeHTML(testName)}</p>
                    <p class="summary"><strong>Page URL: </strong>
                        <a href="${url}" target="_blank">${escapeHTML(url)}</a>
                    </p>
                    <p class="summary"><strong>Generated on: </strong>${reportGeneratedOn}</p>
                </div>
                <div class="column" style="background-color:#cce6ff; height: 100%;" aria-label="Violations Summary by Severity">
                    ${impactPriority.map((impact) => {
                        let totalIssues = 'n/a'
                        if (accessibilityOptions.includedImpacts.includes(impact)) {
                            totalIssues = getTotalIssues(violations, impact)
                        }
                        return `<p class="summary">${impactStyling[impact].icon} <strong>
                            <span aria="tooltip" class="tooltip">${impact.toUpperCase()}
                                <span class="tooltiptext">${impactSeverityDescription[impact]}</span>
                            </span>: </strong>${totalIssues}
                        </p>`
                    }).join('')}
                </div>
            </div>
            <div class="single_column column" style="background-color:#e6f3ff; height: 100%;" role="region" aria-label="Analysis Conditions Summary">
                <!-- Context -->
                <p class="summary"><strong>
                    <span aria="tooltip" class="tooltip">Context
                        <span class="tooltiptext">${contextHelp}</span>
                    </span>: </strong>${getHumanReadableFormat(accessibilityContext)}
                </p>

                <!-- Severity (runOnly) -->
                <p class="summary"><strong>
                    <span aria="tooltip" class="tooltip">Tags
                        <span class="tooltiptext">${runOnlyHelp}</span>
                    </span>: </strong>${accessibilityOptions.runOnly.join(', ')}
                </p>

                <!-- Rules -->
                ${accessibilityOptions.rules ?  
                    `<p class="summary"><strong>
                        <span aria="tooltip" class="tooltip">Rules
                            <span class="tooltiptext">${rulesHelp}</span>
                        </span>: </strong>${getHumanReadableFormat(accessibilityOptions.rules)}
                    </p>` : ''
                }
            </div>
            <hr/>
            <h2 role="heading" >Accessibility Violations Details</h2>
            <ul>
                ${violations
                        .map(
                            (violation) => `
                <li>
                    <strong>[${impactStyling[violation.impact].icon}${violation.impact.toUpperCase()}]: ${escapeHTML(violation.help.toUpperCase())}<i> (Rule ID: ${escapeHTML(violation.id)})</i></strong>
                    <a href="${violation.helpUrl}" target="_blank">More info</a>
                    <br>
                    <strong><p>Tags: ${violation.tags.join(", ")}</p></strong>
                    <ul>
                    ${violation.nodes.map((node) => `
                        <li>
                            (${impactStyling.fixme.icon}Fixme)▶ 
                            <div aria="tooltip" class="tooltip">${node.target}
                                <span class="tooltiptext">${getFailureSummaryTooltipHtml(node.failureSummary)}</span>
                            </div>
                        </li>`
                        ).join("")}
                    </ul>
                </li>`
                ).join("")}
            </ul>
            <hr/>

            <h2 role="heading" id="violations-screenshot">Accessibility Violations Screenshot</h2>
            <div role="img" aria-labelledby="violations-screenshot" class="imagecontainer">
                <img width="98%" class="image" src="${issuesScreenshotFilePath}" alt="Accessibility Violations Screenshot Colored by Severity" />
            </div>
            <hr/>

            <p class="footer">🎓 As per the axe-core® library: it can find on average 57% of WCAG issues automatically; it also only analyzes DOM elements that are visible in the browser viewport. Axe-core <https://github.com/dequelabs/axe-core> is a trademark of Deque
Systems, Inc <https://www.deque.com/>. in the US and other countries.</p>
        </div>
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
 * Returns the context parameter of the accessibility analysis as a string human-readable format.
 *
 * @param {Element|NodeList|Object|Array|String|null} context - The context parameter.
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


/**
 * Calculates the total number of issues for a specific impact level.
 *
 * @param {Array} violations - An array of accessibility violations.
 * @param {string} impact - The impact level to filter the violations.
 * @returns {number} - The total number of issues with the specified impact level.
 */
const getTotalIssues = (violations, impact) => {
    let count = 0
    violations.forEach((violation) => {
        if (violation.impact == impact) {
            count++
        }
    })
    return count
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
        fixme:target,
        impactIcon
    }

    const tooltip = document.createElementNS(namespaceURI, 'title');
    const tooltipMessage = getTooltipViolation(tooltipInfo)

    tooltip.innerHTML = tooltipMessage

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
 * @param {string} tooltipInfo.fixme - The target information for the violation.
 * @param {string} tooltipInfo.impactIcon - The icon representing the impact of the violation.
 * @returns {string} The tooltip violation message.
 */
const getTooltipViolation = ({ impact, description, help, failureSummary, html, fixme, impactIcon }) => {
    return `
💥 Impact ➜ ${impactIcon} ${impact.toUpperCase()}
💬 Help ➜ ${escapeHTML(help.toUpperCase())}
🏷️ Description ➜ ${escapeHTML(description)}
🛠️ Fixme ➜ ${fixme}
📃 Failure Summary ➜ ${getFailureSummaryTooltipScreen(failureSummary)}
`
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
 * Creates and appends CSS styles for violation elements based on their impact priority.
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


