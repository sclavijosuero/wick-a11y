const { defineConfig } = require("cypress");

// Import the accessibility tasks from the accessibility-tasks.js file
const addAccessibilityTasks  = require('./src/accessibility-tasks');

module.exports = defineConfig({
  viewportWidth: 1920,
  viewportHeight: 1080,

  retries: {
    openMode: 1,
    runMode: 0,
  },

  watchForFileChanges: false,

  // Increase the defualt command timeout to 15 seconds because AXE analysis can spend quire some time.
  // Could be done in cypress.config.js or for each tests, specially if some AXE analysis is exceptionally slow.
  // defaultCommandTimeout: 15000,

  experimentalInteractiveRunEvents: true,

  e2e: {
    setupNodeEvents(on, config) {
      // implement node event listeners here

      // Add accessibility tasks from wick-a11y plugin
      addAccessibilityTasks(on);

      return config;
    },
    specPattern: 'cypress/e2e/**/*.{js,jsx,ts,tsx}',
    baseUrl: 'http://www.google.com',
  },
});
