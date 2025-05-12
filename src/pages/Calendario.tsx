
import { useApp } from "@/context/AppContext";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar as CalendarIcon, Plus } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Link } from "react-router-dom";
import { format, isToday, isSameDay, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from "react";

export default function Calendario() {
  const { tarefas } = useApp();
  const [date, setDate] = useState<Date | undefined>(new Date());
  
  // Filtrar tarefas para a data selecionada
  const tarefasDoDia = date 
    ? tarefas.filter(tarefa => {
        const dataTarefa = parseISO(tarefa.data);
        return isSameDay(dataTarefa, date);
      })
    : [];

  // Verificar se há tarefas em cada data para destacar no calendário
  const datasTarefas = tarefas.reduce<Record<string, boolean>>((acc, tarefa) => {
    const dataTarefa = format(parseISO(tarefa.data), "yyyy-MM-dd");
    acc[dataTarefa] = true;
    return acc;
  }, {});

  return (
    <div className="animate-in">
      <PageHeader 
        title="Calendário" 
        description="Visualize suas tarefas no calendário"
      >
        <Link to="/tarefas">
          <Button className="bg-azulPrincipal hover:bg-azulPrincipal/90">
            <Plus className="mr-2 h-4 w-4" /> Nova Tarefa
          </Button>
        </Link>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center">
              <CalendarIcon className="mr-2 h-5 w-5" /> Calendário
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="border rounded-md p-3"
              locale={ptBR}
              modifiers={{
                highlighted: (date) => {
                  const dateStr = format(date, "yyyy-MM-dd");
                  return !!datasTarefas[dateStr];
                }
              }}
              modifiersStyles={{
                highlighted: { 
                  backgroundColor: "#3a86ff20",
                  borderRadius: "100%"
                }
              }}
            />
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>
              {date ? (
                <div className="flex items-center justify-between">
                  <span>
                    {isToday(date) ? "Hoje" : format(date, "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                  </span>
                  <span className="text-sm bg-muted py-1 px-3 rounded-full">
                    {tarefasDoDia.length} tarefas
                  </span>
                </div>
              ) : "Selecione uma data"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tarefasDoDia.length > 0 ? (
                tarefasDoDia.map(tarefa => (
                  <div 
                    key={tarefa.id} 
                    className="flex items-start gap-3 p-3 border rounded-md"
                  >
                    <div 
                      className="h-4 w-4 rounded-full mt-1" 
                      style={{ backgroundColor: tarefa.categoria.cor }} 
                    />
                    <div className="flex-1">
                      <div>
                        <h3 className={`font-medium ${tarefa.concluida ? 'line-through text-muted-foreground' : ''}`}>
                          {tarefa.titulo}
                        </h3>
                        {tarefa.hora && (
                          <p className="text-sm text-muted-foreground">
                            {tarefa.hora}
                          </p>
                        )}
                      </div>
                      {tarefa.descricao && (
                        <p className="text-sm mt-1">{tarefa.descricao}</p>
                      )}
                      <div 
                        className="inline-block mt-2 px-2 py-0.5 rounded-full text-xs"
                        style={{ 
                          backgroundColor: `${tarefa.categoria.cor}20`, 
                          color: tarefa.categoria.cor 
                        }}
                      >
                        {tarefa.categoria.nome}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  {date ? "Nenhuma tarefa para este dia" : "Selecione uma data no calendário"}
                </div>
              )}

              {date && tarefasDoDia.length === 0 && (
                <div className="text-center">
                  <Button 
                    variant="outline" 
                    asChild
                    className="mt-4"
                  >
                    <Link to="/tarefas">
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar tarefa para este dia
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
