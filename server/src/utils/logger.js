const winston = require('winston');
const { format } = winston;

// Logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD hh:mm:ss A' }),
    format.errors({ stack: true }),
    format.colorize({ level: true }),
    format.printf(({ timestamp, level, message, stack }) => {
      const blueTimestamp = `\x1b[34m${timestamp}\x1b[0m`;
      if (stack) {
        return `${blueTimestamp} [${level}] ${message.trim()}\n${stack.trim() }`;
      }
      return `${blueTimestamp} [${level}] ${message.trim()}`;
    })
  ),
  transports: [
    new winston.transports.Console(),
  ],
});

// Export the logger
module.exports = logger;