//*******************************************************************************
// ACCESSIBILITY REPORT UTILITY FUNCTIONS
//*******************************************************************************

/**
 * Contains documentation/help text for accessibility analysis configuration and severity levels.
 * Used in accessibility report generation and tooltips.
 * 
 * @typedef {Object} Help
 * @property {string} context - Explains the scope considered in the accessibility analysis, specifying which elements have been tested and which have not.
 * @property {string} runOnly - Describes the tags that define the severity of violations considered in the accessibility analysis.
 * @property {string} rules - Details which specific accessibility rules are enabled or disabled for the analysis, such as "color-contrast" or "valid-lang".
 * @property {Object} impactSeverityDescription - Human-readable descriptions for each impact severity level.
 * @property {string} impactSeverityDescription.critical - A "critical" accessibility violation represents a significant barrier that prevents users with disabilities from accessing core functionality or content.
 * @property {string} impactSeverityDescription.serious - A "serious" accessibility violation significantly degrades the user experience for individuals with disabilities but does not completely block access.
 * @property {string} impactSeverityDescription.moderate - A "moderate" accessibility violation impacts the user experience but with less severe consequences.
 * @property {string} impactSeverityDescription.minor - A "minor" accessibility violation has a minimal impact on accessibility.
 */

/**
 * @type {Help}
 */
const help = {
    context: 'Context defines the scope considered in the accessibility analysis, specifying which elements have been tested and which have not been tested.',
    runOnly: 'Tags define the severity of violations that have been considered in the accessibility analysis.',
    rules: 'Rules define what specific accessibility rules should be enable or disabled for the analysis, like "color-contrast" or "valid-lang".',

    impactSeverityDescription: {
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
};


/**
 * The default folder path for storing accessibility reports.
 * @type {string}
 */
const defaultAccessibilityFolder = 'cypress/accessibility'


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


export { help, defaultAccessibilityFolder, escapeHTML, normalizeFileName, getHumanReadableFormat }