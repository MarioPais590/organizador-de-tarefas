import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { isPWAInstalado, isIOS, verificarIconesPWA } from '@/utils/pwaHelpers';

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
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Verificar se o aplicativo já está instalado
    setIsStandalone(isPWAInstalado());
    
    // Verificar se os ícones estão carregados corretamente
    verificarIconesPWA().then(iconesSaoValidos => {
      if (!iconesSaoValidos) {
        console.warn('Alguns ícones do PWA podem estar corrompidos ou ausentes');
      }
    });
    
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
      console.log('PWA pode ser instalado!', e);
    };

    // Ouvir o evento appinstalled
    const handleAppInstalled = () => {
      // Esconder o botão de instalação
      setInstallable(false);
      setIsStandalone(true);
      // Limpar o prompt armazenado
      window.deferredPrompt = undefined;
      console.log('PWA foi instalado com sucesso!');
    };

    // Ouvir mudanças no modo de exibição
    const handleDisplayModeChange = (e: MediaQueryListEvent) => {
      setIsStandalone(e.matches);
    };

    // Registrar os event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);
    
    // Monitorar mudanças no modo de exibição
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    mediaQuery.addEventListener('change', handleDisplayModeChange);

    // Limpar os event listeners quando o componente for desmontado
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      mediaQuery.removeEventListener('change', handleDisplayModeChange);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!window.deferredPrompt) {
      console.log('Nenhum prompt de instalação disponível');
      
      // Alternativa para Safari no iOS onde o beforeinstallprompt não é suportado
      if (isIOS() && !isPWAInstalado()) {
        alert('Para instalar este aplicativo no iOS: toque no ícone de compartilhamento e depois em "Adicionar à Tela de Início".');
      }
      
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

  // Não renderizar nada se o app já estiver instalado ou não for instalável
  if (isStandalone || !installable) return null;

  return (
    <Button 
      onClick={handleInstallClick}
      variant="outline"
      className="flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
    >
      <Download size={16} />
      Instalar App
    </Button>
  );
} 