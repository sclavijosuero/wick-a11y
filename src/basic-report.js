import { 
    help,
    escapeHTML,
    getHumanReadableFormat
} from '../cypress/support/utils'

/**
 * Builds a basic, minimalistic HTML report body for accessibility violations.
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
const buildBasicHtmlReportBody = (reportInfo, options) => {
    const { testResults, violations, accessibilityContext, accessibilityOptions, impactStyling, impactPriority } = reportInfo
    const { testSpec, testName, url, reportGeneratedOn, issuesScreenshotFilePath } = options

    const fileBody = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Wick-A11y Basic Accessibility Report</title>
    <style>
        /* Basic Reset */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        /* Root Variables */
        :root {
            --color-bg: #ffffff;
            --color-text: #1a1a1a;
            --color-text-muted: #666666;
            --color-border: #e0e0e0;
            --color-link: #0066cc;
            --color-link-hover: #004499;
            --color-critical: #dc2626;
            --color-serious: #ea580c;
            --color-moderate: #d97706;
            --color-minor: #2563eb;
            --color-bg-critical: #fef2f2;
            --color-bg-serious: #fff7ed;
            --color-bg-moderate: #fffbeb;
            --color-bg-minor: #eff6ff;
            --spacing: 16px;
            --border-radius: 4px;
            --font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        body {
            font-family: var(--font-family);
            line-height: 1.6;
            color: var(--color-text);
            background: var(--color-bg);
            padding: var(--spacing);
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
        }

        /* Header */
        .header {
            text-align: center;
            padding: var(--spacing) 0;
            margin-bottom: var(--spacing);
        }

        .header h1 {
            font-size: 24px;
            font-weight: 600;
            margin: 0;
        }

        /* Summary Section */
        .summary {
            background: #f9fafb;
            border: 1px solid var(--color-border);
            border-radius: var(--border-radius);
            padding: 12px;
            margin-bottom: var(--spacing);
        }

        .summary h2 {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 10px;
            padding-bottom: 6px;
            border-bottom: 1px solid var(--color-border);
        }

        .summary-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 8px;
            margin-top: 10px;
        }

        .summary-item {
            font-size: 14px;
            padding: 6px 8px;
            background: #ffffff;
            border-radius: var(--border-radius);
            border: 1px solid var(--color-border);
        }

        .summary-item strong {
            display: block;
            color: var(--color-text-muted);
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            margin-bottom: 4px;
            font-weight: 700;
        }

        .summary-item span {
            word-break: break-word;
            color: var(--color-text);
            font-size: 14px;
            font-weight: 500;
        }

        /* Violations Summary */
        .violations-summary {
            display: flex;
            gap: 8px;
            flex-wrap: wrap;
            margin-top: 10px;
        }

        .violation-count {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 6px 10px;
            background: #ffffff;
            border: 2px solid var(--color-border);
            border-radius: var(--border-radius);
            font-size: 14px;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
        }

        .violation-count .icon {
            font-size: 18px;
        }

        .violation-count .label {
            font-weight: 700;
            text-transform: uppercase;
            font-size: 11px;
            letter-spacing: 0.5px;
            color: var(--color-text);
        }

        .violation-count .count {
            color: var(--color-text);
            font-weight: 600;
            font-size: 15px;
            margin-left: 4px;
        }

        /* Violations Section */
        .violations {
            margin-top: var(--spacing);
        }

        .violations h2 {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: var(--spacing);
            text-align: center;
        }

        .severity-section {
            margin-bottom: var(--spacing);
            border-radius: var(--border-radius);
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .severity-header {
            padding: 10px 12px;
            font-size: 16px;
            font-weight: 700;
            display: flex;
            align-items: center;
            gap: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .severity-section.critical {
            border: 2px solid var(--color-critical);
        }

        .severity-section.critical .severity-header {
            background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
            color: var(--color-critical);
            border-bottom: 2px solid var(--color-critical);
        }

        .severity-section.serious {
            border: 2px solid var(--color-serious);
        }

        .severity-section.serious .severity-header {
            background: linear-gradient(135deg, #fff7ed 0%, #ffedd5 100%);
            color: var(--color-serious);
            border-bottom: 2px solid var(--color-serious);
        }

        .severity-section.moderate {
            border: 2px solid var(--color-moderate);
        }

        .severity-section.moderate .severity-header {
            background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
            color: var(--color-moderate);
            border-bottom: 2px solid var(--color-moderate);
        }

        .severity-section.minor {
            border: 2px solid var(--color-minor);
        }

        .severity-section.minor .severity-header {
            background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
            color: var(--color-minor);
            border-bottom: 2px solid var(--color-minor);
        }

        .violation-item {
            padding: 12px;
            background: #ffffff;
            position: relative;
        }

        .violation-item + .violation-item {
            border-top: 3px solid var(--color-border);
        }

        .violation-item + .violation-item::before {
            content: '';
            position: absolute;
            top: -3px;
            left: 0;
            right: 0;
            height: 3px;
            background: linear-gradient(90deg, 
                transparent 0%, 
                var(--color-border) 10%, 
                var(--color-border) 90%, 
                transparent 100%);
        }

        .violation-title {
            font-size: 15px;
            font-weight: 600;
            margin-bottom: 6px;
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
        }

        .violation-rule {
            font-size: 13px;
            color: var(--color-text-muted);
            font-style: italic;
            font-weight: normal;
        }

        .violation-meta {
            display: flex;
            gap: 10px;
            align-items: center;
            margin-bottom: 10px;
            flex-wrap: wrap;
        }

        .violation-link {
            display: inline-block;
            padding: 4px 12px;
            background: var(--color-link);
            color: white;
            text-decoration: none;
            border-radius: var(--border-radius);
            font-size: 13px;
            transition: background 0.2s;
        }

        .violation-link:hover {
            background: var(--color-link-hover);
        }

        .violation-tags {
            font-size: 12px;
            color: var(--color-text-muted);
        }

        .affected-elements {
            margin-top: 10px;
        }

        .affected-elements h4 {
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 8px;
            color: var(--color-text-muted);
        }

        .elements-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 8px;
        }

        @media (max-width: 768px) {
            .elements-grid {
                grid-template-columns: 1fr;
            }
        }

        .element-item {
            background: #f9fafb;
            border: 1px solid var(--color-border);
            border-radius: var(--border-radius);
            padding: 8px 10px;
            position: relative;
            cursor: help;
            transition: all 0.2s ease;
            min-height: 44px; /* WCAG 2.2 AAA: Minimum touch target */
            display: flex;
            align-items: center;
        }

        .element-item:hover {
            background: #ffffff;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
            transform: translateY(-2px);
        }

        .element-item:focus {
            outline: 3px solid var(--color-link);
            outline-offset: 2px;
            background: #ffffff;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        }

        .element-item:focus-within {
            outline: 3px solid var(--color-link);
            outline-offset: 2px;
        }

        /* Ensure tooltips show on focus for keyboard users */
        .element-item:focus .tooltip {
            visibility: visible;
            opacity: 1;
        }

        .element-selector {
            font-family: 'Monaco', 'Menlo', monospace;
            font-size: 13px;
            color: var(--color-text);
            word-break: break-all;
            line-height: 1.5;
        }

        /* Tooltip styles */
        .element-item .tooltip {
            visibility: hidden;
            opacity: 0;
            position: absolute;
            z-index: 1000;
            background: #1a1a1a;
            color: #ffffff;
            padding: 12px 16px;
            border-radius: var(--border-radius);
            font-size: 13px;
            line-height: 1.6;
            width: 300px;
            max-width: 90vw;
            bottom: 100%;
            left: 50%;
            transform: translateX(-50%) translateY(-8px);
            margin-bottom: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            transition: opacity 0.2s ease, visibility 0.2s ease;
            pointer-events: none;
        }

        .element-item .tooltip::after {
            content: "";
            position: absolute;
            top: 100%;
            left: 50%;
            transform: translateX(-50%);
            border: 6px solid transparent;
            border-top-color: #1a1a1a;
        }

        .element-item:hover .tooltip,
        .element-item:focus-within .tooltip {
            visibility: visible;
            opacity: 1;
        }

        .tooltip p {
            margin: 4px 0;
        }

        .tooltip p:first-child {
            margin-top: 0;
        }

        .tooltip p:last-child {
            margin-bottom: 0;
        }

        .tooltip strong {
            color: #ffffff;
            font-weight: 600;
        }

        /* Adjust tooltip position on mobile */
        @media (max-width: 768px) {
            .element-item .tooltip {
                width: calc(100vw - 32px);
                left: 50%;
                transform: translateX(-50%) translateY(-8px);
            }
        }

        /* Screenshot Section */
        .screenshot-section {
            margin-top: calc(var(--spacing) * 2);
            text-align: center;
        }

        .screenshot-section h2 {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: var(--spacing);
        }

        .screenshot-container {
            border: 1px solid var(--color-border);
            border-radius: var(--border-radius);
            overflow: hidden;
            display: inline-block;
            max-width: 100%;
        }

        .screenshot-image {
            display: block;
            max-width: 100%;
            height: auto;
        }

        /* Footer */
        .footer {
            margin-top: calc(var(--spacing) * 2);
            padding: 12px;
            background: #f9fafb;
            border-radius: var(--border-radius);
            text-align: center;
            font-size: 13px;
            color: var(--color-text-muted);
            line-height: 1.6;
        }

        .footer a {
            color: var(--color-link);
            text-decoration: none;
        }

        .footer a:hover {
            text-decoration: underline;
        }

        /* Links - WCAG 2.2 AAA Compliant */
        a {
            color: var(--color-link);
            text-decoration: underline;
            transition: color 0.2s ease;
        }

        a:hover {
            color: var(--color-link-hover);
        }

        a:focus {
            outline: 3px solid var(--color-link);
            outline-offset: 2px;
            border-radius: 2px;
        }

        /* Button focus states - WCAG 2.2 AAA */
        .violation-link:focus {
            outline: 3px solid var(--color-link);
            outline-offset: 2px;
        }

        /* Print Styles */
        @media print {
            body {
                padding: 0;
            }
            
            .violation-item {
                page-break-inside: avoid;
            }
        }

        /* Mobile Responsive */
        @media (max-width: 768px) {
            body {
                padding: 8px;
            }

            .header h1 {
                font-size: 20px;
            }

            .summary-grid {
                grid-template-columns: 1fr;
            }

            .violations-summary {
                flex-direction: column;
            }

            .violation-count {
                width: 100%;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <header class="header">
            <h1>Wick-A11y Basic Accessibility Report</h1>
        </header>

        <main>
            <!-- Summary Section -->
            <section class="summary">
                <h2>Report Summary</h2>
                
                <div class="summary-grid">
                    <div class="summary-item">
                        <strong>Spec File</strong>
                        <span>${escapeHTML(testSpec)}</span>
                    </div>
                    <div class="summary-item">
                        <strong>Test Name</strong>
                        <span>${escapeHTML(testName)}</span>
                    </div>
                    <div class="summary-item">
                        <strong>Page URL</strong>
                        <span><a href="${url}" target="_blank" rel="noopener noreferrer">${escapeHTML(url)}</a></span>
                    </div>
                    <div class="summary-item">
                        <strong>Generated On</strong>
                        <span>${reportGeneratedOn}</span>
                    </div>
                    <div class="summary-item">
                        <strong>Context</strong>
                        <span>${getHumanReadableFormat(accessibilityContext)}</span>
                    </div>
                    <div class="summary-item">
                        <strong>Tags</strong>
                        <span>${accessibilityOptions.runOnly.join(', ')}</span>
                    </div>
                    ${accessibilityOptions.rules ? `
                        <div class="summary-item">
                            <strong>Rules</strong>
                            <span>${getHumanReadableFormat(accessibilityOptions.rules)}</span>
                        </div>
                    ` : ''}
                </div>

                <div class="violations-summary">
                    ${impactPriority.map((impact) => {
                        const totalIssues = testResults.testSummary[impact] !== undefined ? testResults.testSummary[impact] : 'n/a'
                        return `
                            <div class="violation-count">
                                <span class="icon">${impactStyling[impact].icon}</span>
                                <span class="label">${impact}</span>
                                <span class="count">${totalIssues}</span>
                            </div>
                        `
                    }).join('')}
                </div>
            </section>

            <!-- Violations Details -->
            <section class="violations">
                <h2>Accessibility Violations Details</h2>
                
                ${impactPriority.map((impact) => {
                    // Skip if this impact level was not part of the analysis
                    const totalIssuesInSummary = testResults.testSummary[impact];
                    if (totalIssuesInSummary === undefined || totalIssuesInSummary === 'n/a') {
                        return '';
                    }

                    const violationsForImpact = violations.filter(violation => violation.impact === impact);
                    const violationCount = violationsForImpact.length;
                    
                    if (violationCount === 0) {
                        return `
                            <div class="severity-section ${impact}">
                                <div class="severity-header">
                                    <span>${impactStyling[impact].icon}</span>
                                    <span>${impact.toUpperCase()} VIOLATIONS (${violationCount})</span>
                                </div>
                                <div class="violation-item">
                                    <p style="text-align: center; color: var(--color-text-muted); font-style: italic;">
                                        No ${impact} violations found.
                                    </p>
                                </div>
                            </div>
                        `;
                    }
                    
                    return `
                        <div class="severity-section ${impact}">
                            <div class="severity-header">
                                <span>${impactStyling[impact].icon}</span>
                                <span>${impact.toUpperCase()} VIOLATIONS (${violationCount})</span>
                            </div>
                            ${violationsForImpact.map((violation) => `
                                <div class="violation-item">
                                    <div class="violation-title">
                                        <span>${escapeHTML(violation.help)}</span>
                                        <span class="violation-rule">(${escapeHTML(violation.id)})</span>
                                    </div>
                                    <div class="violation-meta">
                                        <a href="${violation.helpUrl}" target="_blank" rel="noopener noreferrer" class="violation-link">
                                            Learn More
                                        </a>
                                        <span class="violation-tags">
                                            <strong>Tags:</strong> ${violation.tags.join(", ")}
                                        </span>
                                    </div>
                                    <div class="affected-elements">
                                        <h4>Affected Elements (${violation.nodes.length})</h4>
                                        <div class="elements-grid">
                                            ${violation.nodes.map((node) => `
                                                <div class="element-item" tabindex="0" role="button" aria-label="Element selector with fix details">
                                                    <div class="element-selector">
                                                        ${escapeHTML(node.target.join(', '))}
                                                    </div>
                                                    <div class="tooltip" role="tooltip">
                                                        ${formatFailureSummary(node.failureSummary)}
                                                    </div>
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    `;
                }).join('')}
            </section>

            <!-- Screenshot Section -->
            <section class="screenshot-section">
                <h2>Accessibility Violations Screenshot</h2>
                <div class="screenshot-container">
                    <img 
                        src="${issuesScreenshotFilePath}" 
                        alt="Screenshot showing accessibility violations highlighted with colored borders"
                        class="screenshot-image"
                        loading="lazy"
                    />
                </div>
            </section>
        </main>

        <footer class="footer">
            <p>
                <strong>Note:</strong> As per the axe-core® library, automated testing can find on average 57% of WCAG issues automatically.
                It only analyzes DOM elements that are visible in the browser viewport.
            </p>
            <p>
                Axe-core® (<a href="https://github.com/dequelabs/axe-core" target="_blank" rel="noopener noreferrer">https://github.com/dequelabs/axe-core</a>) 
                is a trademark of Deque Systems, Inc (<a href="https://www.deque.com/" target="_blank" rel="noopener noreferrer">https://www.deque.com/</a>) 
                in the US and other countries.
            </p>
        </footer>
    </div>
</body>
</html>
`
    return fileBody
}

/**
 * Formats the failure summary for display in the basic report.
 *
 * @param {string} summary - The summary string to format.
 * @returns {string} The formatted HTML string.
 */
const formatFailureSummary = (summary) => {
    const lines = summary.split('\n').filter(line => line.trim() !== '');
    
    return lines.map((line) => {
        if (/^Fix/.test(line)) {
            return `<p><strong>${escapeHTML(line)}</strong></p>`;
        }
        return `<p>• ${escapeHTML(line)}</p>`;
    }).join('');
}

export default buildBasicHtmlReportBody
