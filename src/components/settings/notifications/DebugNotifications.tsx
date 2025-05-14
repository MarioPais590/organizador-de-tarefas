import React, { useState } from 'react';
import { Button } from '../../ui/button';
import { Label } from '../../ui/label';
import { Input } from '../../ui/input';
import { toast } from 'sonner';
import { appLogger } from '@/utils/logger';
import { Badge } from '../../ui/badge';
import { verificarSuporteNotificacoes } from '@/services/notificationService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import ErrorHistoryViewer from './ErrorHistoryViewer';

// Estendendo o tipo NotificationOptions para incluir vibrate
interface ExtendedNotificationOptions extends NotificationOptions {
  vibrate?: number[];
  renotify?: boolean;
}

export const DebugNotifications: React.FC = () => {
  const [title, setTitle] = useState('Notificação de Teste');
  const [body, setBody] = useState('Esta é uma notificação de teste para depuração.');
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [testMessage, setTestMessage] = useState('');

  const testNotification = async () => {
    try {
      if (!('Notification' in window)) {
        setTestResult('error');
        setTestMessage('API de Notificação não suportada neste navegador');
        appLogger.error('API de Notificação não suportada');
        return;
      }

      // Verificar se as notificações são suportadas
      const notificacaoSuportada = verificarSuporteNotificacoes();
      if (!notificacaoSuportada) {
        setTestResult('error');
        setTestMessage('Notificações não são suportadas neste dispositivo/navegador');
        appLogger.warn('Notificações não são suportadas');
        return;
      }

      if (Notification.permission !== 'granted') {
        // Tentar obter permissão
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          setTestResult('error');
          setTestMessage('Permissão de notificação negada pelo usuário');
          return;
        }
      }

      // Enviar notificação de teste
      const options: ExtendedNotificationOptions = {
        body: body,
        icon: '/icons/icon-192x192.png',
        badge: '/icons/badge-72x72.png',
        tag: 'debug-test',
        vibrate: [200, 100, 200],
        requireInteraction: true,
        renotify: true,
        data: { test: true, timestamp: Date.now() }
      };

      const notification = new Notification(title, options);

      notification.onclick = (event) => {
        appLogger.info('Notificação de teste clicada', event);
        notification.close();
        window.focus();
      };

      // Reproduzir som de teste
      try {
        const audio = new Audio('/sounds/notification.mp3');
        await audio.play();
      } catch (audioError) {
        appLogger.error('Erro ao reproduzir som', audioError);
      }

      setTestResult('success');
      setTestMessage('Notificação enviada com sucesso!');
      appLogger.info('Notificação de teste enviada com sucesso');
      toast.success('Notificação de teste enviada');
    } catch (error) {
      setTestResult('error');
      setTestMessage(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      appLogger.error('Erro ao enviar notificação de teste', error);
      toast.error('Erro ao enviar notificação de teste');
    }
  };

  const renderStatus = () => {
    if (testResult === 'success') {
      return <Badge className="bg-green-100 text-green-800">Sucesso</Badge>;
    } else if (testResult === 'error') {
      return <Badge className="bg-red-100 text-red-800">Erro</Badge>;
    }
    return null;
  };

  const testServiceWorker = async () => {
    try {
      if (!('serviceWorker' in navigator)) {
        toast.error('Service Worker não é suportado neste navegador');
        return;
      }

      const registration = await navigator.serviceWorker.getRegistration();
      if (!registration) {
        toast.error('Nenhum Service Worker registrado');
        return;
      }

      toast.success('Enviando mensagem para o Service Worker');
      registration.active?.postMessage({
        type: 'CHECK_NOW'
      });
    } catch (error) {
      appLogger.error('Erro ao testar Service Worker', error);
      toast.error('Erro ao testar Service Worker');
    }
  };

  return (
    <div className="p-4 border border-dashed rounded-md bg-muted/50">
      <h3 className="text-sm font-medium mb-4 flex items-center gap-2">
        Ferramentas de diagnóstico de notificações
        {testResult && renderStatus()}
      </h3>

      <Tabs defaultValue="tester">
        <TabsList className="mb-4">
          <TabsTrigger value="tester">Teste de notificação</TabsTrigger>
          <TabsTrigger value="errors">Histórico de erros</TabsTrigger>
        </TabsList>
        
        <TabsContent value="tester">
          <div className="space-y-4 mb-4">
            <div>
              <Label htmlFor="notification-title">Título</Label>
              <Input 
                id="notification-title" 
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Título da notificação"
              />
            </div>
            
            <div>
              <Label htmlFor="notification-body">Conteúdo</Label>
              <Input 
                id="notification-body" 
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Conteúdo da notificação"
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={testNotification}
            >
              Testar notificação
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={testServiceWorker}
            >
              Testar Service Worker
            </Button>
          </div>

          {testMessage && (
            <div className={`mt-4 text-xs p-2 rounded ${
              testResult === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
            }`}>
              {testMessage}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="errors">
          <ErrorHistoryViewer maxErrors={10} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default DebugNotifications; 