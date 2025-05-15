import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useNotification } from '@/context/NotificationContext';
import { useApp } from '@/context/AppContext';
import { toast } from 'sonner';
import { BellRing, Info } from 'lucide-react';
import { Separator } from '../ui/separator';
import NotificationPermissionAlert from './notifications/NotificationPermissionAlert';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { BackgroundNotificationCheck } from './notifications/BackgroundNotificationCheck';
import { NotificationTestButton } from './notifications/NotificationTestButton';
import { 
  initPushService, 
  setupBackgroundDetection, 
  supportsBackgroundNotifications,
  isIOS,
  isPWA
} from '@/services/pushService';

export const NotificationSettings: React.FC = () => {
  const { verificarSuporte, solicitarPermissao, permissaoNotificacoes, configuracoes, atualizarConfiguracoes, dispositivo } = useNotification();
  const { configNotificacoes, atualizarConfigNotificacoes } = useApp();
  
  const [suporte, setSuporteAtivo] = useState(false);
  const [iniciando, setIniciando] = useState(true);
  const [pushIniciado, setPushIniciado] = useState(false);
  
  // Verificar suporte e status do PWA
  const { supported: pushSupported, partial: partialPushSupport, reason: pushSupportReason } = supportsBackgroundNotifications();
  
  // Verificar suporte a notificações
  useEffect(() => {
    const suporteAtivo = verificarSuporte();
    setSuporteAtivo(suporteAtivo);
    setIniciando(false);

    // Inicializar serviço de push se suportado
    if (suporteAtivo && permissaoNotificacoes === 'granted' && (pushSupported || partialPushSupport)) {
      initPushService().then(success => {
        setPushIniciado(success);
        if (success) {
          console.log('Serviço de push inicializado com sucesso');
        } else {
          console.warn('Falha ao inicializar serviço de push');
        }
      });
    }
    
    // Sempre configurar detecção de segundo plano, pois é útil mesmo sem push
    setupBackgroundDetection();
  }, [verificarSuporte, permissaoNotificacoes]);
  
  // Garantir sincronização entre contextos
  useEffect(() => {
    // Somente sincronizar quando não estiver iniciando
    if (!iniciando) {
      atualizarConfigNotificacoes(configuracoes);
    }
  }, [configuracoes, atualizarConfigNotificacoes, iniciando]);
  
  // Efeito para verificar persistência de configurações no iOS
  useEffect(() => {
    if (isIOS) {
      // Verificar se as configurações existem no localStorage
      try {
        // Verificar após um curto período para garantir que o localStorage foi atualizado
        const timer = setTimeout(() => {
          const configSaved = localStorage.getItem('configuracoesNotificacao');
          if (!configSaved) {
            console.warn('Configurações de notificação não encontradas no localStorage');
            toast.warning("Configurações podem não persistir no iOS. Tente instalar o app como PWA.");
          } else {
            console.log('Configurações de notificação encontradas no localStorage');
          }
        }, 1000);
        
        return () => clearTimeout(timer);
      } catch (error) {
        console.error('Erro ao verificar persistência de configurações:', error);
      }
    }
  }, []);
  
  // Manipuladores de eventos
  const handleAtivacaoChange = (ativado: boolean) => {
    if (ativado && permissaoNotificacoes !== 'granted') {
      solicitarPermissao().then((permitido) => {
        if (permitido) {
          atualizarConfiguracoes({ ativadas: true });
          toast.success("Notificações ativadas com sucesso");
          
          // Tentar inicializar push service
          if (pushSupported || partialPushSupport) {
            initPushService().then(success => {
              setPushIniciado(success);
            });
          }
        } else {
          toast.error("Permissão para notificações negada");
        }
      });
    } else {
      atualizarConfiguracoes({ ativadas: ativado });
      if (ativado) {
        toast.success("Notificações ativadas com sucesso");
      } else {
        toast.success("Notificações desativadas");
      }
    }
  };
  
  const handleSomChange = (comSom: boolean) => {
    atualizarConfiguracoes({ comSom });
  };
  
  const handleAntecedenciaValorChange = (valor: string) => {
    atualizarConfiguracoes({
      antecedencia: {
        ...configuracoes.antecedencia,
        valor: parseInt(valor, 10)
      }
    });
  };
  
  const handleAntecedenciaUnidadeChange = (unidade: 'minutos' | 'horas') => {
    atualizarConfiguracoes({
      antecedencia: {
        ...configuracoes.antecedencia,
        unidade
      }
    });
  };
  
  // Caso não tenha suporte, mostrar mensagem
  if (!suporte) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Notificações</CardTitle>
            <CardDescription>Configure como e quando você deseja ser notificado sobre suas tarefas</CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Notificações não suportadas</AlertTitle>
              <AlertDescription>
                Seu navegador ou dispositivo não suporta notificações.
                Tente usar um navegador mais recente como Chrome, Firefox ou Edge.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Alerta de permissão */}
      <NotificationPermissionAlert 
        notificationSupported={suporte}
        permission={permissaoNotificacoes}
        onRequestPermission={solicitarPermissao}
      />
      
      {/* Configurações principais */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellRing className="h-5 w-5" />
            Notificações
          </CardTitle>
          <CardDescription>Configure como e quando você deseja ser notificado sobre suas tarefas</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base" htmlFor="notifications">Ativar notificações</Label>
                  <p className="text-sm text-muted-foreground">
                    Receba notificações quando suas tarefas estiverem próximas do prazo.
                  </p>
                </div>
                <Switch
                  id="notifications"
                  checked={configuracoes.ativadas}
                  onCheckedChange={handleAtivacaoChange}
                  disabled={permissaoNotificacoes === 'denied'}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base" htmlFor="sound">Som nas notificações</Label>
                  <p className="text-sm text-muted-foreground">
                    Reproduzir um som quando você receber uma notificação.
                  </p>
                </div>
                <Switch
                  id="sound"
                  checked={configuracoes.comSom}
                  onCheckedChange={handleSomChange}
                  disabled={!configuracoes.ativadas || permissaoNotificacoes === 'denied'}
                />
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-4">
              <h3 className="text-sm font-medium">Tempo de antecedência</h3>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={configuracoes.antecedencia.valor.toString()}
                  onValueChange={handleAntecedenciaValorChange}
                  disabled={!configuracoes.ativadas || permissaoNotificacoes === 'denied'}
                >
                  <SelectTrigger className="w-20">
                    <SelectValue placeholder={configuracoes.antecedencia.valor.toString()} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">5</SelectItem>
                    <SelectItem value="10">10</SelectItem>
                    <SelectItem value="15">15</SelectItem>
                    <SelectItem value="30">30</SelectItem>
                    <SelectItem value="60">60</SelectItem>
                    <SelectItem value="120">120</SelectItem>
                  </SelectContent>
                </Select>
                
                <Select
                  value={configuracoes.antecedencia.unidade}
                  onValueChange={(value) => handleAntecedenciaUnidadeChange(value as 'minutos' | 'horas')}
                  disabled={!configuracoes.ativadas || permissaoNotificacoes === 'denied'}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder={configuracoes.antecedencia.unidade} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minutos">minutos</SelectItem>
                    <SelectItem value="horas">horas</SelectItem>
                  </SelectContent>
                </Select>
                
                <p className="text-sm text-muted-foreground">antes da tarefa</p>
              </div>
            </div>
          </div>
        </CardContent>
        
        <CardFooter className="flex-col items-start gap-2">
          <p className="text-sm text-muted-foreground">
            As notificações só serão enviadas quando as tarefas tiverem data e hora definidas e
            a opção "Notificar" estiver ativada na tarefa.
          </p>
          
          {isIOS && (
            <Alert className="bg-orange-50 border-orange-200">
              <Info className="h-4 w-4 text-orange-500" />
              <AlertTitle>Dispositivo iOS detectado</AlertTitle>
              <AlertDescription>
                Para melhor experiência com notificações no iOS, adicione este aplicativo à tela de início (instale como PWA).
              </AlertDescription>
            </Alert>
          )}
          
          {/* Botão de teste */}
          {configuracoes.ativadas && permissaoNotificacoes === 'granted' && (
            <div className="mt-4 w-full">
              <NotificationTestButton />
            </div>
          )}
        </CardFooter>
      </Card>
      
      {/* Verificação de suporte para notificações em segundo plano */}
      <BackgroundNotificationCheck 
        onStatusChange={(enabled) => {
          if (enabled && !pushIniciado) {
            setPushIniciado(true);
            toast.success("Notificações em segundo plano ativadas com sucesso");
          }
        }} 
      />
    </div>
  );
};
