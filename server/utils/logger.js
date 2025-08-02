// utils/logger.js
const { createLogger, transports, format } = require('winston');

module.exports = createLogger({
  level: 'info',
  format: format.combine(format.timestamp(), format.simple()),
  transports: [new transports.Console()]
});
