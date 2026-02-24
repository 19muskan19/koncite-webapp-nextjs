// Wrapper script to disable Next.js trace file
process.env.NEXT_TELEMETRY_DISABLED = '1';
process.env.NODE_OPTIONS = '--no-warnings';

// Disable trace file creation
const originalWrite = process.stdout.write;
process.stdout.write = function(...args) {
  if (args[0] && typeof args[0] === 'string' && args[0].includes('trace')) {
    return true;
  }
  return originalWrite.apply(process.stdout, args);
};

// Start Next.js
require('next/dist/bin/next');
