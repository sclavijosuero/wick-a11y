/// <reference types="cypress" />

//*******************************************************************************
// FOR SPEECH SYNTHESIS
//*******************************************************************************

const wickVoice = window.speechSynthesis;


//*******************************************************************************
// PUBLIC FUNCTIONS FOR ACCESSIBILITY VIOLATIONS VOICE MESSAGES
//*******************************************************************************

export const cancelVoice = () => {
    wickVoice.cancel();
}

/**
 * @public
 * Creates an event handler for the click event on the "aut-panel" element capturing any existing click event.
 * Also cancels and resets all voice controls.
 */
export const createEventClickAutPanel = () => {
    const autPanel = Cypress.$('[data-cy="aut-panel"]', window.top?.document)[0]
    // At this moment aut-panel does not havew known click event, but we capture just in case it is added in the future
    const originalClickHandler = autPanel.onclick

    autPanel.onclick = (event) => {
        if (originalClickHandler) {
            // Call the original click handler if existed
            originalClickHandler(event);
        }
        cancelAndResetAllVoiceControls()
    }
}

/**
 * @public
 * Attaches event listeners to collapsible elements to capture click events and re-create voice controls when collapsed.
 * 
 * @returns {void}
 */
export const captureEventsForCollapsibleElements = (specResults) => {
    Cypress.$('main .collapsible-header', window.top?.document).each((index, collapsible) => {

        // Get the original click handler
        const originalClickHandler = collapsible.onclick

        collapsible.onclick = (event) => {
            if (originalClickHandler) {
                // Call the original click handler if existed
                originalClickHandler(event);
            }

            if (collapsible.getAttribute('aria-expanded') === 'false') {
                // Action of expand (before expanding is false, and at this point is not fully expanded yet)

                setTimeout(() => {
                    // Get tests in case the collapsible is a describe or context block
                    let $tests = Cypress.$(collapsible).parent().next().find('.runnable-title>span:nth-child(1)')

                    let $content = Cypress.$(collapsible).parent()

                    let attemptName
                    if ($content.hasClass('attempt-name')) {
                        attemptName = $content.text()
                    }

                    if ($tests.length === 0) {
                        // It's a test, an attempt, or another collapsible without tests
                        let $test

                        if (attemptName) {
                            // It's an attempt collapsible
                            $test = Cypress.$(collapsible).closest('.runnable').find('.runnable-wrapper')

                        } else {
                            // It's a test, or another collapsible without tests
                            $test = Cypress.$(collapsible)
                        }

                        $test = $test.find('.runnable-title>span:nth-child(1)')
                        const testTitle = $test.text()

                        const skipVoiceForTestHeader = testTitle ? true : false // We are expanding already a test so skip the voice buttons for the test header

                        createTestVoiceControlsInCypressLog(specResults, testTitle, skipVoiceForTestHeader, attemptName)
                    } else {
                        // It is a describe or context block with tests inside
                        $tests.each((index, test) => {
                            const testTitle = Cypress.$(test).text()
                            createTestVoiceControlsInCypressLog(specResults, testTitle)
                        })
                    }
                }, 250); // Give some time to the UI component to create and render the childern elements (childern contexts and tests)
            } else {
                // Action of colapse (before colapsing, it  is true, and at this point is not fully ecollapsed yet)
                const doc = window.top?.document

                // Cancel any previous voice message
                cancelVoice()

                // Hide any other voice buttons that is not Play from other voice groups
                // (this is for the case when a voice message is playing and the user clicks play on a different voice message)
                Cypress.$(`.voice-play`, doc).removeClass('voice-hidden')
                Cypress.$(`.voice-pause, .voice-resume, .voice-stop`, doc).addClass('voice-hidden')
            }
        }
    })
}

/**
 * @public
 * Creates test voice controls in Cypress log.
 * 
 * @param {string} testTitle - The title of the test.
 * @param {boolean} [skipVoiceForTestHeader=false] - Whether to skip voice for test header.
 */
export const createTestVoiceControlsInCypressLog = (specResults, testTitle, skipVoiceForTestHeader = false, attemptName) => {

    if (!testTitle) {
        // First time after test run completed

        // Spec Name
        specResults.specName = Cypress.spec.name

        // Get spec summary voice message
        specResults.specSummaryVoice = obtainSpecSummaryVoiceMessage(specResults)

        const $specElement = findSpecElement();
        createVoiceButtons($specElement, '.spec-summary-voice-control', specResults.specSummaryVoice)

        for (const [testTitle, testResults] of Object.entries(specResults.testsResults)) {
            createVoiceControlsForTest(testResults)
        }
    } else {
        // After an expand/collapse event
        const testResults = specResults.testsResults[testTitle]

        if (testResults) {
            createVoiceControlsForTest(testResults, skipVoiceForTestHeader, attemptName)
        }

    }
}

/**
 * @public
 * Generates a voice message summarizing the test results at the Test level (passed/failed/pending/etc.).
 *
 * @param {Object} test - The test object containing the test results.
 * @returns {string} - The voice message summarizing the test results.
 */
export const obtainTestSummaryVoiceMessage = (testResults, test, accessibilityOptions) => {
    const attempts = test._currentRetry > 0 ? ` after ${test._currentRetry + 1} attempts` : ''

    let numViolationsIncludedImpacts = 0
    let numViolationsOnlyWarnImpacts = 0

    if (accessibilityOptions) {
        numViolationsIncludedImpacts = accessibilityOptions.includedImpacts.reduce((total, impact) => {
            return total + ((testResults.testSummary && testResults.testSummary[impact] != null) ? testResults.testSummary[impact] : 0);
        }, 0);

        numViolationsOnlyWarnImpacts = accessibilityOptions.onlyWarnImpacts.reduce((total, impact) => {
            return total + ((testResults.testSummary && testResults.testSummary[impact] != null) ? testResults.testSummary[impact] : 0);
        }, 0);
    }

    const title = testResults.testTitle
    if (testResults.testState === 'passed') {
        // Passed
        if (numViolationsOnlyWarnImpacts) {
            // Passed with accessibility warnings
            const warningList = listOfWarningSeverities(accessibilityOptions)
            return `The test with name. ${title}, passed ${attempts} with ${numViolationsOnlyWarnImpacts} accessibility warnings for ${pluralizedWord('severity', warningList.length)}: ${warningList}.`
        } else {
            return `The test with name. ${title}, passed ${attempts} with no accessibility violations or any other errors.`
        }
    } else if (testResults.testState === 'skipped') {
        // Skipped
        return `The test with name. ${title}, was skipped because some error occurred.`
    } else if (testResults.testState === 'failed') {
        // Failed
        if ((numViolationsIncludedImpacts === 0)) {
            // It has no accessibility violations
            let error = `The test with name, ${title}, failed ${attempts} for reasons other than accessibility violations. Failure cause: ${test.err.message}.`
            if (numViolationsOnlyWarnImpacts !== 0) {
                // But it has also accessibility warnings
                const warningList = listOfWarningSeverities(accessibilityOptions)
                error += ` Also ${numViolationsOnlyWarnImpacts} accessibility warnings ${pluralizedWord('was', numViolationsOnlyWarnImpacts)} detected for ${pluralizedWord('severity', warningList.length)}: ${warningList}.`
            }
            return error
        } else if ((numViolationsIncludedImpacts !== 0)) {
            // It has accessibility violations
            let error = `The test with name, ${title}, failed ${attempts} because ${numViolationsIncludedImpacts} accessibility violations ${pluralizedWord('was', numViolationsIncludedImpacts)} detected: `
            for (const [impact, totalPerImpact] of Object.entries(testResults.testSummary)) {
                if (accessibilityOptions.includedImpacts.includes(impact)) {
                    error += `${totalPerImpact} ${impact} ${pluralizedWord('violation', totalPerImpact)}!`
                }
            }
            if (numViolationsOnlyWarnImpacts !== 0) {
                // It has alsoaccessibility warnings
                const warningList = listOfWarningSeverities(accessibilityOptions)
                error += ` Also ${numViolationsOnlyWarnImpacts} accessibility warnings ${pluralizedWord('was', numViolationsOnlyWarnImpacts)} detected for ${pluralizedWord('severity', warningList.length)}: ${warningList}.`
            }
            return error
        }
    } else {
        // Some other error
        return `The test with name, ${title}, failed ${attempts} for some reason.`
    }
}

/**
 * Formats the warning severities from the given accessibility options.
 *
 * @param {Object} accessibilityOptions - The accessibility options object.
 * @param {Array<string>} accessibilityOptions.onlyWarnImpacts - An array of warning severities.
 * @returns {string} A string of warning severities joined by commas, with the last comma replaced by 'or'.
 */
const listOfWarningSeverities = (accessibilityOptions) => {
    return accessibilityOptions.onlyWarnImpacts.join(', ').replace(/, ([^,]*)$/, ' or $1');
}

/**
 * @public
 * Generate a voice message with the accessibility violations summary at the Violation level, calling also function to do at the DOM Element level.
 * 
 * @param {Array} violations - An array of accessibility violations.
 * @returns {Object} - The results of the accessibility violations.
 */
export const obtainViolationsResultsVoiceMessage = (violations = []) => {
    let violationsResults = {}

    violations.forEach((violation) => {
        const impact = violation.impact
        const help = violation.help
        const description = violation.description

        const violationName = `${impact} violation: ${help}`
        const numNodes = violation.nodes.length

        violationsResults[violationName.toUpperCase()] = {
            violationImpact: impact,
            violationHelp: help,
            violationSummary: { numNodes },
            violationSummaryVoice:
                `${numNodes} Document Object Model ${pluralizedWord('element', numNodes)} ${pluralizedWord('was', numNodes)} found with the ${impact} violation: ` +
                `${help}. ${description}.`,
            nodes: obtainNodesResultsVoiceMessage(violation.nodes, impact, help, description)
        }
    })

    return violationsResults
}

/**
 * @public
 * Generate a voice message with the details of the accessibility violation of a Document Object Model.
 *
 * @param {Object} options - The options for obtaining the violation voice.
 * @param {string} options.target - The selector of the DOM element.
 * @param {string} options.impact - The impact of the violation.
 * @param {string} options.help - The help for resolving the violation.
 * @param {string} options.description - The description of the violation.
 * @param {string} options.failureSummary - The failure summary of the violation.
 * @returns {string} - The string representing the accessibility violation.
 */
export const obtainDomElementViolationVoice = ({ target, impact, help, description, failureSummary }) => {
    return `The Document Object Model element with selector, "${target}", was found with the ${impact} violation: ${help}. ` +
        `${description}. ${failureSummary}.`
}


/**
 * @public
 * Reads the a tooltip violation using text-to-speech.
 *
 * @param {string} text - The text to be read as a tooltip violation.
 */
export const readTooltipViolation = (text) => {
    cancelAndResetAllVoiceControls()

    const message = new SpeechSynthesisUtterance(text)
    wickVoice.speak(message);
}

/**
 * Removes any voice controls that might exist in the Cypress log.
 */
export const removeVoiceControls = () => {
    // Delete spec summary voice buttons for the previous run
    Cypress.$('.spec-summary-voice-control', window.top?.document).remove()
}

/**
 * @public
 * Creates and appends CSS styles for voice buttons.
 */
export const createVoiceCssStyles = () => {
    const styles = `
        .spec-summary-voice-control {
            float: right;
            line-height: 16px;
            padding: 2px 6px;
        }

        .voice-button {
            margin-left: 12px;
        }
        
        .voice-hidden {
            display: none !important;
        }
    `

    // Append the styles to the document head only once
    const $head = Cypress.$(window.top?.document.head)
    const hasVoiceStyles = $head.find("#voiceStyles");
    if (!hasVoiceStyles.length) {
        const $voiceStyles = Cypress.$(`<style id="voiceStyles">${styles}</style>`)
        $head.append($voiceStyles)
    }
}


//*******************************************************************************
// PRIVATE FUNCTIONS FOR ACCESSIBILITY VIOLATIONS VOICE MESSAGES
//*******************************************************************************

/**
 * Returns a voice message summarizing the results of all the tests run in the spec.
 *
 * @returns {string} The voice message summarizing the spec results.
 */
const obtainSpecSummaryVoiceMessage = (specResults) => {
    const summary = specResults.specSummary

    return `
        The spec with name ${specResults.specName} ran ${summary.tests} ${pluralizedWord('test', summary.tests)} in total:
        ${summary.passed} ${pluralizedWord('test', summary.tests)} passed,
        ${summary.failedAccessibility} ${pluralizedWord('test', summary.tests)} failed due accessibility errors,
        ${summary.failed} ${pluralizedWord('test', summary.tests)} failed for other reasons,
        ${summary.pending + summary.skipped} ${pluralizedWord('test', summary.tests)} skipped or pending,
    `
}


/**
 * Generate a voice message with the accessibility violations details for each node.
 *
 * @param {Array} nodes - The array of nodes to process.
 * @param {string} impact - The impact of the violation.
 * @param {string} help - The help message for the violation.
 * @param {string} description - The description of the violation.
 * @returns {Object} - An object containing the results of accessibility violations for each node.
 */
const obtainNodesResultsVoiceMessage = (nodes, impact, help, description) => {
    let nodesResults = {}

    nodes.forEach((node, index) => {
        const target = node.target[0]
        const failureSummary = node.failureSummary

        nodesResults[target] = {
            nodeName: target,
            nodeSummaryVoice: obtainDomElementViolationVoice({ target, impact, help, description, failureSummary }),
        }
    })

    return nodesResults
}


/**
 * Creates voice controls for a test based on the provided test results.
 * 
 * @param {Object} testResults - The test results object.
 * @param {boolean} [skipVoiceForTestHeader=false] - Whether to skip creating voice buttons for the test header.
 */
const createVoiceControlsForTest = (testResults, skipVoiceForTestHeader = false, attemptName) => {
    // Get test information
    const testTitle = testResults.testTitle;
    const testSummaryVoice = testResults.testSummaryVoice;

    // Find test within Cypress Log
    let $testElement = findTestElement(testTitle);
    if (attemptName) {
        $testElement = $testElement.closest('.runnable').find(`.attempt-name:contains("${attemptName}")`).find('.attempt-tag')
    }

    if ($testElement.length === 1) { // This is a '.runnable-title' element (immediate sibilings are '.runnable-controls')
        // Create voice buttons for Test
        if (!skipVoiceForTestHeader) {
            createVoiceButtons($testElement, '.runnable-controls', testSummaryVoice)
        }

        if ($testElement.length !== 0) {
            // Process all the Violations for each test
            for (const [violationName, violationInfo] of Object.entries(testResults.violationsResults)) {
                // Get violation information
                const violationSummaryVoice = violationInfo.violationSummaryVoice
                const numNodes = violationInfo.violationSummary.numNodes
                const nodes = violationInfo.nodes

                // Find violation for the test within the Cypress Log
                const $violationElements = findViolationElement($testElement, violationInfo.violationImpact, violationInfo.violationHelp)

                $violationElements.each((index, elem) => {
                    // This is a '.command-info' element (immediate sibilings are '.command-controls')

                    const $violationElement = Cypress.$(elem)

                    // Create voice buttons for Test
                    createVoiceButtons($violationElement, '.command-controls', violationSummaryVoice)

                    // Process all the Nodes affected (DOM Elements) for each violation
                    let $nodeLI = $violationElement.closest('li') // <li> for the violation
                    for (let i = 0; i < numNodes; i++) {
                        $nodeLI = $nodeLI.next() // <li> for the node

                        // Find node for the violation within the Cypress Log
                        const $nodeElement = findNodeElement($nodeLI)
                        if ($nodeElement.length === 1) {  // This is a '.command-info' element (immediate sibilings are '.command-controls')
                            const selector = $nodeElement.find('.command-message-text').text()
                            const violationSummaryVoice = nodes[selector].nodeSummaryVoice

                            createVoiceButtons($nodeElement, '.command-controls', violationSummaryVoice)
                        }
                    }
                })
            }
        }
    }
}


/**
 * Finds the DOM element in the Cypress Log for the specfile.
 * 
 * @returns {jQuery} The jQuery object representing the found element.
 */
const findSpecElement = () => {
    return Cypress.$('.runnable-header .duration', window.top?.document)
}

/**
 * Finds a test in the Cypress Log based on the provided test title.
 * 
 * @param {string} testTitle - The title of the test to search for.
 * @returns {jQuery} - A jQuery object representing the found DOM element for that test in the Cypress log.
 */
const findTestElement = (testTitle) => {
    // Returns a jquery object for an element of type test that has a class '.runnable-title' (the immediate sibilings are '.runnable-controls')
    return Cypress.$(`.test.runnable .runnable-title span:contains("${testTitle}")`, window.top?.document).filter((index, elem) => {
        // Test title name must exact match
        return Cypress.$(elem).text() === testTitle ? true : false;
    }).parent()
}

/**
 * Finds a violation element based on the provided parameters.
 *
 * @param {jQuery} $testElement - The jQuery object representing the DOM element for the test.
 * @param {string} impact - The impact of the violation.
 * @param {string} help - The help message of the violation.
 * @returns {jQuery} - A jQuery object representing the found DOM element for that violation in the Cypress log.
 */
const findViolationElement = ($testElement, impact, help) => {
    // Returns a jquery object for an element of type violation that has a class '.command-info' (the immediate sibilings are '.command-controls')
    return $testElement.closest('li').find(`li span.command-info`).filter((index, elem) => {
        const $elem = Cypress.$(elem);
        return $elem.find(`.command-method span:contains("${impact.toUpperCase()}")`).length === 1 &&
            $elem.find(`.command-message-text:contains("${help.toUpperCase()}")`).length === 1
            ? true : false;
    })
}

/**
 * Finds a DOM element based on the provided parameters.
 *
 * @param {jQuery} $nodeLI - The jQuery object representing the DOM element for the <li> tag with the list of nodes affected by the current processed violation.
 * @returns {jQuery} - A jQuery object representing the found DOM element for that node in the Cypress log.
 */
const findNodeElement = ($nodeLI) => {
    // Returns a object element of type node for an element with class '.command-info' (the immediate sibilings are '.command-controls')
    return $nodeLI.find(`span.command-info`)
}



/**
 * Represents the SVGs for the Play, Pause, Resume and Stop voice buttons.
 *
 * @type {string}
 */
const playSvg = `<svg width="16px" height="16px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M21.4086 9.35258C23.5305 10.5065 23.5305 13.4935 21.4086 14.6474L8.59662 21.6145C6.53435 22.736 4 21.2763 4 18.9671L4 5.0329C4 2.72368 6.53435 1.26402 8.59661 2.38548L21.4086 9.35258Z" fill="#51ac10"/>
</svg>`
const pauseSvg = `<svg width="16px" height="16px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M2 6C2 4.11438 2 3.17157 2.58579 2.58579C3.17157 2 4.11438 2 6 2C7.88562 2 8.82843 2 9.41421 2.58579C10 3.17157 10 4.11438 10 6V18C10 19.8856 10 20.8284 9.41421 21.4142C8.82843 22 7.88562 22 6 22C4.11438 22 3.17157 22 2.58579 21.4142C2 20.8284 2 19.8856 2 18V6Z" fill="#ebf635"/>
<path d="M14 6C14 4.11438 14 3.17157 14.5858 2.58579C15.1716 2 16.1144 2 18 2C19.8856 2 20.8284 2 21.4142 2.58579C22 3.17157 22 4.11438 22 6V18C22 19.8856 22 20.8284 21.4142 21.4142C20.8284 22 19.8856 22 18 22C16.1144 22 15.1716 22 14.5858 21.4142C14 20.8284 14 19.8856 14 18V6Z" fill="#ebf635"/>
</svg>`
const resumeSvg = `<svg width="16px" height="16px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path fill-rule="evenodd" clip-rule="evenodd" d="M10.2929 1.29289C10.6834 0.902369 11.3166 0.902369 11.7071 1.29289L14.7071 4.29289C14.8946 4.48043 15 4.73478 15 5C15 5.26522 14.8946 5.51957 14.7071 5.70711L11.7071 8.70711C11.3166 9.09763 10.6834 9.09763 10.2929 8.70711C9.90237 8.31658 9.90237 7.68342 10.2929 7.29289L11.573 6.01281C7.90584 6.23349 5 9.2774 5 13C5 16.866 8.13401 20 12 20C15.866 20 19 16.866 19 13C19 12.4477 19.4477 12 20 12C20.5523 12 21 12.4477 21 13C21 17.9706 16.9706 22 12 22C7.02944 22 3 17.9706 3 13C3 8.16524 6.81226 4.22089 11.5947 4.00896L10.2929 2.70711C9.90237 2.31658 9.90237 1.68342 10.2929 1.29289Z" fill="#278fee"/>
</svg>`
const stopSvg = `<svg width="16px" height="16px" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
<path d="M2 12C2 7.28595 2 4.92893 3.46447 3.46447C4.92893 2 7.28595 2 12 2C16.714 2 19.0711 2 20.5355 3.46447C22 4.92893 22 7.28595 22 12C22 16.714 22 19.0711 20.5355 20.5355C19.0711 22 16.714 22 12 22C7.28595 22 4.92893 22 3.46447 20.5355C2 19.0711 2 16.714 2 12Z" fill="#dddddd"/>
</svg>`


/**
 * Creates voice buttons for controlling voice messages.
 * 
 * @param {jQuery} $element - The element to which the voice buttons will be appended.
 * @param {string} controlsSelector - The selector for finding the placeholder for controls.
 * @param {string} testSummaryVoice - The voice message to be played.
 */
const createVoiceButtons = ($element, controlsSelector, testSummaryVoice) => {
    // Obtain place holder for controls and create if does not exist
    let $controls = $element.siblings(controlsSelector)
    if ($controls.length === 0) {
        // Create controls
        $controls = Cypress.$(`<span class="${controlsSelector.replace('.', '')}"></span>`)
        $element.after($controls)
    }

    const voiceGroupId = Cypress._.uniqueId()
    const playButton = `<span data-voice-group="${voiceGroupId}" class="voice-button voice-play" role="button" title="Play result"><span>${playSvg}</span></span>`
    const pauseButton = `<span data-voice-group="${voiceGroupId}" class="voice-button voice-pause voice-hidden" role="button" title="Pause result"><span>${pauseSvg}</span></span>`
    const resumeButton = `<span data-voice-group="${voiceGroupId}" class="voice-button voice-resume voice-hidden" role="button" title="Resume result"><span>${resumeSvg}</span></span>`
    const stopButton = `<span data-voice-group="${voiceGroupId}" class="voice-button voice-stop voice-hidden" role="button" title="Stop result"><span>${stopSvg}</span></span>`


    const $play = Cypress.$(playButton).on('click', (e) => { playVoiceMessage(e, voiceGroupId, testSummaryVoice) })
    const $pause = Cypress.$(pauseButton).on('click', (e) => { pauseVoiceMessage(e, voiceGroupId) })
    const $resume = Cypress.$(resumeButton).on('click', (e) => { resumeVoiceMessage(e, voiceGroupId) })
    const $stop = Cypress.$(stopButton).on('click', (e) => { stopVoiceMessage(e, voiceGroupId) })

    $controls.append($play, $pause, $resume, $stop)
}

/**
 * Cancels any previous voice message and resets the voice controls.
 */
const cancelAndResetAllVoiceControls = () => {
    const doc = window.top?.document

    // Cancel any previous voice message
    cancelVoice()

    // Enable all play buttons
    Cypress.$(`.voice-play`, doc).removeClass('voice-hidden')
    // Dibable all pause, resume, stop buttons
    Cypress.$(`.voice-pause, .voice-resume, .voice-stop`, doc).addClass('voice-hidden')
}


/**
 * For the provided voice group resets the voice controls to show the ones that match the enabledSelector parameter.
 * 
 * @param {string} voiceGroupId - The ID of the voice group.
 * @param {string} enabledSelector - The selector for voice controls to enable.
 * @param {Document} doc - The document object.
 */
const setGroupVoiceControls = (voiceGroupId, enabledSelector) => {
    const doc = window.top?.document

    const $voiceGroup = Cypress.$(`[data-voice-group="${voiceGroupId}"]`, doc)

    // Hide all voice buttons
    $voiceGroup.addClass('voice-hidden')
    // Show only the voice buttons that must be enabled
    $voiceGroup.filter(enabledSelector).removeClass('voice-hidden')
}

/**
 * Play the voice message and resets the controls accordingly.
 * 
 * @param {Event} e - The event object.
 * @param {Document} doc - The document object.
 * @param {string} voiceGroupId - The ID of the voice group.
 * @param {string} voiceMessage - Voice message to play.
 */
const playVoiceMessage = (e, voiceGroupId, voiceMessage,) => {
    // Prevent the event from bubbling up the DOM tree
    e.stopPropagation()

    // Cancel any previous voice message
    cancelAndResetAllVoiceControls()

    // Reset the controls to show the Pause and Stop buttons
    setGroupVoiceControls(voiceGroupId, `.voice-pause, .voice-stop`)

    // Create a new voice message
    const speechMessage = new SpeechSynthesisUtterance(voiceMessage)
    speechMessage.onend = (event) => {
        // When the voice message ends, reset the controls to show the Play button
        setGroupVoiceControls(voiceGroupId, `.voice-play`)
    }

    // Play the voice message
    wickVoice.speak(speechMessage)
}

/**
 * Pause the voice message and resets the controls accordingly.
 * 
 * @param {Event} e - The event object.
 * @param {Document} doc - The document object.
 * @param {string} voiceGroupId - The ID of the voice group.
 */
const pauseVoiceMessage = (e, voiceGroupId) => {
    // Prevent the event from bubbling up the DOM tree
    e.stopPropagation()

    // Pause the voice message
    wickVoice.pause()

    // Reset the controls to show the Resume and Stop buttons
    setGroupVoiceControls(voiceGroupId, `.voice-resume, .voice-stop`)
}

/**
 * Resume the voice message and resets the controls accordingly.
 * 
 * @param {Event} e - The event object.
 * @param {Document} doc - The document object.
 * @param {string} voiceGroupId - The ID of the voice group.
 */
const resumeVoiceMessage = (e, voiceGroupId) => {
    // Prevent the event from bubbling up the DOM tree
    e.stopPropagation()

    // Resume the voice message
    wickVoice.resume()

    // Reset the controls to show the Pause and Stop buttons
    setGroupVoiceControls(voiceGroupId, `.voice-pause, .voice-stop`)
}

/**
 * Stops the voice message and resets the controls accordingly.
 * 
 * @param {Event} e - The event object.
 * @param {Document} doc - The document object.
 * @param {string} voiceGroupId - The ID of the voice group.
 */
const stopVoiceMessage = (e, voiceGroupId) => {
    // Prevent the event from bubbling up the DOM tree
    e.stopPropagation()

    // Stop the voice message
    cancelVoice()

    // Reset the controls to show the Play button
    setGroupVoiceControls(voiceGroupId, `.voice-play`)
}


/**
 * Returns the plural form of a word based on the count.
 *
 * @param {string} word - The word to be pluralized.
 * @param {number} count - The count to determine the plural form.
 * @returns {string} The plural form of the word.
 */
const pluralizedWord = (word, count) => {
    if (word === 'violation') {
        return count === 1 ? 'violation' : 'violations'
    } else if (word === 'was') {
        return count === 1 ? 'was' : 'were'
    } else if (word === 'element') {
        return count === 1 ? 'element' : 'elements'
    } else if (word === 'test') {
        return count === 1 ? 'test' : 'tests'
    } else if (word === 'severity') {
        return count === 1 ? 'severity' : 'severities'
    }
}


