#!/usr/bin/env node
/**
 * Standalone wrapper for markmap-cli
 * This will be bundled into a single executable using pkg
 */

const path = require('path');

// Pass through all arguments
const args = process.argv.slice(2);

// If --version flag, show version
if (args.includes('--version')) {
  // Use hardcoded version to avoid requiring markmap-cli package
  console.log('1.0.0');
  process.exit(0);
}

// Directly require and execute the bundled markmap
// The bundled version is CommonJS, so we can require it
try {
  // Stub read-package-up to return a dummy package.json
  // This prevents update-notifier from failing when package.json is not found
  const Module = require('module');
  const originalRequire = Module.prototype.require;
  
  Module.prototype.require = function(id) {
    if (id === 'read-package-up' || id.endsWith('/read-package-up')) {
      return {
        readPackageUpSync: () => ({
          packageJson: {
            name: 'markmap-standalone',
            version: '1.0.0'
          },
          path: path.join(__dirname, 'package.json')
        })
      };
    }
    return originalRequire.apply(this, arguments);
  };
  
  // Set up argv for the bundled CLI
  process.argv = [process.argv[0], 'markmap', ...args];
  
  // Load the bundled CLI and call main() function
  const { main } = require('./bundled/index.js');
  
  // Execute the main function (it returns a Promise)
  main().catch(err => {
    console.error('Markmap execution error:', err);
    process.exit(1);
  });
  
} catch (error) {
  console.error('Failed to execute markmap:', error.message);
  process.exit(1);
}
