
import React from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface EditarAnexoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  novoNomeAnexo: string;
  setNovoNomeAnexo: (nome: string) => void;
  onSalvarEdicao: () => void;
}

export const EditarAnexoDialog = ({ 
  open, 
  onOpenChange, 
  novoNomeAnexo, 
  setNovoNomeAnexo, 
  onSalvarEdicao 
}: EditarAnexoDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[350px]">
        <DialogHeader>
          <DialogTitle>Editar Nome do Anexo</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="nome-anexo">Nome</Label>
            <Input
              id="nome-anexo"
              placeholder="Digite o nome do anexo"
              value={novoNomeAnexo}
              onChange={(e) => setNovoNomeAnexo(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={onSalvarEdicao}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
