import { mkdir, writeTextFile, readTextFile, exists } from '@tauri-apps/plugin-fs';
import { appDataDir, join } from '@tauri-apps/api/path';

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
  private fileLoggingEnabled = false;
  private logDir: string | null = null;
  private writeQueue: string[] = [];
  private isWriting = false;
  private initialized = false;

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

    if (this.fileLoggingEnabled && this.logDir) {
      this.writeToFile(entry);
    }
  }

  private formatLogEntry(entry: LogEntry): string {
    const dataStr = entry.data ? ` | ${JSON.stringify(entry.data)}` : '';
    return `[${entry.timestamp.toISOString()}] [${entry.level.toUpperCase()}] ${entry.message}${dataStr}`;
  }

  private getLogFileName(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `superskin-${year}-${month}-${day}.log`;
  }

  private async writeToFile(entry: LogEntry): Promise<void> {
    if (!this.logDir) return;
    
    const logLine = this.formatLogEntry(entry) + '\n';
    this.writeQueue.push(logLine);
    
    if (!this.isWriting) {
      this.processWriteQueue();
    }
  }

  private async processWriteQueue(): Promise<void> {
    if (this.writeQueue.length === 0 || !this.logDir) {
      this.isWriting = false;
      return;
    }

    this.isWriting = true;

    const logFileName = this.getLogFileName();
    const logPath = await join(this.logDir, logFileName);
    const content = this.writeQueue.join('');
    this.writeQueue = [];

    try {
      const fileExists = await exists(logPath);
      
      if (fileExists) {
        const existingContent = await readTextFile(logPath);
        await writeTextFile(logPath, existingContent + content);
      } else {
        await writeTextFile(logPath, content);
      }
    } catch (error) {
      console.error('Failed to write log file:', error);
    }

    this.processWriteQueue();
  }

  async enableFileLogging(): Promise<void> {
    if (this.initialized) return;
    
    try {
      const appDir = await appDataDir();
      this.logDir = await join(appDir, 'logs');
      
      await mkdir(this.logDir, { recursive: true });
      
      this.fileLoggingEnabled = true;
      this.initialized = true;
      this.info('File logging enabled', { logDir: this.logDir });
    } catch (error) {
      console.error('Failed to enable file logging:', error);
    }
  }

  disableFileLogging(): void {
    this.fileLoggingEnabled = false;
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
      .map((log) => this.formatLogEntry(log))
      .join('\n');
  }

  async getLogFilePath(): Promise<string | null> {
    if (!this.logDir) return null;
    return await join(this.logDir, this.getLogFileName());
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
