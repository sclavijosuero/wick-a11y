const { error } = require('console');
const fs = require('fs-extra');
const path = require('path');


//*******************************************************************************
// CYPRESS TASKS
//*******************************************************************************

const addAccessibilityTasks = (on) => {
    const newSpecResults = () => {
        return {
            specName: '',
            specSummary: {
                tests: 0,
                passed:0,
                failedAccessibility: 0,
                failed: 0,
                pending: 0,
                skipped: 0
            },
            specSummaryVoice: ``,
            testsResults: {}
        }
    }

    let specResults = newSpecResults() 
    
    on('task', {
        /**
         * Clears the spec results.
         * @returns {null}
         */
        emptySpecResults() {
            specResults = newSpecResults()
            return null
        },

        /**
         * Retrieves the spec results.
         * @returns {Object} The spec results object.
         */
        getSpecResults() {
            return specResults || {}
        },

        /**
         * Saves the test results in spec results.
         *
         * @param {Object} testResults - The test results object.
         * @returns {null} - Returns null.
         */
        saveTestResults(testResults) {
            const testState = testResults.testState === 'failed' && testResults.violations ?
                'failedAccessibility' : `${testResults.testState}`

            specResults.testsResults[testResults.testTitle] = testResults
            specResults.specSummary.tests++
            specResults.specSummary[testState]++

            return null
        },

        /**
         * Logs the violations summary.
         *
         * @param {string} message - The message to be logged.
         * @returns {null} - Always returns null to signal that the given event has been handled.
         */
        logViolationsSummary(message) {
            console.log(message)
            return null
        },

        /**
         * Logs the violations table.
         *
         * @param {any} message - The message to be logged.
         * @returns {null} - Always returns null to signal that the given event has been handled.
         */
        logViolationsTable(message) {
            console.table(message)
            return null
        },

        /**
         * Generates an accessibility violations report.
         *
         * @param {Object} options - The options for generating the report.
         * @param {string} options.folderPath - The folder path where the report will be saved.
         * @param {string} options.fileName - The name of the report file.
         * @param {string} options.fileBody - The content of the report file.
         * @returns {Promise<string>} A promise that resolves with a success or failure message.
         */
        generateViolationsReport({ folderPath, fileName, fileBody }) {
            const filePath = path.resolve(folderPath, fileName)

            return new Promise((resolve, reject) => {
                console.log('filePath2: ' + filePath)

                fs.writeFile(filePath, fileBody, err => {
                    // Folder must exist in order to create the report
                    if (err) {
                        const msg = `FAILED TO GENERATE ACCESSIBILITY REPORT AT: ${filePath}`
                        console.error(err);

                        resolve(`❌❌❌❌ **${msg}**`) // Inform the user that the report was not generated but do not fail the test
                        // return reject(err)  // Fail the test
                    } else {
                        const msg = `SUCCESSFULLY GENERATED ACCESSIBILITY REPORT AT: ${filePath}`
                        console.log(msg);

                        resolve(`✔️✔️✔️✔️ **${msg}**`) // Inform the user that the report was generated
                    }
                })
            })
        },

        /**
         * Creates a folder if it does not already exist.
         *
         * @param {string} folderPath - The path of the folder to create.
         * @returns {null} - Always returns null to signal that the given event has been handled.
         */
        createFolderIfNotExist(folderPath) {
            fs.ensureDir(folderPath, err => {
                console.log(err) // => null
            })
            // If it did not exist, directory has now been created

            return null
        },

        /**
         * Moves a screenshot file from the originFilePath to the targetFilePath.
         *
         * @param {Object} options - The options for moving the screenshot file.
         * @param {string} options.originFilePath - The path of the original screenshot file.
         * @param {string} options.targetFilePath - The path where the screenshot file should be moved to.
         * @returns {Promise<string>} A promise that resolves with a success message if the file is moved successfully, or rejects with an error if there was an issue moving the file.
         */
        moveScreenshotToFolder({ originFilePath, targetFilePath }) {
            // Get the directory from the full target file path
            const targetDir = path.dirname(targetFilePath);

            // First, ensure the target directory exists. Then, copy the file.
            // This returns the promise chain directly.
            return fs.ensureDir(targetDir).then(() => {
                // This returns the promise from fs.copy
                return fs.copy(originFilePath, targetFilePath);
            }).then(() => {
                // This is the success case after the copy completes
                const successMessage = `SUCCESSFULLY MOVED SCREENSHOT TO: ${targetFilePath}`;
                // console.log(successMessage); // Optional: uncomment for debugging
                return successMessage;
            }).catch((err) => {
                // This single .catch handles errors from both ensureDir and copy
                console.error(`Error moving screenshot to '${targetFilePath}'`,err);
                // Re-throw the error to ensure the promise is rejected, failing the task
                throw err;
            })
        }
    })

    
}

module.exports = addAccessibilityTasks
