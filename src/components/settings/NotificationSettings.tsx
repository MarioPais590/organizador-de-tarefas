import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useNotification } from '@/context/NotificationContext';
import { useApp } from '@/context/AppContext';
import { toast } from 'sonner';
import { BellRing, Info, Edit, Check } from 'lucide-react';
import { Separator } from '../ui/separator';
import NotificationPermissionAlert from './notifications/NotificationPermissionAlert';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { BackgroundNotificationCheck } from './notifications/BackgroundNotificationCheck';
import { NotificationTestButton } from './notifications/NotificationTestButton';
import { Input } from "@/components/ui/input";
import { 
  initPushService, 
  setupBackgroundDetection, 
  supportsBackgroundNotifications,
  isIOS,
  isPWA,
  isAndroid
} from '@/services/pushService';

// Função de utilidade para comparar objetos profundamente
const deepEqual = (obj1: any, obj2: any): boolean => {
  if (obj1 === obj2) return true;
  
  if (typeof obj1 !== 'object' || obj1 === null || 
      typeof obj2 !== 'object' || obj2 === null) {
    return false;
  }
  
  const keys1 = Object.keys(obj1);
  const keys2 = Object.keys(obj2);
  
  if (keys1.length !== keys2.length) return false;
  
  for (const key of keys1) {
    if (!keys2.includes(key)) return false;
    if (!deepEqual(obj1[key], obj2[key])) return false;
  }
  
  return true;
};

export const NotificationSettings: React.FC = () => {
  const { verificarSuporte, solicitarPermissao, permissaoNotificacoes, configuracoes, atualizarConfiguracoes, dispositivo } = useNotification();
  const { configNotificacoes, atualizarConfigNotificacoes } = useApp();
  
  const [suporte, setSuporteAtivo] = useState(false);
  const [iniciando, setIniciando] = useState(true);
  const [pushIniciado, setPushIniciado] = useState(false);
  const [tempoPersonalizado, setTempoPersonalizado] = useState(false);
  const [valorCustom, setValorCustom] = useState("");
  
  // Referências para controlar as atualizações
  const prevConfiguracoes = useRef(configuracoes);
  const prevConfigNotificacoes = useRef(configNotificacoes);
  const syncingRef = useRef(false);
  
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
    // Prevenir loop infinito e atualizações desnecessárias
    if (iniciando || syncingRef.current) return;
    
    // Verificar se as configurações realmente mudaram usando comparação profunda
    if (!deepEqual(configuracoes, prevConfigNotificacoes.current)) {
      console.log('Sincronizando configurações do NotificationContext para AppContext');
      syncingRef.current = true;
      
      // Atualizar a referência
      prevConfigNotificacoes.current = configuracoes;
      
      // Atualizar o contexto do App
      atualizarConfigNotificacoes(configuracoes);
      
      // Liberar flag após um pequeno atraso para garantir que as atualizações foram processadas
      setTimeout(() => {
        syncingRef.current = false;
      }, 100);
    }
  }, [configuracoes, atualizarConfigNotificacoes, iniciando]);
  
  // Sincronização no sentido inverso (AppContext -> NotificationContext)
  useEffect(() => {
    // Prevenir loop infinito e atualizações desnecessárias
    if (iniciando || syncingRef.current) return;
    
    // Verificar se as configurações realmente mudaram usando comparação profunda
    if (!deepEqual(configNotificacoes, prevConfiguracoes.current)) {
      console.log('Sincronizando configurações do AppContext para NotificationContext');
      syncingRef.current = true;
      
      // Atualizar a referência
      prevConfiguracoes.current = configNotificacoes;
      
      // Atualizar o contexto de Notificação
      atualizarConfiguracoes(configNotificacoes);
      
      // Liberar flag após um pequeno atraso para garantir que as atualizações foram processadas
      setTimeout(() => {
        syncingRef.current = false;
      }, 100);
    }
  }, [configNotificacoes, atualizarConfiguracoes, iniciando]);
  
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

  // Verificar se valores personalizados estão sendo usados
  useEffect(() => {
    const valores = [5, 10, 15, 30, 60, 120];
    const horasValores = [1, 2, 3, 6, 12, 24];
    
    // Verificar se o valor atual está entre os valores pré-definidos
    const isStandardValue = configuracoes.antecedencia.unidade === 'minutos' 
      ? valores.includes(configuracoes.antecedencia.valor)
      : horasValores.includes(configuracoes.antecedencia.valor);
    
    setTempoPersonalizado(!isStandardValue);
    setValorCustom(configuracoes.antecedencia.valor.toString());
  }, [configuracoes.antecedencia.valor, configuracoes.antecedencia.unidade]);
  
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
    // Converter o valor para número inteiro
    const novoValor = parseInt(valor, 10);
    
    // Verificar se é um número válido
    if (!isNaN(novoValor) && novoValor > 0) {
      // Aplicar limitações baseadas na unidade
      const maxValor = configuracoes.antecedencia.unidade === 'minutos' ? 60 : 72;
      const valorFinal = Math.min(novoValor, maxValor);
      
      atualizarConfiguracoes({
        antecedencia: {
          ...configuracoes.antecedencia,
          valor: valorFinal
        }
      });
      
      // Desativar modo personalizado se valor estiver nos presets
      if (configuracoes.antecedencia.unidade === 'minutos') {
        const valores = [5, 10, 15, 30, 60, 120];
        setTempoPersonalizado(!valores.includes(valorFinal));
      } else {
        const horasValores = [1, 2, 3, 6, 12, 24];
        setTempoPersonalizado(!horasValores.includes(valorFinal));
      }
    }
  };
  
  const handleAntecedenciaUnidadeChange = (unidade: 'minutos' | 'horas') => {
    // Ajustar o valor ao mudar a unidade para manter aproximadamente o mesmo tempo
    let novoValor = configuracoes.antecedencia.valor;
    
    if (unidade === 'horas' && configuracoes.antecedencia.unidade === 'minutos') {
      // Converter de minutos para horas (arredondando para cima)
      novoValor = Math.max(1, Math.ceil(configuracoes.antecedencia.valor / 60));
    } else if (unidade === 'minutos' && configuracoes.antecedencia.unidade === 'horas') {
      // Converter de horas para minutos
      novoValor = Math.min(60, configuracoes.antecedencia.valor * 60);
    }
    
    atualizarConfiguracoes({
      antecedencia: {
        valor: novoValor,
        unidade
      }
    });
    
    // Verificar se o novo valor corresponde a um dos valores padrão
    if (unidade === 'minutos') {
      const valores = [5, 10, 15, 30, 60, 120];
      setTempoPersonalizado(!valores.includes(novoValor));
    } else {
      const horasValores = [1, 2, 3, 6, 12, 24];
      setTempoPersonalizado(!horasValores.includes(novoValor));
    }
    
    setValorCustom(novoValor.toString());
  };
  
  const handleCustomValueChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setValorCustom(inputValue);
    
    // Não atualizar as configurações em tempo real para evitar atualizações frequentes
    // A atualização acontecerá apenas quando o usuário confirmar o valor
  };
  
  const handleCustomValueConfirm = () => {
    const novoValor = parseInt(valorCustom, 10);
    
    if (!isNaN(novoValor) && novoValor > 0) {
      // Aplicar limitações baseadas na unidade
      const maxValor = configuracoes.antecedencia.unidade === 'minutos' ? 120 : 72;
      const minValor = 1;
      const valorFinal = Math.min(Math.max(novoValor, minValor), maxValor);
      
      atualizarConfiguracoes({
        antecedencia: {
          ...configuracoes.antecedencia,
          valor: valorFinal
        }
      });
      
      setValorCustom(valorFinal.toString());
    } else {
      // Se for inválido, restaurar para o valor atual
      setValorCustom(configuracoes.antecedencia.valor.toString());
      toast.error("Por favor, insira um valor numérico válido");
    }
  };
  
  const toggleCustomTime = () => {
    setTempoPersonalizado(!tempoPersonalizado);
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
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium">Tempo de antecedência</h3>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 px-2" 
                  onClick={toggleCustomTime}
                  disabled={!configuracoes.ativadas || permissaoNotificacoes === 'denied'}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  {tempoPersonalizado ? "Usar predefinido" : "Personalizar"}
                </Button>
              </div>
              
              {!tempoPersonalizado ? (
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
                      {configuracoes.antecedencia.unidade === 'minutos' ? (
                        <>
                          <SelectItem value="5">5</SelectItem>
                          <SelectItem value="10">10</SelectItem>
                          <SelectItem value="15">15</SelectItem>
                          <SelectItem value="30">30</SelectItem>
                          <SelectItem value="60">60</SelectItem>
                          <SelectItem value="120">120</SelectItem>
                        </>
                      ) : (
                        <>
                          <SelectItem value="1">1</SelectItem>
                          <SelectItem value="2">2</SelectItem>
                          <SelectItem value="3">3</SelectItem>
                          <SelectItem value="6">6</SelectItem>
                          <SelectItem value="12">12</SelectItem>
                          <SelectItem value="24">24</SelectItem>
                          <SelectItem value="48">48</SelectItem>
                          <SelectItem value="72">72</SelectItem>
                        </>
                      )}
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
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <div className="flex items-center gap-2 w-36">
                    <Input
                      type="number"
                      value={valorCustom}
                      onChange={handleCustomValueChange}
                      min={1}
                      max={configuracoes.antecedencia.unidade === 'minutos' ? 120 : 72}
                      className="w-20"
                      disabled={!configuracoes.ativadas || permissaoNotificacoes === 'denied'}
                    />
                    <Button 
                      size="icon" 
                      variant="outline" 
                      className="h-8 w-8" 
                      onClick={handleCustomValueConfirm}
                      disabled={!configuracoes.ativadas || permissaoNotificacoes === 'denied'}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                  
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
              )}
              
              <p className="text-xs text-muted-foreground">
                {configuracoes.antecedencia.unidade === 'minutos' 
                  ? 'Valor máximo: 120 minutos (2 horas)' 
                  : 'Valor máximo: 72 horas (3 dias)'}
              </p>
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
