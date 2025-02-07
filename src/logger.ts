export const enum LogLevel {
  Log = 1,
  Info = 2,
  Warn = 3,
  Error = 4,
  None = 5,
}

export class Logger {
  level: LogLevel;

  constructor(level: LogLevel) {
    this.level = level;
  }

  log(...args: unknown[]) {
    if (this.level <= LogLevel.Log) console.log(...args);
  }

  logErr(...args: unknown[]) {
    if (this.level <= LogLevel.Log) console.warn(...args);
  }

  info(...args: unknown[]) {
    if (this.level <= LogLevel.Info) console.info(...args);
  }

  infoErr(...args: unknown[]) {
    if (this.level <= LogLevel.Info) console.warn(...args);
  }

  warn(...args: unknown[]) {
    if (this.level <= LogLevel.Warn) console.warn(...args);
  }

  error(...args: unknown[]) {
    if (this.level <= LogLevel.Error) console.error(...args);
  }
}

export const logger = new Logger(LogLevel.Info);
