import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { isPWAInstalado } from '@/utils/pwaHelpers';
import { toast } from 'sonner';
import { BeforeInstallPromptEvent } from '@/types';

export function PWAInstallButton() {
  const [podeInstalar, setPodeInstalar] = useState<boolean>(false);
  const [isInstalado, setIsInstalado] = useState<boolean>(false);

  useEffect(() => {
    // Verificar se já está instalado
    setIsInstalado(isPWAInstalado());

    // Verificar se o navegador suporta a API de instalação
    const verificarInstalacao = () => {
      setPodeInstalar(!!window.deferredPrompt);
    };

    // Evento disparado quando o PWA pode ser instalado
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevenir comportamento padrão
      e.preventDefault();
      // Armazenar o evento para uso posterior
      window.deferredPrompt = e as BeforeInstallPromptEvent;
      // Atualizar estado para mostrar o botão
      setPodeInstalar(true);
    };

    // Evento disparado quando o PWA é instalado
    const handleAppInstalled = () => {
      // Limpar prompt armazenado
      window.deferredPrompt = null;
      // Atualizar estado
      setPodeInstalar(false);
      setIsInstalado(true);
      toast.success('O app foi instalado com sucesso!');
    };

    // Adicionar event listeners
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Verificar estado inicial
    verificarInstalacao();

    // Remover event listeners ao desmontar
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!window.deferredPrompt) {
      console.error('Não há prompt de instalação disponível');
      return;
    }

    try {
      // Mostrar prompt de instalação
      const promptEvent = window.deferredPrompt;
      // Mostrar o prompt
      await promptEvent.prompt();
      // Aguardar a escolha do usuário
      const choiceResult = await promptEvent.userChoice;
      
      // Limpar o prompt armazenado, independente da escolha
      window.deferredPrompt = null;
      setPodeInstalar(false);
      
      if (choiceResult.outcome === 'accepted') {
        console.log('Usuário aceitou a instalação do PWA');
      } else {
        console.log('Usuário recusou a instalação do PWA');
      }
    } catch (error) {
      console.error('Erro ao instalar o PWA:', error);
      toast.error('Erro ao instalar o aplicativo');
    }
  };

  // Não exibir o botão se o PWA já estiver instalado ou não puder ser instalado
  if (isInstalado || !podeInstalar) {
    return null;
  }

  return (
    <Button 
      onClick={handleInstall} 
      variant="default" 
      size="sm" 
      className="bg-azulPrincipal hover:bg-azulPrincipal/80"
    >
      <Download className="h-4 w-4 mr-2" /> Instalar App
    </Button>
  );
} 