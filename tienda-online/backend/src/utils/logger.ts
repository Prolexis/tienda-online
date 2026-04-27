// =============================================
// LOGGER - Winston con formato JSON estructurado
// =============================================

import winston from 'winston';
import path from 'path';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Formato para consola (desarrollo)
const consoleFormat = printf(({ level, message, timestamp: ts, stack }) => {
  return `${ts} [${level}]: ${stack || message}`;
});

export const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  ),
  transports: [
    // Consola con colores (solo desarrollo)
    new winston.transports.Console({
      format: combine(colorize(), consoleFormat),
      silent: process.env.NODE_ENV === 'test',
    }),
    // Archivo de errores
    new winston.transports.File({
      filename: path.join('logs', 'error.log'),
      level: 'error',
      format: combine(winston.format.json()),
    }),
    // Archivo combinado
    new winston.transports.File({
      filename: path.join('logs', 'combined.log'),
      format: combine(winston.format.json()),
    }),
  ],
});
