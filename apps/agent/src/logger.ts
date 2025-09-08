import pino from 'pino';

import type { Logger } from 'pino';

export interface LoggerConfig {
  level?: string;
  pretty?: boolean;
  service?: string;
}

export function createLogger(config: LoggerConfig = {}): Logger {
  const {
    level = process.env['NODE_ENV'] === 'production' ? 'info' : 'debug',
    pretty = process.env['NODE_ENV'] !== 'production',
    service = 'gapjunction-agent'
  } = config;

  const baseConfig: pino.LoggerOptions = {
    name: service,
    level,
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: {
      level: (label: string) => ({ level: label }),
    },
    serializers: {
      error: pino.stdSerializers.err,
      req: pino.stdSerializers.req,
      res: pino.stdSerializers.res,
    },
  };

  // Add pretty printing for development
  if (pretty) {
    return pino(baseConfig, pino.destination({
      sync: false,
      dest: pino.transport({
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
          messageFormat: '[{service}] {msg}',
        },
      }),
    }));
  }

  // Production JSON logging
  return pino(baseConfig);
}

// Create default logger instance
export const logger = createLogger();

// Helper function to create child loggers with context
export function createChildLogger(context: Record<string, unknown>): Logger {
  return logger.child(context);
}

// Helper function to create logger for specific modules
export function createModuleLogger(module: string): Logger {
  return createChildLogger({ module });
}