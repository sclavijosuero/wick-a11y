const { error } = require('console');
const fs = require('fs-extra');
const path = require('path');


//*******************************************************************************
// CYPRESS TASKS
//*******************************************************************************

const addAccessibilityTasks = (on) => {
    on('task', {
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
            return new Promise((resolve, reject) => {
                fs.move(path.resolve(originFilePath), path.resolve(targetFilePath), err => {
                    if (err) {
                        console.error(err)
                        reject(err)
                    } else {
                        resolve(`SUCCESSFULLY MOVED SCREENSHOT TO: ${targetFilePath}`)
                    }
                })
            })
        }
    })
}

module.exports = addAccessibilityTasks
