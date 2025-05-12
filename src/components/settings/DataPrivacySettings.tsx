
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Download, Trash } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import { DadosPerfil, Categoria, Tarefa, Rotina } from "@/types";

interface DataPrivacySettingsProps {
  perfil: DadosPerfil;
  categorias: Categoria[];
  tarefas: Tarefa[];
  rotinas: Rotina[];
  limparTodosDados: () => void;
}

export function DataPrivacySettings({ perfil, categorias, tarefas, rotinas, limparTodosDados }: DataPrivacySettingsProps) {
  // Função para exportar dados para PDF
  const exportarDados = () => {
    try {
      const doc = new jsPDF();
      
      // Título
      doc.setFontSize(18);
      doc.text("Dados do Organizador de Tarefas", 20, 20);
      doc.setFontSize(12);
      
      // Dados do Perfil
      doc.text("PERFIL", 20, 30);
      doc.setFontSize(10);
      doc.text(`Nome: ${perfil.nome}`, 20, 40);
      doc.text(`Nome do App: ${perfil.nomeApp || ""}`, 20, 45);
      doc.text(`Subtítulo: ${perfil.subtitulo || ""}`, 20, 50);
      
      // Categorias
      doc.setFontSize(12);
      doc.text("CATEGORIAS", 20, 60);
      doc.setFontSize(10);
      categorias.forEach((categoria, index) => {
        doc.text(`${categoria.nome} (${categoria.cor})`, 20, 70 + index * 5);
      });
      
      // Tarefas
      doc.setFontSize(12);
      let y = 70 + categorias.length * 5 + 10;
      doc.text("TAREFAS", 20, y);
      doc.setFontSize(10);
      
      y += 10;
      tarefas.forEach((tarefa, index) => {
        if (y > 270) {  // Nova página se estiver próximo ao fim
          doc.addPage();
          y = 20;
        }
        doc.text(`${tarefa.titulo} (${tarefa.concluida ? "Concluída" : "Pendente"})`, 20, y);
        doc.text(`Data: ${tarefa.data} ${tarefa.hora || ""}`, 30, y + 5);
        doc.text(`Categoria: ${tarefa.categoria.nome}`, 30, y + 10);
        if (tarefa.descricao) {
          doc.text(`Descrição: ${tarefa.descricao}`, 30, y + 15);
          y += 20;
        } else {
          y += 15;
        }
      });
      
      // Rotinas
      if (rotinas.length > 0) {
        if (y > 250) {
          doc.addPage();
          y = 20;
        }
        
        doc.setFontSize(12);
        doc.text("ROTINAS", 20, y + 10);
        doc.setFontSize(10);
        
        y += 20;
        rotinas.forEach((rotina) => {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          doc.text(`${rotina.titulo} (${rotina.tipo})`, 20, y);
          if (rotina.descricao) doc.text(`Descrição: ${rotina.descricao}`, 30, y + 5);
          y += 15;
        });
      }
      
      // Salvar o PDF
      doc.save("organizador-tarefas-dados.pdf");
      toast.success("Dados exportados com sucesso!");
    } catch (error) {
      console.error("Erro ao exportar dados:", error);
      toast.error("Erro ao exportar dados. Tente novamente.");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Dados e Privacidade</CardTitle>
        <CardDescription>
          Gerencie seus dados no aplicativo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button 
          variant="outline" 
          className="flex items-center gap-2"
          onClick={exportarDados}
        >
          <Download className="h-4 w-4" /> Exportar Dados
        </Button>
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button 
              variant="outline" 
              className="text-destructive hover:bg-destructive/10 flex items-center gap-2"
            >
              <Trash className="h-4 w-4" /> Limpar Todos os Dados
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta ação irá apagar permanentemente todas as suas tarefas, categorias, rotinas e configurações. 
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction 
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  limparTodosDados();
                  toast.success("Todos os dados foram apagados com sucesso.");
                }}
              >
                Apagar Tudo
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
}
