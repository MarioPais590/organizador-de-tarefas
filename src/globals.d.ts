import { BeforeInstallPromptEvent } from './types';

declare global {
  interface Window {
    /**
     * Evento usado para salvar o prompt de instalação do PWA
     * que será usado posteriormente para a instalação manual
     */
    deferredPrompt: BeforeInstallPromptEvent | null;
    
    /**
     * Timer usado para verificação de antecedência de notificações
     */
    antecedenciaTimer?: ReturnType<typeof setTimeout>;
    
    /**
     * Timer usado para verificação periódica de notificações pendentes
     */
    notificationCheckTimer?: ReturnType<typeof setTimeout>;
  }
}

export {}; 