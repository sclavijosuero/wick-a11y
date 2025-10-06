import { 
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

    // Sort violations by severity (critical first, then serious, moderate, minor)
    const sortedViolations = violations.sort((a, b) => {
        return impactPriority.indexOf(a.impact) - impactPriority.indexOf(b.impact)
    })

    const fileBody = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Wick-A11y Basic Accessibility Report - ${escapeHTML(testName)}</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
:root{
--c-text:#1a1a1a;
--c-muted:#666;
--c-border:#ddd;
--c-link:#0056b3;
--c-crit:#dc2626;
--c-ser:#ea580c;
--c-mod:#d97706;
--c-min:#2563eb;
--c-crit-dark:#7f1d1d;
--c-ser-dark:#7c2d12;
--c-mod-dark:#78350f;
--c-min-dark:#1e3a8a;
--s:14px;
--f:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif
}
body{font:var(--s)/1.6 var(--f);color:var(--c-text);max-width:1200px;margin:0 auto;padding:14px}
h1{font-size:22px;font-weight:600;margin-bottom:14px;text-align:center}
h2{font-size:18px;font-weight:600;margin:18px 0 12px;padding-bottom:6px;border-bottom:2px solid var(--c-border)}
a{color:var(--c-link);text-decoration:underline}
a:hover{text-decoration:none}
a:focus{outline:3px solid var(--c-link);outline-offset:2px}
.info{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:10px;margin-bottom:14px;font-size:13px;max-width:100%}
@media(min-width:900px){.info{grid-template-columns:repeat(3,1fr)}}
.info>div{display:flex;flex-direction:column;gap:6px;background:#fff;padding:12px;border-radius:4px;border:2px solid var(--c-border);box-shadow:0 1px 3px rgba(0,0,0,.06)}
.info dt{color:#fff;font-size:9px;text-transform:uppercase;letter-spacing:1px;font-weight:700;background:var(--c-muted);display:inline-block;padding:4px 10px;border-radius:3px;width:fit-content}
.info dd{color:var(--c-text);font-size:15px;font-weight:600;word-break:break-word;line-height:1.4;padding-left:2px}
.counts{display:flex;gap:12px;flex-wrap:wrap;padding:12px 0;border-top:2px solid var(--c-border);margin-bottom:16px}
.counts span{display:inline-flex;align-items:center;gap:8px;font-size:13px;font-weight:600;padding:8px 14px;border-radius:6px;}
.counts span[data-severity="critical"]{background:#fee2e2;color:var(--c-crit-dark)}
.counts span[data-severity="serious"]{background:#ffedd5;color:var(--c-ser-dark)}
.counts span[data-severity="moderate"]{background:#fef3c7;color:var(--c-mod-dark)}
.counts span[data-severity="minor"]{background:#dbeafe;color:var(--c-min-dark)}
.counts b{font-weight:700;font-size:18px;margin-left:2px}
.vlist{list-style:none}
.v{border-left:4px solid;padding:10px 0 10px 12px;margin-bottom:30px}
.v.crit{border-color:var(--c-crit)}
.v.ser{border-color:var(--c-ser)}
.v.mod{border-color:var(--c-mod)}
.v.min{border-color:var(--c-min)}
.vtitle{font-size:15px;font-weight:600;margin-bottom:6px;display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.sev{font-size:16px}
.crit .sev{color:var(--c-crit)}
.ser .sev{color:var(--c-ser)}
.mod .sev{color:var(--c-mod)}
.min .sev{color:var(--c-min)}
.vmeta{font-size:13px;color:var(--c-muted);margin-bottom:8px}
.vmeta a{font-size:13px;padding:3px 10px;background:var(--c-link);color:#fff;text-decoration:none;border-radius:3px;margin-right:8px}
.vmeta a:hover{background:#003d82}
.vmeta a:focus{outline:2px solid var(--c-link);outline-offset:2px}
.elems{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:10px 18px;margin-top:8px}
.elem{position:relative;min-height:44px;padding:8px;border-bottom:1px solid var(--c-border);font-family:Monaco,Menlo,monospace;font-size:13px;line-height:1.4;cursor:help;transition:background .15s ease}
.elem:hover{background:#e3f2fd}
.elem:focus{outline:2px solid var(--c-link);outline-offset:2px;background:#e3f2fd}
.elem .tip{visibility:hidden;opacity:0;position:absolute;z-index:100;background:#222;color:#fff;padding:10px 14px;border-radius:3px;font-size:13px;line-height:1.5;width:280px;max-width:90vw;bottom:100%;left:50%;transform:translateX(-50%);margin-bottom:6px;box-shadow:0 2px 8px rgba(0,0,0,.3);transition:opacity .2s,visibility .2s;pointer-events:none;font-family:var(--f)}
.elem .tip::after{content:"";position:absolute;top:100%;left:50%;transform:translateX(-50%);border:5px solid transparent;border-top-color:#222}
.elem:hover .tip,.elem:focus .tip{visibility:visible;opacity:1}
.tip p{margin:3px 0}
.tip p:first-child{margin-top:0}
.tip p:last-child{margin-bottom:0}
.tip strong{font-weight:600}
.shot{margin:20px 0;}
.shot img{max-width:100%;border:1px solid var(--c-border);display:block;margin:0 auto}
.foot{margin-top:20px;padding-top:12px;border-top:1px solid var(--c-border);text-align:center;font-size:12px;color:var(--c-muted);line-height:1.6}
@media(max-width:768px){
body{padding:10px}
h1{font-size:20px}
.info{grid-template-columns:1fr}
.counts{flex-direction:column;gap:8px}
.elems{grid-template-columns:1fr}
.elem .tip{width:calc(100vw - 24px)}
}
@media print{
body{padding:0}
.v{page-break-inside:avoid}
}
</style>
</head>
<body>
<h1>Wick-A11y Basic Accessibility Report</h1>

<div class="info">
<div>
<dt>Test</dt>
<dd>${escapeHTML(testSpec)} › ${escapeHTML(testName)}</dd>
</div>
<div>
<dt>URL</dt>
<dd><a href="${url}" target="_blank" rel="noopener">${escapeHTML(url)}</a></dd>
</div>
<div>
<dt>Date</dt>
<dd>${reportGeneratedOn}</dd>
</div>
<div>
<dt>Context</dt>
<dd>${getHumanReadableFormat(accessibilityContext)}</dd>
</div>
<div>
<dt>Tags</dt>
<dd>${accessibilityOptions.runOnly.join(', ')}</dd>
</div>
${accessibilityOptions.rules ? `<div><dt>Rules</dt><dd>${getHumanReadableFormat(accessibilityOptions.rules)}</dd></div>` : ''}
</div>

<div class="counts">
${impactPriority.map((impact) => {
    const count = testResults.testSummary[impact] !== undefined ? testResults.testSummary[impact] : 'n/a'
    return `<span data-severity="${impact}">${impactStyling[impact].icon} <span style="text-transform:uppercase;letter-spacing:.5px">${impact}</span> <b>${count}</b></span>`
}).join('')}
</div>

<h2>Violations</h2>

<ul class="vlist">
${sortedViolations.map((violation) => `
<li class="v ${violation.impact === 'critical' ? 'crit' : violation.impact === 'serious' ? 'ser' : violation.impact === 'moderate' ? 'mod' : 'min'}">
<div class="vtitle">
<span class="sev">${impactStyling[violation.impact].icon}</span>
<span>${escapeHTML(violation.help)}</span>
<small style="color:var(--c-muted);font-weight:400;font-style:italic">(${escapeHTML(violation.id)})</small>
</div>
<div class="vmeta">
<a href="${violation.helpUrl}" target="_blank" rel="noopener">Learn More</a>
<span>Tags: ${violation.tags.join(", ")}</span>
</div>
<div class="elems">
${violation.nodes.map((node) => `
<div class="elem" tabindex="0" role="button" aria-label="Element selector with fix details">
${escapeHTML(node.target.join(', '))}
<div class="tip" role="tooltip">
${formatFailureSummary(node.failureSummary)}
</div>
</div>
`).join('')}
</div>
</li>
`).join('')}
</ul>

<div class="shot">
<h2>Screenshot</h2>
<img src="${issuesScreenshotFilePath}" alt="Accessibility violations screenshot" loading="lazy">
</div>

<footer class="foot">
<p><strong>Note:</strong> Automated testing finds ~57% of WCAG issues. Analyzes visible DOM elements only.</p>
<p>Axe-core® (<a href="https://github.com/dequelabs/axe-core" target="_blank" rel="noopener">github.com/dequelabs/axe-core</a>) is a trademark of Deque Systems, Inc (<a href="https://www.deque.com/" target="_blank" rel="noopener">deque.com</a>).</p>
</footer>
</body>
</html>`
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
