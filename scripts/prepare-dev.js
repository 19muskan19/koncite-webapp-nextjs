const fs = require('fs');
const path = require('path');

// Handle uncaught exceptions to prevent crashes from trace file errors
process.on('uncaughtException', (err) => {
  if (err.code === 'EPERM' && err.path && err.path.includes('trace')) {
    console.warn('⚠ Trace file permission issue (suppressed - app will continue)');
    return; // Suppress the error
  }
  // Re-throw other errors
  throw err;
});

// Handle unhandled rejections
process.on('unhandledRejection', (reason, promise) => {
  if (reason && reason.code === 'EPERM' && reason.path && reason.path.includes('trace')) {
    console.warn('⚠ Trace file permission issue (suppressed - app will continue)');
    return; // Suppress the error
  }
  // Log other rejections but don't crash
  console.error('Unhandled Rejection:', reason);
});

// Create .next directory if it doesn't exist
const nextDir = path.join(process.cwd(), '.next');
if (!fs.existsSync(nextDir)) {
  fs.mkdirSync(nextDir, { recursive: true });
}

// Try to delete trace file if it exists
const traceFile = path.join(nextDir, 'trace');
try {
  if (fs.existsSync(traceFile)) {
    fs.unlinkSync(traceFile);
  }
} catch (err) {
  // Ignore - file might be locked
}

// Set environment variables
process.env.NEXT_TELEMETRY_DISABLED = '1';
process.env.NODE_OPTIONS = (process.env.NODE_OPTIONS || '') + ' --no-warnings';

// Patch WriteStream to handle trace file errors
const originalWriteStream = require('stream').WriteStream;
const WriteStream = originalWriteStream;
const originalEmit = WriteStream.prototype.emit;
WriteStream.prototype.emit = function(event, ...args) {
  if (event === 'error' && args[0] && args[0].code === 'EPERM' && args[0].path && args[0].path.includes('trace')) {
    // Suppress trace file errors
    return false;
  }
  return originalEmit.apply(this, [event, ...args]);
};

// Start Next.js
require('next/dist/bin/next');
