/**
 * Sistema de logs centralizado para facilitar a depuração
 */

/**
 * Camada de abstração para logs da aplicação
 * Permite controlar o nível de log por ambiente e por namespace
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  data?: any;
}

interface LoggerOptions {
  minLevel?: LogLevel;
  enabled?: boolean;
  persistToStorage?: boolean;
  maxLogEntries?: number;
  namespace?: string;
  productionMode?: boolean;
}

// Definir se estamos em produção baseado no ambiente
const isProduction = process.env.NODE_ENV === 'production';

class Logger {
  private options: LoggerOptions;
  private logHistory: LogEntry[] = [];
  private namespace: string = '';

  constructor(options: LoggerOptions = {}) {
    // Definir opções padrão
    this.options = {
      minLevel: 'info',
      enabled: true,
      persistToStorage: false,
      maxLogEntries: 100,
      namespace: '',
      productionMode: isProduction,
      ...options
    };
    
    this.namespace = this.options.namespace || '';
    
    // Em produção, definir nível mínimo para erro
    if (this.options.productionMode && !options.minLevel) {
      this.options.minLevel = 'error';
    }
  }

  createNamespace(namespace: string): Logger {
    return new Logger({
      ...this.options,
      namespace
    });
  }

  debug(message: string, data?: any): void {
    this.log('debug', message, data);
  }

  info(message: string, data?: any): void {
    this.log('info', message, data);
  }

  warn(message: string, data?: any): void {
    this.log('warn', message, data);
  }

  error(message: string, data?: any): void {
    this.log('error', message, data);
  }

  private shouldLog(level: LogLevel): boolean {
    const levels: Record<LogLevel, number> = {
      debug: 0,
      info: 1,
      warn: 2,
      error: 3
    };
    
    if (!this.options.enabled) return false;
    
    // Se estivermos em produção, apenas permitir logs de erro, a menos que seja explicitamente definido
    if (this.options.productionMode && this.options.minLevel !== 'debug' && this.options.minLevel !== 'info' && this.options.minLevel !== 'warn') {
      return level === 'error';
    }
    
    return levels[level] >= levels[this.options.minLevel || 'info'];
  }

  private log(level: LogLevel, message: string, data?: any): void {
    if (!this.shouldLog(level)) return;
    
    const formattedMessage = this.namespace 
      ? `[${this.namespace}] ${message}`
      : message;
    
    // Adicionar à história de logs
    this.addToHistory(level, formattedMessage, data);
    
    // Enviar para o console
    switch (level) {
      case 'debug':
        console.debug(formattedMessage, data || '');
        break;
      case 'info':
        console.info(formattedMessage, data || '');
        break;
      case 'warn':
        console.warn(formattedMessage, data || '');
        break;
      case 'error':
        console.error(formattedMessage, data || '');
        break;
    }
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
    if (typeof localStorage !== 'undefined') {
      try {
        const storageKey = this.namespace 
          ? `app_logs_${this.namespace}`
          : 'app_logs';
        
        localStorage.setItem(storageKey, JSON.stringify(this.logHistory));
      } catch (e) {
        // Falha ao persistir logs - provavelmente problema de espaço ou permissão
        console.error('Falha ao persistir logs no localStorage', e);
      }
    }
  }

  getLogHistory(): LogEntry[] {
    return [...this.logHistory];
  }

  clearHistory(): void {
    this.logHistory = [];
    
    if (this.options.persistToStorage && typeof localStorage !== 'undefined') {
      const storageKey = this.namespace 
        ? `app_logs_${this.namespace}`
        : 'app_logs';
      
      localStorage.removeItem(storageKey);
    }
  }
  
  /**
   * Configura o modo de produção (reduz logs significativamente)
   */
  setProductionMode(enabled: boolean): void {
    this.options.productionMode = enabled;
    
    // Em produção, permitir apenas logs de erro por padrão
    if (enabled && this.options.minLevel === 'info') {
      this.options.minLevel = 'error';
    }
  }
  
  /**
   * Ativa/desativa todos os logs
   */
  setEnabled(enabled: boolean): void {
    this.options.enabled = enabled;
  }
  
  /**
   * Define o nível mínimo de log
   */
  setMinLevel(level: LogLevel): void {
    this.options.minLevel = level;
  }
}

// Criar instância global do logger
export const logger = new Logger({
  minLevel: isProduction ? 'error' : 'debug',
  enabled: true,
  persistToStorage: false,
  productionMode: isProduction
});

// Criar instância específica para logs da aplicação
export const appLogger = logger.createNamespace('App');

// Exportar logger como padrão
export default logger; 