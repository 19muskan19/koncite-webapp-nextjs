// Custom server to handle trace file permission errors on Windows
const fs = require('fs');
const path = require('path');

// Patch fs.createWriteStream to handle trace file errors
const originalCreateWriteStream = fs.createWriteStream;
fs.createWriteStream = function(filePath, options) {
  // If it's the trace file, create a no-op stream
  if (filePath && filePath.toString().includes('trace')) {
    const { Writable } = require('stream');
    const noopStream = new Writable({
      write(chunk, encoding, callback) {
        callback(); // Silently discard
      }
    });
    return noopStream;
  }
  try {
    return originalCreateWriteStream.call(this, filePath, options);
  } catch (err) {
    if (err.code === 'EPERM' && filePath && filePath.toString().includes('trace')) {
      const { Writable } = require('stream');
      return new Writable({
        write(chunk, encoding, callback) {
          callback(); // Silently discard
        }
      });
    }
    throw err;
  }
};

// Patch fs.openSync to handle trace file
const originalOpenSync = fs.openSync;
fs.openSync = function(filePath, flags, mode) {
  if (filePath && filePath.toString().includes('trace')) {
    // Return a dummy file descriptor
    return 999;
  }
  try {
    return originalOpenSync.call(this, filePath, flags, mode);
  } catch (err) {
    if (err.code === 'EPERM' && filePath && filePath.toString().includes('trace')) {
      return 999; // Dummy FD
    }
    throw err;
  }
};

const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = parseInt(process.env.PORT || '3000', 10);

// Suppress trace file permission errors
const originalEmit = process.emit;
process.emit = function(event, ...args) {
  if (event === 'error') {
    const err = args[0];
    if (err && err.code === 'EPERM' && err.path && err.path.includes('trace')) {
      console.warn('⚠ Trace file permission issue (suppressed - app will continue)');
      return false; // Suppress the error
    }
  }
  return originalEmit.apply(this, arguments);
};

process.on('unhandledRejection', (reason) => {
  if (reason && reason.code === 'EPERM' && reason.path && reason.path.includes('trace')) {
    console.warn('⚠ Trace file permission issue (suppressed)');
    return;
  }
});

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  createServer(async (req, res) => {
    try {
      const parsedUrl = parse(req.url, true);
      await handle(req, res, parsedUrl);
    } catch (err) {
      console.error('Error occurred handling', req.url, err);
      res.statusCode = 500;
      res.end('internal server error');
    }
  }).once('error', (err) => {
    if (err.code === 'EPERM' && err.path && err.path.includes('trace')) {
      console.warn('⚠ Trace file permission issue (suppressed)');
      return;
    }
    console.error('Server error:', err);
  }).listen(port, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
  });
});
