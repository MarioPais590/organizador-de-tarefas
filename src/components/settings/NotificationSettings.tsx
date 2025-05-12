import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BellRing } from "lucide-react";
import { ConfiguracoesNotificacao } from "@/types";
import { NotificationToggle } from "./notifications/NotificationToggle";
import { SoundToggle } from "./notifications/SoundToggle";
import { AdvanceTimeSelector } from "./notifications/AdvanceTimeSelector";
import { NotificationPermissionAlert } from "./notifications/NotificationPermissionAlert";
import { toast } from "sonner";

interface NotificationSettingsProps {
  configNotificacoes: ConfiguracoesNotificacao;
  atualizarConfigNotificacoes: (config: Partial<ConfiguracoesNotificacao>, showToast?: boolean) => void;
}

export function NotificationSettings({ configNotificacoes, atualizarConfigNotificacoes }: NotificationSettingsProps) {
  const [antecedenciaValor, setAntecedenciaValor] = useState(configNotificacoes.antecedencia.valor);
  const [antecedenciaUnidade, setAntecedenciaUnidade] = useState(configNotificacoes.antecedencia.unidade);
  const [notificacoesAtivadas, setNotificacoesAtivadas] = useState(configNotificacoes.ativadas);
  const [somAtivado, setSomAtivado] = useState(configNotificacoes.comSom);
  const [notificacaoPermissao, setNotificacaoPermissao] = useState<NotificationPermission | "default">("default");
  const [configChanged, setConfigChanged] = useState(false);
  const [permissaoJaNotificada, setPermissaoJaNotificada] = useState(false);

  // Verificar o status da permissão de notificação
  useEffect(() => {
    const checkPermission = () => {
      if ("Notification" in window) {
        setNotificacaoPermissao(Notification.permission);
      }
    };
    
    // Verificar imediatamente
    checkPermission();
    
    // Verificar apenas quando o componente é montado, não continuamente
    return () => {};
  }, []);

  // Efeito para atualizar a flag quando as configurações mudarem
  useEffect(() => {
    if (
      notificacoesAtivadas !== configNotificacoes.ativadas ||
      somAtivado !== configNotificacoes.comSom ||
      antecedenciaValor !== configNotificacoes.antecedencia.valor ||
      antecedenciaUnidade !== configNotificacoes.antecedencia.unidade
    ) {
      setConfigChanged(true);
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
      atualizarConfigNotificacoes({
        ativadas: notificacoesAtivadas,
        comSom: somAtivado,
        antecedencia: {
          valor: antecedenciaValor,
          unidade: antecedenciaUnidade,
        }
      }, true);
      
      setConfigChanged(false);
      toast.success("Configurações de notificação atualizadas com sucesso!");
    } catch (error) {
      console.error("Erro ao salvar configurações:", error);
      toast.error("Erro ao atualizar configurações de notificação.");
    }
  };

  // Salvar automaticamente quando o componente for desmontado se houver alterações
  useEffect(() => {
    return () => {
      if (configChanged) {
        try {
          // Não solicitar permissão aqui, apenas salvar o estado atual
          atualizarConfigNotificacoes({
            ativadas: notificacoesAtivadas,
            comSom: somAtivado,
            antecedencia: {
              valor: antecedenciaValor,
              unidade: antecedenciaUnidade,
            }
          }, false);
        } catch (error) {
          console.error("Erro ao salvar configurações:", error);
        }
      }
    };
  }, [configChanged, atualizarConfigNotificacoes, notificacoesAtivadas, somAtivado, antecedenciaValor, antecedenciaUnidade]);

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
            if (checked && notificacaoPermissao !== "granted") {
              requestNotificationPermission();
            }
          }}
        />
        
        <SoundToggle 
          checked={somAtivado} 
          onCheckedChange={setSomAtivado}
          disabled={!notificacoesAtivadas}
        />
        
        <AdvanceTimeSelector
          valor={antecedenciaValor}
          unidade={antecedenciaUnidade}
          onValorChange={setAntecedenciaValor}
          onUnidadeChange={setAntecedenciaUnidade}
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
      </CardContent>
    </Card>
  );
}
