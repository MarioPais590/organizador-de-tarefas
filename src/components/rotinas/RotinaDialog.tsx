
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Rotina } from "@/types";

interface RotinaDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (titulo: string, descricao: string, tipo: "diaria" | "semanal" | "mensal") => void;
  isEditing: boolean;
  rotinaAtual?: Rotina;
}

export const RotinaDialog = ({ isOpen, onClose, onSave, isEditing, rotinaAtual }: RotinaDialogProps) => {
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tipo, setTipo] = useState<"diaria" | "semanal" | "mensal" | string>("diaria");

  useEffect(() => {
    if (isEditing && rotinaAtual) {
      setTitulo(rotinaAtual.titulo);
      setDescricao(rotinaAtual.descricao || "");
      setTipo(rotinaAtual.tipo);
    } else {
      setTitulo("");
      setDescricao("");
      setTipo("diaria");
    }
  }, [isEditing, rotinaAtual, isOpen]);

  const handleSave = () => {
    if (!titulo || !tipo) return;
    onSave(titulo, descricao, tipo as "diaria" | "semanal" | "mensal");
  };

  const handleCancelar = () => {
    setTitulo("");
    setDescricao("");
    setTipo("diaria");
    onClose();
  };

  return (
    <DialogContent className="sm:max-w-[425px]">
      <DialogHeader>
        <DialogTitle>{isEditing ? "Editar Rotina" : "Criar Nova Rotina"}</DialogTitle>
        <DialogDescription>
          {isEditing ? "Modifique os detalhes da rotina" : "Adicione uma nova rotina para organizar suas tarefas recorrentes"}
        </DialogDescription>
      </DialogHeader>
      <div className="grid gap-4 py-4">
        <div className="grid gap-2">
          <Label htmlFor="titulo">Título</Label>
          <Input
            id="titulo"
            placeholder="Nome da rotina"
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="descricao">Descrição (opcional)</Label>
          <Textarea
            id="descricao"
            placeholder="Descreva sua rotina"
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="tipo">Tipo de Rotina</Label>
          <Select value={tipo} onValueChange={setTipo}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="diaria">Diária</SelectItem>
              <SelectItem value="semanal">Semanal</SelectItem>
              <SelectItem value="mensal">Mensal</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <DialogFooter>
        <Button 
          variant="outline" 
          onClick={handleCancelar}
        >
          Cancelar
        </Button>
        <Button 
          onClick={handleSave}
          disabled={!titulo || !tipo}
        >
          {isEditing ? "Salvar Alterações" : "Criar Rotina"}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};
