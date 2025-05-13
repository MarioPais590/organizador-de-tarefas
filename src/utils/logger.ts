/**
 * Sistema de logs centralizado para facilitar a depuração
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LoggerOptions {
  enabled: boolean;
  level: LogLevel;
  prefix?: string;
  persistToStorage?: boolean;
  storageKey?: string;
  maxLogEntries?: number;
}

const DEFAULT_OPTIONS: LoggerOptions = {
  enabled: true,
  level: 'debug',
  prefix: '[App]',
  persistToStorage: true,
  storageKey: 'app_logs',
  maxLogEntries: 100
};

class Logger {
  private options: LoggerOptions;
  private logHistory: Array<{
    timestamp: number;
    level: LogLevel;
    message: string;
    data?: any;
  }> = [];

  constructor(options: Partial<LoggerOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    
    // Carregar logs do storage se necessário
    if (this.options.persistToStorage) {
      this.loadFromStorage();
    }
  }

  private get isDebugEnabled(): boolean {
    return this.options.enabled && ['debug', 'info', 'warn', 'error'].includes(this.options.level);
  }

  private get isInfoEnabled(): boolean {
    return this.options.enabled && ['info', 'warn', 'error'].includes(this.options.level);
  }

  private get isWarnEnabled(): boolean {
    return this.options.enabled && ['warn', 'error'].includes(this.options.level);
  }

  private get isErrorEnabled(): boolean {
    return this.options.enabled && ['error'].includes(this.options.level);
  }

  private formatMessage(message: string): string {
    return `${this.options.prefix} ${message}`;
  }

  private addToHistory(level: LogLevel, message: string, data?: any): void {
    this.logHistory.unshift({
      timestamp: Date.now(),
      level,
      message,
      data
    });

    // Limitar o tamanho da história
    if (this.logHistory.length > (this.options.maxLogEntries || 100)) {
      this.logHistory = this.logHistory.slice(0, this.options.maxLogEntries);
    }

    // Persistir no storage se necessário
    if (this.options.persistToStorage) {
      this.saveToStorage();
    }
  }

  private saveToStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(
          this.options.storageKey || 'app_logs',
          JSON.stringify(this.logHistory)
        );
      }
    } catch (error) {
      console.error('Falha ao salvar logs no storage:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      if (typeof localStorage !== 'undefined') {
        const logs = localStorage.getItem(this.options.storageKey || 'app_logs');
        if (logs) {
          this.logHistory = JSON.parse(logs);
        }
      }
    } catch (error) {
      console.error('Falha ao carregar logs do storage:', error);
    }
  }

  debug(message: string, ...data: any[]): void {
    if (this.isDebugEnabled) {
      console.debug(this.formatMessage(message), ...data);
      this.addToHistory('debug', message, data.length ? data : undefined);
    }
  }

  info(message: string, ...data: any[]): void {
    if (this.isInfoEnabled) {
      console.info(this.formatMessage(message), ...data);
      this.addToHistory('info', message, data.length ? data : undefined);
    }
  }

  warn(message: string, ...data: any[]): void {
    if (this.isWarnEnabled) {
      console.warn(this.formatMessage(message), ...data);
      this.addToHistory('warn', message, data.length ? data : undefined);
    }
  }

  error(message: string, ...data: any[]): void {
    if (this.isErrorEnabled) {
      console.error(this.formatMessage(message), ...data);
      this.addToHistory('error', message, data.length ? data : undefined);
    }
  }

  getHistory(level?: LogLevel): Array<{
    timestamp: number;
    level: LogLevel;
    message: string;
    data?: any;
  }> {
    if (level) {
      return this.logHistory.filter(entry => entry.level === level);
    }
    return this.logHistory;
  }

  clearHistory(): void {
    this.logHistory = [];
    if (this.options.persistToStorage && typeof localStorage !== 'undefined') {
      localStorage.removeItem(this.options.storageKey || 'app_logs');
    }
  }

  /**
   * Cria uma instância derivada do logger com prefixo personalizado
   */
  createNamespace(namespace: string): Logger {
    return new Logger({
      ...this.options,
      prefix: `${this.options.prefix}:${namespace}`
    });
  }
}

// Instância global do logger
export const logger = new Logger();

// Namespaces específicos pré-configurados
export const appLogger = logger.createNamespace('App');
export const authLogger = logger.createNamespace('Auth');
export const apiLogger = logger.createNamespace('API');
export const pwaLogger = logger.createNamespace('PWA');
export const storageLogger = logger.createNamespace('Storage');

export default logger; 