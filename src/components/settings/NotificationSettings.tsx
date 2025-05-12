import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BellRing } from "lucide-react";
import { ConfiguracoesNotificacao } from "@/types";
import { NotificationToggle } from "./notifications/NotificationToggle";
import { SoundToggle } from "./notifications/SoundToggle";
import { AdvanceTimeSelector } from "./notifications/AdvanceTimeSelector";
import { NotificationPermissionAlert } from "./notifications/NotificationPermissionAlert";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";

interface NotificationSettingsProps {
  configNotificacoes: ConfiguracoesNotificacao;
  atualizarConfigNotificacoes: (config: Partial<ConfiguracoesNotificacao>, showToast?: boolean) => void;
}

export function NotificationSettings({ configNotificacoes, atualizarConfigNotificacoes }: NotificationSettingsProps) {
  // Referência para rastrear se os estados já foram inicializados
  const initialized = useRef(false);
  const [loading, setLoading] = useState(true);
  
  // Estados locais para controlar valores de UI
  const [antecedenciaValor, setAntecedenciaValor] = useState(configNotificacoes.antecedencia.valor);
  const [antecedenciaUnidade, setAntecedenciaUnidade] = useState(configNotificacoes.antecedencia.unidade);
  const [notificacoesAtivadas, setNotificacoesAtivadas] = useState(configNotificacoes.ativadas);
  const [somAtivado, setSomAtivado] = useState(configNotificacoes.comSom);
  const [notificacaoPermissao, setNotificacaoPermissao] = useState<NotificationPermission | "default">("default");
  const [configChanged, setConfigChanged] = useState(false);
  const [permissaoJaNotificada, setPermissaoJaNotificada] = useState(false);

  // Sincronizar estados com as propriedades quando elas mudam
  useEffect(() => {
    console.log("configNotificacoes atualizado:", configNotificacoes);
    
    // Ocultar componente por um breve momento durante a inicialização para evitar flashes
    if (!initialized.current) {
      setLoading(true);
      // Timeout para dar tempo ao DOM de atualizar
      setTimeout(() => {
        // Atualizar todos os valores de uma vez
        setAntecedenciaValor(configNotificacoes.antecedencia.valor);
        setAntecedenciaUnidade(configNotificacoes.antecedencia.unidade);
        setNotificacoesAtivadas(configNotificacoes.ativadas);
        setSomAtivado(configNotificacoes.comSom);
        
        initialized.current = true;
        console.log("Estados inicializados com valores:", configNotificacoes);
        
        // Revelar componente apenas após os valores estarem definidos
        setLoading(false);
      }, 50);
      return;
    }
    
    // Sempre sincronizar o valor de antecedência
    if (configNotificacoes.antecedencia.valor !== antecedenciaValor) {
      console.log(`Sincronizando valor de antecedência: ${antecedenciaValor} -> ${configNotificacoes.antecedencia.valor}`);
      setAntecedenciaValor(configNotificacoes.antecedencia.valor);
    }
    
    // Sempre sincronizar a unidade de antecedência
    if (configNotificacoes.antecedencia.unidade !== antecedenciaUnidade) {
      console.log(`Sincronizando unidade de antecedência: ${antecedenciaUnidade} -> ${configNotificacoes.antecedencia.unidade}`);
      setAntecedenciaUnidade(configNotificacoes.antecedencia.unidade);
    }
    
    // Sincronizar demais estados
    if (configNotificacoes.ativadas !== notificacoesAtivadas) {
      setNotificacoesAtivadas(configNotificacoes.ativadas);
    }
    
    if (configNotificacoes.comSom !== somAtivado) {
      setSomAtivado(configNotificacoes.comSom);
    }
  }, [configNotificacoes]);

  // Verificar o status da permissão de notificação
  useEffect(() => {
    const checkPermission = () => {
      if ("Notification" in window) {
        setNotificacaoPermissao(Notification.permission);
      }
    };
    
    // Verificar imediatamente
    checkPermission();
  }, []);

  // Efeito para atualizar a flag quando as configurações mudarem
  useEffect(() => {
    if (initialized.current && (
      notificacoesAtivadas !== configNotificacoes.ativadas ||
      somAtivado !== configNotificacoes.comSom ||
      antecedenciaValor !== configNotificacoes.antecedencia.valor ||
      antecedenciaUnidade !== configNotificacoes.antecedencia.unidade
    )) {
      setConfigChanged(true);
      console.log("Configurações alteradas. Estado atual:", {
        notificacoesAtivadas,
        somAtivado,
        antecedenciaValor,
        antecedenciaUnidade
      });
      console.log("Props:", configNotificacoes);
    } else {
      setConfigChanged(false);
    }
  }, [notificacoesAtivadas, somAtivado, antecedenciaValor, antecedenciaUnidade, configNotificacoes]);

  // Função para solicitar permissão de notificação
  const requestNotificationPermission = async () => {
    try {
      if ("Notification" in window) {
        // Verificar se já temos permissão antes de solicitar
        if (Notification.permission === "granted") {
          // Se já temos permissão, não mostrar toast novamente
          if (!permissaoJaNotificada) {
            toast.success("Permissão para notificações concedida!");
            setPermissaoJaNotificada(true);
          }
          
          // Salvar alterações se necessário
          if (notificacoesAtivadas) {
            salvarAlteracoes();
          }
          
          return;
        }
        
        // Se não temos permissão, solicitar
        const permission = await Notification.requestPermission();
        setNotificacaoPermissao(permission);
        
        if (permission === "granted" && !permissaoJaNotificada) {
          toast.success("Permissão para notificações concedida!");
          setPermissaoJaNotificada(true);
          // Se permissão foi concedida e notificações estão ativadas nas configurações
          if (notificacoesAtivadas) {
            salvarAlteracoes();
          }
        } else if (permission === "denied") {
          toast.error("Permissão para notificações negada. Ative nas configurações do navegador.");
          // Desativar notificações nas configurações se permissão foi negada
          setNotificacoesAtivadas(false);
          atualizarConfigNotificacoes({
            ativadas: false
          }, true);
        }
      }
    } catch (error) {
      console.error("Erro ao solicitar permissão:", error);
      toast.error("Ocorreu um erro ao solicitar permissão para notificações.");
    }
  };

  // Função para atualizar o valor de antecedência
  const handleAntecedenciaChange = (valor: number) => {
    console.log(`Valor de antecedência alterado: ${antecedenciaValor} -> ${valor}`);
    setAntecedenciaValor(valor);
    setConfigChanged(true);
  };

  // Função para atualizar a unidade de antecedência
  const handleUnidadeChange = (unidade: "minutos" | "horas") => {
    console.log(`Unidade de antecedência alterada: ${antecedenciaUnidade} -> ${unidade}`);
    setAntecedenciaUnidade(unidade);
    setConfigChanged(true);
  };

  // Função para salvar as alterações apenas quando explicitamente chamada
  const salvarAlteracoes = () => {
    try {
      // Se notificações estão sendo ativadas, verificar permissão primeiro
      if (notificacoesAtivadas) {
        // Se o navegador suporta notificações
        if ("Notification" in window) {
          // Se permissão já foi negada, mostrar mensagem e não ativar
          if (notificacaoPermissao === "denied") {
            toast.error("Notificações estão bloqueadas pelo navegador. Altere as permissões nas configurações do seu navegador.");
            setNotificacoesAtivadas(false);
            return;
          }
          
          // Se permissão ainda não foi concedida, solicitar
          if (notificacaoPermissao !== "granted") {
            requestNotificationPermission();
            return;
          }
        } else {
          // Navegador não suporta notificações
          toast.error("Seu navegador não suporta notificações.");
          setNotificacoesAtivadas(false);
          return;
        }
      }
      
      // Salvar configurações
      const novasConfiguracoes = {
        ativadas: notificacoesAtivadas,
        comSom: somAtivado,
        antecedencia: {
          valor: antecedenciaValor,
          unidade: antecedenciaUnidade,
        }
      };
      
      console.log("Salvando configurações:", novasConfiguracoes);
      console.log(`Valor de antecedência sendo salvo: ${antecedenciaValor}`);
      console.log(`Unidade de antecedência sendo salva: ${antecedenciaUnidade}`);
      
      // Enviar atualizações para o contexto
      const resultado = atualizarConfigNotificacoes(novasConfiguracoes, true);
      
      // Resetar flag de alterações
      setConfigChanged(false);
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      toast.error("Erro ao atualizar configurações de notificação.");
    }
  };

  // Se estiver carregando, mostrar esqueleto
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellRing className="h-5 w-5" /> Notificações
          </CardTitle>
          <CardDescription>
            Configure as preferências de notificação
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BellRing className="h-5 w-5" /> Notificações
        </CardTitle>
        <CardDescription>
          Configure as preferências de notificação
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <NotificationToggle 
          checked={notificacoesAtivadas} 
          onCheckedChange={(checked) => {
            setNotificacoesAtivadas(checked);
            setConfigChanged(true);
            if (checked && notificacaoPermissao !== "granted") {
              requestNotificationPermission();
            }
          }}
        />
        
        <SoundToggle 
          checked={somAtivado} 
          onCheckedChange={(checked) => {
            setSomAtivado(checked);
            setConfigChanged(true);
          }}
          disabled={!notificacoesAtivadas}
        />
        
        <AdvanceTimeSelector
          valor={antecedenciaValor}
          unidade={antecedenciaUnidade}
          onValorChange={handleAntecedenciaChange}
          onUnidadeChange={handleUnidadeChange}
          disabled={!notificacoesAtivadas}
        />
        
        <NotificationPermissionAlert 
          notificationSupported={"Notification" in window}
          permission={notificacaoPermissao}
          onRequestPermission={requestNotificationPermission}
        />

        {configChanged && (
          <button
            onClick={salvarAlteracoes}
            className="w-full py-2 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            Salvar Alterações
          </button>
        )}
        
        {/* Botão de depuração - apenas em desenvolvimento */}
        {process.env.NODE_ENV === 'development' && (
          <div className="mt-4 pt-4 border-t border-border">
            <details className="text-xs">
              <summary className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors">
                Informações de Depuração
              </summary>
              <div className="mt-2 p-2 bg-muted rounded-md space-y-2">
                <div>
                  <h4 className="font-medium">Estado do Componente:</h4>
                  <pre className="text-xs mt-1 p-1 bg-background rounded overflow-auto max-h-20">
                    {JSON.stringify({
                      antecedenciaValor,
                      antecedenciaUnidade,
                      notificacoesAtivadas,
                      somAtivado,
                      configChanged,
                      initialized: initialized.current
                    }, null, 2)}
                  </pre>
                </div>
                <div>
                  <h4 className="font-medium">Props do Contexto:</h4>
                  <pre className="text-xs mt-1 p-1 bg-background rounded overflow-auto max-h-20">
                    {JSON.stringify(configNotificacoes, null, 2)}
                  </pre>
                </div>
                <button 
                  onClick={salvarAlteracoes}
                  className="w-full mt-2 py-1 px-2 bg-blue-500 text-white text-xs rounded-md hover:bg-blue-600 transition-colors"
                >
                  Forçar Salvamento
                </button>
              </div>
            </details>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Adicionar tipagem para a propriedade global no window
declare global {
  interface Window {
    antecedenciaTimer?: ReturnType<typeof setTimeout>;
  }
}
