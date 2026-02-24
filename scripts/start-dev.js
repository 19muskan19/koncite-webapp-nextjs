// Wrapper to start Next.js dev server with trace file error handling
const { spawn } = require('child_process');
const path = require('path');

// Set environment variables
process.env.NEXT_TELEMETRY_DISABLED = '1';
process.env.NODE_OPTIONS = (process.env.NODE_OPTIONS || '') + ' --no-warnings';

// Create .next directory if it doesn't exist
const fs = require('fs');
const nextDir = path.join(process.cwd(), '.next');
if (!fs.existsSync(nextDir)) {
  fs.mkdirSync(nextDir, { recursive: true });
}

// Try to create trace file with proper permissions
const traceFile = path.join(nextDir, 'trace');
try {
  // Delete if exists
  if (fs.existsSync(traceFile)) {
    fs.unlinkSync(traceFile);
  }
  // Create empty file
  fs.writeFileSync(traceFile, '', { flag: 'w' });
} catch (err) {
  // Ignore - will be handled by error suppression
}

// Suppress uncaught exceptions for trace file
const originalListeners = process.listeners('uncaughtException');
process.removeAllListeners('uncaughtException');

process.on('uncaughtException', (err) => {
  if (err.code === 'EPERM' && err.path && err.path.includes('trace')) {
    console.warn('⚠ Trace file permission issue (suppressed - app will continue)');
    return;
  }
  // Call original listeners
  originalListeners.forEach(listener => {
    try {
      listener(err);
    } catch (e) {
      // Ignore
    }
  });
  if (originalListeners.length === 0) {
    console.error('Uncaught Exception:', err);
    process.exit(1);
  }
});

// Start Next.js
const nextBin = path.join(__dirname, '..', 'node_modules', '.bin', 'next');
const child = spawn('node', [nextBin, 'dev'], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    NEXT_TELEMETRY_DISABLED: '1',
  }
});

child.on('error', (err) => {
  if (err.code === 'EPERM' && err.path && err.path.includes('trace')) {
    console.warn('⚠ Trace file permission issue (suppressed)');
    return;
  }
  console.error('Error starting Next.js:', err);
  process.exit(1);
});

child.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    process.exit(code);
  }
});
