import { logger } from './logger';

// Utilitário para capturar e registrar erros na aplicação
const isBrowser = typeof window !== 'undefined';

// Salva o console original para poder restaurá-lo
const originalConsole = isBrowser ? { ...console } : null;

// Armazena os logs para diagnóstico
let errorLogs: string[] = [];
let warnLogs: string[] = [];
let infoLogs: string[] = [];

// Logger dedicado para errors
const errorLogger = logger.createNamespace('Error');

/**
 * Inicializa captura de erros global
 */
export const initializeErrorLogging = () => {
  if (!isBrowser) return;

  try {
    // Capturar erros não tratados
    window.addEventListener('error', (event) => {
      const errorMsg = `ERRO GLOBAL: ${event.message} em ${event.filename}:${event.lineno}:${event.colno}`;
      errorLogs.push(errorMsg);
      errorLogger.error(errorMsg);
      
      // Salvar logs no localStorage para diagnóstico
      localStorage.setItem('app_error_logs', JSON.stringify(errorLogs));
      return false; // Não impede o comportamento padrão
    });

    // Capturar rejeições de promessas não tratadas
    window.addEventListener('unhandledrejection', (event) => {
      const errorMsg = `PROMESSA NÃO TRATADA: ${event.reason}`;
      errorLogs.push(errorMsg);
      errorLogger.error(errorMsg);
      
      // Salvar logs no localStorage para diagnóstico
      localStorage.setItem('app_error_logs', JSON.stringify(errorLogs));
      return false; // Não impede o comportamento padrão
    });

    // Sobrescrever métodos de console para capturar logs
    console.error = (...args) => {
      const errorMsg = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      
      errorLogs.push(errorMsg);
      localStorage.setItem('app_error_logs', JSON.stringify(errorLogs));
      originalConsole?.error(...args);
    };

    console.warn = (...args) => {
      const warnMsg = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      
      warnLogs.push(warnMsg);
      localStorage.setItem('app_warn_logs', JSON.stringify(warnLogs));
      originalConsole?.warn(...args);
    };

    console.info = (...args) => {
      const infoMsg = args.map(arg => 
        typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
      ).join(' ');
      
      infoLogs.push(infoMsg);
      localStorage.setItem('app_info_logs', JSON.stringify(infoLogs));
      originalConsole?.info(...args);
    };

    // Carregar logs existentes do localStorage
    try {
      const savedErrorLogs = localStorage.getItem('app_error_logs');
      const savedWarnLogs = localStorage.getItem('app_warn_logs');
      const savedInfoLogs = localStorage.getItem('app_info_logs');
      
      if (savedErrorLogs) errorLogs = JSON.parse(savedErrorLogs);
      if (savedWarnLogs) warnLogs = JSON.parse(savedWarnLogs);
      if (savedInfoLogs) infoLogs = JSON.parse(savedInfoLogs);
    } catch (e) {
      // Ignorar erros ao carregar logs
      errorLogger.error("Erro ao carregar logs do localStorage:", e);
    }

    errorLogger.info('Sistema de logging de erros inicializado com sucesso');
  } catch (error) {
    // Se não conseguir configurar o logger, apenas log o erro
    if (originalConsole) {
      originalConsole.error('Erro ao inicializar sistema de logging:', error);
    }
  }
};

/**
 * Obtém os logs de erro para diagnóstico
 */
export const getErrorLogs = () => {
  // Adicionar também os logs capturados pelo nosso logger centralizado
  const loggerErrorHistory = logger.getHistory('error').map(entry => 
    `${new Date(entry.timestamp).toISOString()} - ${entry.message}`
  );
  
  return {
    errors: [...errorLogs, ...loggerErrorHistory],
    warnings: [...warnLogs, ...logger.getHistory('warn').map(entry => 
      `${new Date(entry.timestamp).toISOString()} - ${entry.message}`
    )],
    info: [...infoLogs, ...logger.getHistory('info').map(entry => 
      `${new Date(entry.timestamp).toISOString()} - ${entry.message}`
    )]
  };
};

/**
 * Limpa todos os logs armazenados
 */
export const clearLogs = () => {
  errorLogs = [];
  warnLogs = [];
  infoLogs = [];
  
  // Limpar logs do logger centralizado
  logger.clearHistory();
  
  if (isBrowser) {
    try {
      localStorage.removeItem('app_error_logs');
      localStorage.removeItem('app_warn_logs');
      localStorage.removeItem('app_info_logs');
    } catch (e) {
      // Ignorar erros ao limpar logs
      errorLogger.error("Erro ao limpar logs do localStorage:", e);
    }
  }
};

// Exportar um objeto com funções úteis para diagnóstico
export const ErrorLogger = {
  initialize: initializeErrorLogging,
  getLogs: getErrorLogs,
  clearLogs: clearLogs
}; 