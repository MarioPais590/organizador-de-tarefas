import React, { useEffect, useState } from 'react';
import { Button } from '../../ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Alert, AlertDescription, AlertTitle } from '../../ui/alert';
import { AlertTriangle, CheckCircle, Download, Info, X } from 'lucide-react';
import { supportsBackgroundNotifications, initPushService } from '@/services/pushService';
import { toast } from 'sonner';
import { appLogger } from '@/utils/logger';

// Detectar se é iOS
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
             (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// Detectar se é Android
const isAndroid = /Android/.test(navigator.userAgent);

// Verificar se é PWA instalado
const isPWAInstalled = window.matchMedia('(display-mode: standalone)').matches || 
                      (window.navigator as any).standalone === true;

interface BackgroundNotificationCheckProps {
  onStatusChange?: (enabled: boolean) => void;
}

export const BackgroundNotificationCheck: React.FC<BackgroundNotificationCheckProps> = ({ 
  onStatusChange 
}) => {
  const [status, setStatus] = useState<'checking' | 'supported' | 'partially' | 'unsupported'>('checking');
  const [reason, setReason] = useState<string>('');
  const [isPushEnabled, setIsPushEnabled] = useState<boolean>(false);
  const [showInstallInstructions, setShowInstallInstructions] = useState<boolean>(false);

  // Verificar suporte a notificações em segundo plano
  useEffect(() => {
    checkBackgroundNotificationSupport();
  }, []);

  const checkBackgroundNotificationSupport = async () => {
    try {
      // Verificar se o service worker está ativo
      const sw = await navigator.serviceWorker.getRegistration();
      
      if (!sw) {
        setStatus('unsupported');
        setReason('Service Worker não está registrado.');
        if (onStatusChange) onStatusChange(false);
        return;
      }
      
      // Verificar se a API de notificações é suportada
      if (!('Notification' in window)) {
        setStatus('unsupported');
        setReason('Este navegador não suporta notificações.');
        if (onStatusChange) onStatusChange(false);
        return;
      }
      
      // Verificar suporte específico de notificações em segundo plano
      const result = supportsBackgroundNotifications();
      
      if (result.supported) {
        // Verificar se há suporte parcial
        if (result.partialSupport) {
          setStatus('partially');
          setReason(result.reason || 'Este dispositivo tem suporte limitado a notificações em segundo plano.');
          
          // Se tem permissão, mesmo com suporte parcial, notificar o parent
          if (Notification.permission === 'granted') {
            if (onStatusChange) onStatusChange(true);
          } else {
            if (onStatusChange) onStatusChange(false);
          }
        } else {
          // Verificar permissão atual
          if (Notification.permission === 'granted') {
            setStatus('supported');
            setIsPushEnabled(true);
            if (onStatusChange) onStatusChange(true);
          } else {
            setStatus('partially');
            setReason('É necessário permitir notificações.');
            if (onStatusChange) onStatusChange(false);
          }
        }
      } else {
        setStatus('unsupported');
        setReason(result.reason || 'Notificações em segundo plano não são suportadas neste dispositivo.');
        if (onStatusChange) onStatusChange(false);
      }
      
      // Verificar se dispositivo é iOS e não está instalado como PWA
      if (isIOS && !isPWAInstalled) {
        setStatus('partially');
        setReason('Para melhor suporte em iOS, instale o aplicativo na tela inicial.');
      }
      
    } catch (error) {
      appLogger.error('Erro ao verificar suporte a notificações:', error);
      setStatus('unsupported');
      setReason('Ocorreu um erro ao verificar o suporte a notificações.');
      if (onStatusChange) onStatusChange(false);
    }
  };

  const handleEnableNotifications = async () => {
    try {
      const result = await initPushService();
      
      if (result) {
        setStatus('supported');
        setIsPushEnabled(true);
        toast.success('Notificações em segundo plano habilitadas com sucesso!');
        if (onStatusChange) onStatusChange(true);
      } else {
        if (Notification.permission === 'denied') {
          setStatus('unsupported');
          setReason('Permissão de notificações negada. Verifique as configurações do seu navegador.');
          toast.error('Você negou a permissão de notificações. Altere nas configurações do navegador.');
        } else {
          setStatus('partially');
          setReason('Não foi possível habilitar notificações em segundo plano.');
          toast.error('Não foi possível habilitar notificações em segundo plano.');
        }
        if (onStatusChange) onStatusChange(false);
      }
    } catch (error) {
      appLogger.error('Erro ao habilitar notificações:', error);
      toast.error('Ocorreu um erro ao habilitar notificações.');
      if (onStatusChange) onStatusChange(false);
    }
  };

  const showPWAInstallInstructions = () => {
    setShowInstallInstructions(true);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Notificações em segundo plano
          {status === 'supported' && isPushEnabled && (
            <Badge variant="outline" className="bg-green-100 text-green-800">
              Ativas
            </Badge>
          )}
          {status === 'partially' && (
            <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
              Configuração necessária
            </Badge>
          )}
          {status === 'unsupported' && (
            <Badge variant="outline" className="bg-red-100 text-red-800">
              Não suportadas
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Receba notificações mesmo quando o aplicativo estiver fechado ou a tela desligada
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {status === 'checking' && (
          <div className="text-center py-4">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto mb-2"></div>
            <p>Verificando suporte a notificações...</p>
          </div>
        )}
        
        {status === 'supported' && isPushEnabled && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <AlertTitle>Notificações em segundo plano estão ativas</AlertTitle>
            <AlertDescription>
              Você receberá notificações mesmo quando o aplicativo estiver fechado ou a tela desligada.
            </AlertDescription>
          </Alert>
        )}
        
        {status === 'partially' && (
          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertTriangle className="h-4 w-4 text-yellow-500" />
            <AlertTitle>Configuração adicional necessária</AlertTitle>
            <AlertDescription>
              {reason}
            </AlertDescription>
          </Alert>
        )}
        
        {status === 'unsupported' && (
          <Alert className="bg-red-50 border-red-200">
            <X className="h-4 w-4 text-red-500" />
            <AlertTitle>Não suportado neste dispositivo ou navegador</AlertTitle>
            <AlertDescription>
              {reason}
            </AlertDescription>
          </Alert>
        )}
        
        {/* Instruções específicas para iOS */}
        {isIOS && !isPWAInstalled && (
          <div className="mt-4">
            <Alert className="bg-blue-50 border-blue-200">
              <Info className="h-4 w-4 text-blue-500" />
              <AlertTitle>Recomendação para iPhone/iPad</AlertTitle>
              <AlertDescription>
                Para o melhor suporte a notificações no iOS, recomendamos instalar o aplicativo na tela inicial.
                <Button
                  variant="link"
                  className="p-0 h-auto text-blue-600"
                  onClick={showPWAInstallInstructions}
                >
                  Ver instruções
                </Button>
              </AlertDescription>
            </Alert>
            
            {showInstallInstructions && (
              <div className="mt-4 p-4 bg-gray-50 rounded-md">
                <h4 className="font-medium mb-2">Como instalar no iOS:</h4>
                <ol className="list-decimal pl-5 space-y-2">
                  <li>Toque no ícone de compartilhamento <span className="inline-block px-2 py-1 bg-gray-200 rounded">Compartilhar</span> no Safari</li>
                  <li>Role para baixo e toque em <span className="inline-block px-2 py-1 bg-gray-200 rounded">Adicionar à Tela de Início</span></li>
                  <li>Toque em <span className="inline-block px-2 py-1 bg-gray-200 rounded">Adicionar</span> no canto superior direito</li>
                </ol>
              </div>
            )}
          </div>
        )}
        
        {/* Instruções específicas para Android */}
        {isAndroid && !isPWAInstalled && (
          <Alert className="bg-blue-50 border-blue-200">
            <Info className="h-4 w-4 text-blue-500" />
            <AlertTitle>Recomendação para Android</AlertTitle>
            <AlertDescription>
              Para melhor desempenho no Android, recomendamos instalar o aplicativo.
              Toque no banner "Adicionar à tela inicial" ou no menu do navegador.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      
      <CardFooter className="flex justify-end">
        {status === 'partially' && (
          <Button 
            onClick={handleEnableNotifications} 
            className="bg-blue-600 hover:bg-blue-700"
          >
            Habilitar notificações
          </Button>
        )}
        
        {isIOS && !isPWAInstalled && (
          <Button 
            variant="outline" 
            className="mr-2 flex items-center gap-1"
            onClick={showPWAInstallInstructions}
          >
            <Download className="h-4 w-4" />
            Instalar na tela inicial
          </Button>
        )}
      </CardFooter>
    </Card>
  );
};

export default BackgroundNotificationCheck; 