const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logsDir = path.join(__dirname, '../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir);
}

const logFile = path.join(logsDir, 'app.log');

/**
 * Request logger middleware
 */
const requestLogger = (req, res, next) => {
  const startTime = Date.now();

  // Store original res.json
  const originalJson = res.json;

  // Override res.json to log response
  res.json = function (data) {
    const duration = Date.now() - startTime;
    const logMessage = `[${new Date().toISOString()}] ${req.method} ${req.path} - Status: ${res.statusCode} - Duration: ${duration}ms\n`;

    // Log to console
    console.log(logMessage.trim());

    // Log to file
    fs.appendFileSync(logFile, logMessage);

    // Call original json
    return originalJson.call(this, data);
  };

  next();
};

/**
 * Logger utility for manual logging
 */
const logger = {
  info: (message) => {
    const logMessage = `[${new Date().toISOString()}] INFO: ${message}\n`;
    console.log(logMessage.trim());
    fs.appendFileSync(logFile, logMessage);
  },

  error: (message, error) => {
    const logMessage = `[${new Date().toISOString()}] ERROR: ${message}\n${error ? error.stack : ''}\n`;
    console.error(logMessage.trim());
    fs.appendFileSync(logFile, logMessage);
  },

  warn: (message) => {
    const logMessage = `[${new Date().toISOString()}] WARN: ${message}\n`;
    console.warn(logMessage.trim());
    fs.appendFileSync(logFile, logMessage);
  },

  debug: (message) => {
    if (process.env.DEBUG === 'true') {
      const logMessage = `[${new Date().toISOString()}] DEBUG: ${message}\n`;
      console.log(logMessage.trim());
      fs.appendFileSync(logFile, logMessage);
    }
  },
};

module.exports = {
  requestLogger,
  logger,
};
