type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: Date;
  data?: unknown;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000;
  private enabled = true;

  debug(message: string, data?: unknown): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: unknown): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: unknown): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: unknown): void {
    this.log('error', message, data);
  }

  private log(level: LogLevel, message: string, data?: unknown): void {
    if (!this.enabled) return;

    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date(),
      data,
    };

    this.logs.push(entry);

    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    const prefix = `[${entry.timestamp.toISOString()}] [${level.toUpperCase()}]`;
    const logFn = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
    
    if (data !== undefined) {
      logFn(prefix, message, data);
    } else {
      logFn(prefix, message);
    }
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  getRecentLogs(count: number = 50): LogEntry[] {
    return this.logs.slice(-count);
  }

  clearLogs(): void {
    this.logs = [];
  }

  enable(): void {
    this.enabled = true;
  }

  disable(): void {
    this.enabled = false;
  }

  exportLogs(): string {
    return this.logs
      .map((log) => {
        const dataStr = log.data ? ` | ${JSON.stringify(log.data)}` : '';
        return `[${log.timestamp.toISOString()}] [${log.level.toUpperCase()}] ${log.message}${dataStr}`;
      })
      .join('\n');
  }
}

export const logger = new Logger();

export function setupGlobalErrorHandler(): void {
  window.onerror = (message, source, lineno, colno, error) => {
    logger.error('Global error', { message, source, lineno, colno, error: error?.stack });
  };

  window.onunhandledrejection = (event) => {
    logger.error('Unhandled promise rejection', { reason: event.reason });
  };
}

export default logger;
