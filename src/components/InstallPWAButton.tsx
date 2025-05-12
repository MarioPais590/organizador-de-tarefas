import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

// Interface para o evento beforeinstallprompt
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Estender a interface Window para incluir nossa propriedade personalizada
declare global {
  interface Window {
    deferredPrompt?: BeforeInstallPromptEvent;
  }
}

export function InstallPWAButton() {
  const [installable, setInstallable] = useState(false);

  useEffect(() => {
    // Verificar se já existe um prompt armazenado
    if (window.deferredPrompt) {
      setInstallable(true);
    }

    // Ouvir o evento beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevenir o comportamento padrão do Chrome
      e.preventDefault();
      // Armazenar o evento para uso posterior
      window.deferredPrompt = e as BeforeInstallPromptEvent;
      // Mostrar o botão de instalação
      setInstallable(true);
    };

    // Ouvir o evento appinstalled
    const handleAppInstalled = () => {
      // Esconder o botão de instalação
      setInstallable(false);
      // Limpar o prompt armazenado
      window.deferredPrompt = undefined;
      console.log('PWA foi instalado com sucesso!');
    };

    // Registrar os event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Limpar os event listeners quando o componente for desmontado
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!window.deferredPrompt) {
      console.log('Nenhum prompt de instalação disponível');
      return;
    }

    try {
      // Mostrar o prompt de instalação
      await window.deferredPrompt.prompt();
      
      // Aguardar a escolha do usuário
      const choiceResult = await window.deferredPrompt.userChoice;
      
      if (choiceResult.outcome === 'accepted') {
        console.log('Usuário aceitou a instalação');
      } else {
        console.log('Usuário recusou a instalação');
      }
      
      // Limpar o prompt armazenado
      window.deferredPrompt = undefined;
      setInstallable(false);
    } catch (error) {
      console.error('Erro ao tentar instalar o PWA:', error);
    }
  };

  // Não renderizar nada se o app não for instalável
  if (!installable) return null;

  return (
    <Button 
      onClick={handleInstallClick}
      variant="outline"
      className="flex items-center gap-2"
    >
      <Download size={16} />
      Instalar App
    </Button>
  );
} 