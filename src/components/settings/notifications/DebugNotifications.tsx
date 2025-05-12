import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatarTempo } from "@/utils/dateUtils";
import { ConfiguracoesNotificacao, Tarefa } from "@/types";

interface DebugNotificationsProps {
  tarefas: Tarefa[];
  configNotificacoes: ConfiguracoesNotificacao;
}

export function DebugNotifications({ tarefas, configNotificacoes }: DebugNotificationsProps) {
  const [debugInfo, setDebugInfo] = useState<string[]>([]);

  // Função para simular o recebimento de uma notificação
  const simularNotificacao = (tarefa: Tarefa) => {
    if (!("Notification" in window)) {
      setDebugInfo(prev => [...prev, "Seu navegador não suporta notificações"]);
      return;
    }

    if (Notification.permission !== "granted") {
      setDebugInfo(prev => [...prev, "Permissão para notificações não concedida"]);
      return;
    }

    try {
      // Criar uma notificação de teste
      const notification = new Notification(`Teste: ${tarefa.titulo}`, {
        body: `Esta é uma notificação de teste para a tarefa "${tarefa.titulo}"`,
        icon: "/favicon.ico",
      });

      setDebugInfo(prev => [...prev, `Notificação de teste enviada para: ${tarefa.titulo}`]);
    } catch (error) {
      setDebugInfo(prev => [...prev, `Erro ao enviar notificação: ${error}`]);
    }
  };

  // Função para calcular o tempo até a notificação
  const calcularTempoAteNotificacao = (tarefa: Tarefa) => {
    try {
      if (!tarefa.data) return "Sem data definida";
      
      const dataHoraTarefa = new Date(tarefa.data);
      if (tarefa.hora) {
        const [hora, minuto] = tarefa.hora.split(':');
        dataHoraTarefa.setHours(parseInt(hora, 10), parseInt(minuto, 10));
      } else {
        dataHoraTarefa.setHours(0, 0, 0, 0);
      }
      
      const agora = new Date();
      const tempoParaTarefa = dataHoraTarefa.getTime() - agora.getTime();
      
      // Calcular o tempo de antecedência em milissegundos
      const milissegundosAntecedencia = configNotificacoes.antecedencia.valor * 
        (configNotificacoes.antecedencia.unidade === 'minutos' ? 60000 : 3600000);
      
      // Tempo até a notificação
      const tempoAteNotificacao = tempoParaTarefa - milissegundosAntecedencia;
      
      if (tempoAteNotificacao <= 0 && tempoParaTarefa > 0) {
        return "Notificação já deveria ter sido enviada";
      } else if (tempoAteNotificacao <= 0) {
        return "Tarefa já passou do prazo";
      } else {
        return `Em ${formatarTempo(tempoAteNotificacao)}`;
      }
    } catch (error) {
      return "Erro ao calcular tempo";
    }
  };

  // Limpar os logs de depuração
  const limparLogs = () => {
    setDebugInfo([]);
  };

  return (
    <Card className="mt-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium">Depuração de Notificações</CardTitle>
        <CardDescription>
          Use esta ferramenta para testar o sistema de notificações
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="text-xs">
            <div className="font-semibold mb-2">Configurações Atuais:</div>
            <p>
              Notificações: {configNotificacoes.ativadas ? "Ativadas" : "Desativadas"}<br />
              Som: {configNotificacoes.comSom ? "Ativado" : "Desativado"}<br />
              Antecedência: {configNotificacoes.antecedencia.valor} {configNotificacoes.antecedencia.unidade}
            </p>
          </div>

          <div className="text-xs">
            <div className="font-semibold mb-2">Tarefas Pendentes:</div>
            {tarefas.filter(t => !t.concluida).length > 0 ? (
              <ul className="space-y-2">
                {tarefas
                  .filter(t => !t.concluida)
                  .slice(0, 5)
                  .map(tarefa => (
                    <li key={tarefa.id} className="p-2 border rounded-md">
                      <div className="flex justify-between">
                        <span>{tarefa.titulo}</span>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => simularNotificacao(tarefa)}
                          className="h-6 px-2 text-xs"
                        >
                          Testar
                        </Button>
                      </div>
                      <div className="text-muted-foreground">
                        Data: {tarefa.data} {tarefa.hora || ""}
                      </div>
                      <div className="text-muted-foreground">
                        Notificação: {calcularTempoAteNotificacao(tarefa)}
                      </div>
                    </li>
                  ))}
              </ul>
            ) : (
              <p className="text-muted-foreground">Nenhuma tarefa pendente encontrada</p>
            )}
          </div>

          {debugInfo.length > 0 && (
            <div className="text-xs">
              <div className="flex items-center justify-between">
                <div className="font-semibold mb-2">Logs:</div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={limparLogs}
                  className="h-6 px-2 text-xs"
                >
                  Limpar
                </Button>
              </div>
              <pre className="bg-muted p-2 rounded-md text-xs overflow-auto max-h-24">
                {debugInfo.map((log, i) => (
                  <div key={i}>{log}</div>
                ))}
              </pre>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 