/**
 * Centralized logging utility with environment-aware log levels
 * Replaces scattered console.log statements with structured logging
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

interface LoggerConfig {
  level: LogLevel;
  enableTimestamps: boolean;
  enableColors: boolean;
}

class Logger {
  private config: LoggerConfig;

  constructor(config?: Partial<LoggerConfig>) {
    const isDevelopment = process.env.NODE_ENV === 'development';

    this.config = {
      level: config?.level ?? (isDevelopment ? LogLevel.DEBUG : LogLevel.WARN),
      enableTimestamps: config?.enableTimestamps ?? isDevelopment,
      enableColors: config?.enableColors ?? true
    };
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  private formatMessage(level: string, message: string): string {
    const timestamp = this.config.enableTimestamps
      ? `[${new Date().toISOString()}] `
      : '';

    return `${timestamp}${level} ${message}`;
  }

  private getColorCode(level: LogLevel): string {
    if (!this.config.enableColors) return '';

    switch (level) {
      case LogLevel.DEBUG: return '\x1b[36m'; // Cyan
      case LogLevel.INFO: return '\x1b[32m'; // Green
      case LogLevel.WARN: return '\x1b[33m'; // Yellow
      case LogLevel.ERROR: return '\x1b[31m'; // Red
      default: return '';
    }
  }

  private resetColor(): string {
    return this.config.enableColors ? '\x1b[0m' : '';
  }

  debug(message: string, ...args: unknown[]): void {
    if (!this.shouldLog(LogLevel.DEBUG)) return;

    const color = this.getColorCode(LogLevel.DEBUG);
    const reset = this.resetColor();
    console.log(`${color}${this.formatMessage('[DEBUG]', message)}${reset}`, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    if (!this.shouldLog(LogLevel.INFO)) return;

    const color = this.getColorCode(LogLevel.INFO);
    const reset = this.resetColor();
    console.log(`${color}${this.formatMessage('[INFO]', message)}${reset}`, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    if (!this.shouldLog(LogLevel.WARN)) return;

    const color = this.getColorCode(LogLevel.WARN);
    const reset = this.resetColor();
    console.warn(`${color}${this.formatMessage('[WARN]', message)}${reset}`, ...args);
  }

  error(message: string, error?: Error | unknown, ...args: unknown[]): void {
    if (!this.shouldLog(LogLevel.ERROR)) return;

    const color = this.getColorCode(LogLevel.ERROR);
    const reset = this.resetColor();
    console.error(`${color}${this.formatMessage('[ERROR]', message)}${reset}`, error, ...args);
  }

  // Convenience methods for common patterns
  group(label: string): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.group(label);
    }
  }

  groupEnd(): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.groupEnd();
    }
  }

  table(data: unknown): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.table(data);
    }
  }

  // Allow dynamic config updates
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  getLevel(): LogLevel {
    return this.config.level;
  }
}

// Export singleton instance
export const logger = new Logger();

// Export factory for custom loggers
export function createLogger(config?: Partial<LoggerConfig>): Logger {
  return new Logger(config);
}
