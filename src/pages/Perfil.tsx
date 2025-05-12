import { useState, useRef } from "react";
import { useApp } from "@/context/AppContext";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Upload } from "lucide-react";
import { toast } from "sonner";

export default function Perfil() {
  const { perfil, atualizarPerfil } = useApp();
  const [nome, setNome] = useState(perfil.nome);
  
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const handleNomeChange = () => {
    if (nome.trim() !== "") {
      atualizarPerfil({ nome });
      toast.success("Nome atualizado com sucesso!");
    } else {
      toast.error("O nome não pode estar vazio");
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Verificar tipo de arquivo
    if (!file.type.includes("image/png") && !file.type.includes("image/jpeg")) {
      toast.error("Apenas imagens PNG ou JPG são permitidas");
      return;
    }

    // Verificar tamanho - máximo 2MB
    if (file.size > 2 * 1024 * 1024) {
      toast.error("A imagem deve ter no máximo 2MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        atualizarPerfil({ avatar: event.target.result as string });
        toast.success("Avatar atualizado com sucesso!");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    atualizarPerfil({ avatar: undefined });
    if (avatarInputRef.current) {
      avatarInputRef.current.value = "";
    }
    toast.success("Avatar removido com sucesso!");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <div className="animate-in">
      <PageHeader 
        title="Perfil" 
        description="Gerencie suas informações de perfil" 
      />

      <div className="grid gap-6 max-w-3xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Informações de Perfil
            </CardTitle>
            <CardDescription>
              Atualize suas informações e personalize sua experiência
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row gap-8 items-start">
              {/* Avatar */}
              <div className="flex flex-col items-center gap-4">
                <Avatar className="h-28 w-28 border">
                  <AvatarImage src={perfil.avatar} />
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                    {getInitials(perfil.nome)}
                  </AvatarFallback>
                </Avatar>
                <div className="grid gap-2">
                  <input 
                    type="file" 
                    id="avatar" 
                    className="hidden" 
                    accept="image/png, image/jpeg" 
                    onChange={handleAvatarUpload}
                    ref={avatarInputRef}
                  />
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => avatarInputRef.current?.click()}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Alterar foto
                    </Button>
                    {perfil.avatar && (
                      <Button 
                        variant="outline"
                        size="sm"
                        onClick={handleRemoveAvatar}
                      >
                        Remover
                      </Button>
                    )}
                  </div>
                </div>
              </div>
              
              {/* Dados Pessoais */}
              <div className="flex-1 w-full space-y-6">
                <div className="grid gap-2">
                  <Label htmlFor="nome">Nome</Label>
                  <div className="flex gap-2">
                    <Input 
                      id="nome" 
                      value={nome} 
                      onChange={(e) => setNome(e.target.value)} 
                      placeholder="Seu nome"
                    />
                    <Button onClick={handleNomeChange}>Salvar</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Este nome será usado nas notificações e em outros lugares da aplicação
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
