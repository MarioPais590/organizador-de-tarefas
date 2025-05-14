import { useApp } from "@/context/AppContext";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, BarChart, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { BarChart as RechartBarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, ResponsiveContainer, Legend } from "recharts";
import { Tarefa } from "@/types";

// Função para ordenar tarefas por data (ordem crescente - da mais próxima para a mais distante)
function ordenarTarefasPorData(tarefas: Tarefa[]): Tarefa[] {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0); // Normaliza para início do dia
  
  return [...tarefas].sort((a, b) => {
    // Filtra tarefas sem data para o final
    if (!a.data) return 1;
    if (!b.data) return -1;
    
    // Converter strings de data para objetos Date
    const dataA = new Date(a.data);
    const dataB = new Date(b.data);
    
    // Comparar as datas
    if (dataA < dataB) return -1;
    if (dataA > dataB) return 1;
    
    // Se as datas forem iguais, ordenar por hora (se houver)
    if (a.hora && b.hora) {
      if (a.hora < b.hora) return -1;
      if (a.hora > b.hora) return 1;
    } else if (a.hora) {
      return -1; // Tarefas com hora vêm antes das sem hora
    } else if (b.hora) {
      return 1;
    }
    
    // Se datas e horas forem iguais, priorizar tarefas pendentes
    if (!a.concluida && b.concluida) return -1;
    if (a.concluida && !b.concluida) return 1;
    
    // Se tudo for igual, manter a ordem original
    return 0;
  });
}

export default function Dashboard() {
  const { tarefas, categorias } = useApp();

  // Calcula estatísticas
  const tarefasConcluidas = tarefas.filter((t) => t.concluida).length;
  const tarefasPendentes = tarefas.filter((t) => !t.concluida).length;
  const totalTarefas = tarefas.length;
  const percentualConcluido = totalTarefas > 0 ? Math.round((tarefasConcluidas / totalTarefas) * 100) : 0;

  // Dados para o gráfico por categoria
  const dadosGrafico = categorias.map((categoria) => {
    const tarefasCategoria = tarefas.filter((t) => t.categoria.id === categoria.id);
    const concluidas = tarefasCategoria.filter((t) => t.concluida).length;
    const pendentes = tarefasCategoria.filter((t) => !t.concluida).length;

    return {
      nome: categoria.nome,
      Concluídas: concluidas,
      Pendentes: pendentes,
      cor: categoria.cor,
    };
  });

  // Separar tarefas pendentes e concluídas
  const tarefasPendentesArray = tarefas.filter(t => !t.concluida);
  const tarefasConcluidasArray = tarefas.filter(t => t.concluida);
  
  // Ordenar ambos os grupos por data
  const tarefasPendentesOrdenadas = ordenarTarefasPorData(tarefasPendentesArray);
  const tarefasConcluidasOrdenadas = ordenarTarefasPorData(tarefasConcluidasArray);
  
  // Combinar tarefas pendentes e concluídas ordenadas, priorizando pendentes
  const tarefasRecentes = [...tarefasPendentesOrdenadas, ...tarefasConcluidasOrdenadas].slice(0, 5);

  return (
    <div className="animate-in">
      <PageHeader 
        title="Dashboard" 
        description="Visão geral das suas tarefas e atividades"
      >
        <div className="flex gap-2 items-center">
          <Link to="/tarefas">
            <Button className="bg-azulPrincipal hover:bg-azulPrincipal/90">
              <Plus className="mr-2 h-4 w-4" /> Nova Tarefa
            </Button>
          </Link>
        </div>
      </PageHeader>

      {/* Cards melhor responsivos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Total de Tarefas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{totalTarefas}</div>
              <BarChart className="h-6 w-6 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Tarefas Pendentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{tarefasPendentes}</div>
              <Clock className="h-6 w-6 text-amarelo" />
            </div>
          </CardContent>
        </Card>

        <Card className="sm:col-span-2 lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Tarefas Concluídas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold">{tarefasConcluidas}</div>
              <CheckCircle className="h-6 w-6 text-verde" />
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {percentualConcluido}% de conclusão
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico com altura responsiva */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Tarefas por Categoria</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="h-[250px] sm:h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <RechartBarChart 
                data={dadosGrafico}
                margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="nome" tick={{fontSize: 12}} />
                <YAxis tick={{fontSize: 12}} />
                <Tooltip />
                <Legend wrapperStyle={{fontSize: '12px'}} />
                <Bar dataKey="Concluídas" fill="#a7c957" />
                <Bar dataKey="Pendentes" fill="#ffb703" />
              </RechartBarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Cards inferiores melhor responsivos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Tarefas Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {tarefasRecentes.map((tarefa) => (
              <div 
                key={tarefa.id} 
                className="flex items-center justify-between py-2 border-b last:border-0"
              >
                <div className="flex items-center max-w-[80%]">
                  <div 
                    className="h-4 w-4 rounded-full mr-2 flex-shrink-0" 
                    style={{ backgroundColor: tarefa.categoria.cor }} 
                  />
                  <span className={`${tarefa.concluida ? "line-through text-muted-foreground" : ""} truncate`}>
                    {tarefa.titulo}
                  </span>
                </div>
                {tarefa.concluida && <CheckCircle className="h-4 w-4 text-verde flex-shrink-0" />}
              </div>
            ))}
            {tarefas.length === 0 && (
              <p className="text-center py-4 text-muted-foreground">
                Nenhuma tarefa cadastrada
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Categorias</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {categorias.map((categoria) => (
                <div 
                  key={categoria.id}
                  className="px-3 py-1 rounded-full text-sm"
                  style={{ 
                    backgroundColor: `${categoria.cor}20`, 
                    color: categoria.cor,
                    border: `1px solid ${categoria.cor}` 
                  }}
                >
                  {categoria.nome}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
