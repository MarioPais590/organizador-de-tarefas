
import { useState, useRef, useEffect } from "react";
import { useApp } from "@/context/AppContext";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit, Trash, Tag, Palette } from "lucide-react";
import { EmptyState } from "@/components/EmptyState";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { toast } from "sonner";

// Esquema de validação para o formulário da categoria
const categoriaSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório"),
  cor: z.string().min(1, "Cor é obrigatória")
});

type CategoriaFormData = z.infer<typeof categoriaSchema>;

// Cores predefinidas para facilitar a seleção
const CORES_PREDEFINIDAS = [
  "#3a86ff", // azul
  "#ffb703", // amarelo
  "#a7c957", // verde claro
  "#fb8500", // laranja
  "#e63946", // vermelho
  "#06d6a0", // verde água
  "#8338ec", // roxo
  "#f15bb5", // rosa
  "#780116", // bordô
  "#333333", // preto
];

export default function Categorias() {
  const { categorias, adicionarCategoria, atualizarCategoria, removerCategoria } = useApp();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editandoCategoriaId, setEditandoCategoriaId] = useState<string | null>(null);
  const [corSelecionada, setCorSelecionada] = useState("#3a86ff");
  const colorPickerRef = useRef<HTMLInputElement>(null);

  // Configuração do formulário com react-hook-form e zod
  const form = useForm<CategoriaFormData>({
    resolver: zodResolver(categoriaSchema),
    defaultValues: {
      nome: "",
      cor: "#3a86ff"
    }
  });

  // Quando editar uma categoria, preencher o formulário com os dados dela
  useEffect(() => {
    if (editandoCategoriaId) {
      const categoria = categorias.find(c => c.id === editandoCategoriaId);
      if (categoria) {
        form.reset({ nome: categoria.nome, cor: categoria.cor });
        setCorSelecionada(categoria.cor);
      }
    } else {
      form.reset({ nome: "", cor: "#3a86ff" });
      setCorSelecionada("#3a86ff");
    }
  }, [editandoCategoriaId, categorias, form]);

  const handleSalvar = (data: CategoriaFormData) => {
    if (editandoCategoriaId) {
      atualizarCategoria(editandoCategoriaId, { 
        nome: data.nome, 
        cor: data.cor 
      });
      setEditandoCategoriaId(null);
    } else {
      adicionarCategoria({
        nome: data.nome,
        cor: data.cor
      });
    }

    form.reset();
    setDialogOpen(false);
  };

  const handleEditar = (categoriaId: string) => {
    setEditandoCategoriaId(categoriaId);
    setDialogOpen(true);
  };

  const handleCancelar = () => {
    form.reset();
    setEditandoCategoriaId(null);
    setDialogOpen(false);
  };

  const handleCorChange = (cor: string) => {
    setCorSelecionada(cor);
    form.setValue("cor", cor);
  };

  const abrirColorPicker = () => {
    if (colorPickerRef.current) {
      colorPickerRef.current.click();
    }
  };

  return (
    <div className="animate-in">
      <PageHeader 
        title="Categorias" 
        description="Gerencie as categorias para suas tarefas"
      >
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-azulPrincipal hover:bg-azulPrincipal/90">
              <Plus className="mr-2 h-4 w-4" /> Nova Categoria
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>
                {editandoCategoriaId ? "Editar Categoria" : "Nova Categoria"}
              </DialogTitle>
              <DialogDescription>
                {editandoCategoriaId 
                  ? "Edite os detalhes da categoria" 
                  : "Adicione uma nova categoria para organizar suas tarefas"
                }
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSalvar)} className="space-y-6">
                <FormField
                  control={form.control}
                  name="nome"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nome</FormLabel>
                      <FormControl>
                        <Input placeholder="Nome da categoria" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="cor"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cor</FormLabel>
                      <div className="space-y-4">
                        <div className="flex gap-2 flex-wrap">
                          {CORES_PREDEFINIDAS.map((cor) => (
                            <div
                              key={cor}
                              className={`h-8 w-8 rounded-full cursor-pointer border-2 ${
                                corSelecionada === cor ? "border-gray-800 dark:border-gray-200" : "border-transparent"
                              } hover:scale-110 transition-transform`}
                              style={{ backgroundColor: cor }}
                              onClick={() => handleCorChange(cor)}
                            />
                          ))}
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 rounded-full"
                            onClick={abrirColorPicker}
                          >
                            <Palette className="h-4 w-4" />
                          </Button>
                        </div>
                        
                        <div className="flex items-center gap-4">
                          <div 
                            className="h-10 w-10 rounded-md" 
                            style={{ backgroundColor: corSelecionada }} 
                          />
                          <div className="flex-1">
                            <Input
                              ref={colorPickerRef}
                              type="color"
                              className="h-10 w-full"
                              value={corSelecionada}
                              onChange={(e) => handleCorChange(e.target.value)}
                              {...field}
                            />
                          </div>
                        </div>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <DialogFooter>
                  <Button variant="outline" type="button" onClick={handleCancelar}>
                    Cancelar
                  </Button>
                  <Button type="submit">
                    {editandoCategoriaId ? "Salvar" : "Adicionar"}
                  </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      {categorias.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {categorias.map((categoria) => (
            <Card key={categoria.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div 
                      className="h-4 w-4 rounded-full" 
                      style={{ backgroundColor: categoria.cor }} 
                    />
                    <span className="font-medium">{categoria.nome}</span>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleEditar(categoria.id)}
                      className="h-8 w-8"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => removerCategoria(categoria.id)}
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Nenhuma categoria encontrada"
          description="Crie uma nova categoria para organizar suas tarefas"
          icon={<Tag className="h-8 w-8" />}
          action={
            <Button 
              variant="outline" 
              onClick={() => setDialogOpen(true)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Criar nova categoria
            </Button>
          }
        />
      )}
    </div>
  );
}
