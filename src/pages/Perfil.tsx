
import { useState, useRef } from "react";
import { useApp } from "@/context/AppContext";
import { PageHeader } from "@/components/PageHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User, Upload, Image, Edit, Type, Palette } from "lucide-react";
import { toast } from "sonner";

export default function Perfil() {
  const { perfil, atualizarPerfil } = useApp();
  const [nome, setNome] = useState(perfil.nome);
  const [nomeApp, setNomeApp] = useState(perfil.nomeApp || "Organizador de Tarefas");
  const [editandoNomeApp, setEditandoNomeApp] = useState(false);
  const [subtitulo, setSubtitulo] = useState(perfil.subtitulo || "Organize seu tempo e aumente sua produtividade");
  const [editandoSubtitulo, setEditandoSubtitulo] = useState(false);
  const [corTitulo, setCorTitulo] = useState(perfil.corTitulo || "#3a86ff");
  const [corSubtitulo, setCorSubtitulo] = useState(perfil.corSubtitulo || "#64748b");
  
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleNomeChange = () => {
    if (nome.trim() !== "") {
      atualizarPerfil({ nome });
    }
  };

  const handleNomeAppChange = () => {
    if (nomeApp.trim() !== "") {
      atualizarPerfil({ nomeApp });
      setEditandoNomeApp(false);
    }
  };

  const handleSubtituloChange = () => {
    if (subtitulo.trim() !== "") {
      atualizarPerfil({ subtitulo });
      setEditandoSubtitulo(false);
    }
  };

  const handleCorTituloChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCorTitulo(e.target.value);
    atualizarPerfil({ corTitulo: e.target.value });
  };

  const handleCorSubtituloChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCorSubtitulo(e.target.value);
    atualizarPerfil({ corSubtitulo: e.target.value });
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
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
        atualizarPerfil({ logo: event.target.result as string });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    atualizarPerfil({ avatar: undefined });
    if (avatarInputRef.current) {
      avatarInputRef.current.value = "";
    }
  };

  const handleRemoveLogo = () => {
    atualizarPerfil({ logo: undefined });
    if (logoInputRef.current) {
      logoInputRef.current.value = "";
    }
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

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dados Pessoais</CardTitle>
            <CardDescription>
              Atualize suas informações pessoais
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
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
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="nomeApp">Nome do Aplicativo</Label>
                <div className="flex gap-2">
                  {editandoNomeApp ? (
                    <>
                      <Input 
                        id="nomeApp" 
                        value={nomeApp} 
                        onChange={(e) => setNomeApp(e.target.value)} 
                        placeholder="Nome do aplicativo"
                      />
                      <Button onClick={handleNomeAppChange}>Salvar</Button>
                      <Button variant="outline" onClick={() => setEditandoNomeApp(false)}>Cancelar</Button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 flex items-center border px-3 py-2 rounded-md bg-muted/50">
                        {nomeApp}
                      </div>
                      <Button variant="outline" onClick={() => setEditandoNomeApp(true)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                    </>
                  )}
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="subtitulo">Subtítulo da Página Inicial</Label>
                <div className="flex gap-2">
                  {editandoSubtitulo ? (
                    <>
                      <Input 
                        id="subtitulo" 
                        value={subtitulo} 
                        onChange={(e) => setSubtitulo(e.target.value)} 
                        placeholder="Subtítulo da página inicial"
                      />
                      <Button onClick={handleSubtituloChange}>Salvar</Button>
                      <Button variant="outline" onClick={() => setEditandoSubtitulo(false)}>Cancelar</Button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 flex items-center border px-3 py-2 rounded-md bg-muted/50">
                        {subtitulo}
                      </div>
                      <Button variant="outline" onClick={() => setEditandoSubtitulo(true)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cores</CardTitle>
            <CardDescription>
              Personalize as cores do texto na página inicial
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="corTitulo">Cor do Título</Label>
                    <div 
                      className="h-5 w-5 rounded-md border"
                      style={{ backgroundColor: corTitulo }}
                    />
                  </div>
                  <div className="flex gap-2 items-center">
                    <Palette className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="corTitulo"
                      type="color"
                      value={corTitulo}
                      onChange={handleCorTituloChange}
                      className="h-8 w-full"
                    />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Cor atual: {corTitulo}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="corSubtitulo">Cor do Subtítulo</Label>
                    <div 
                      className="h-5 w-5 rounded-md border"
                      style={{ backgroundColor: corSubtitulo }}
                    />
                  </div>
                  <div className="flex gap-2 items-center">
                    <Palette className="h-4 w-4 text-muted-foreground" />
                    <Input
                      id="corSubtitulo"
                      type="color"
                      value={corSubtitulo}
                      onChange={handleCorSubtituloChange}
                      className="h-8 w-full"
                    />
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Cor atual: {corSubtitulo}
                  </div>
                </div>
              </div>

              <div className="mt-4 p-3 border rounded-md">
                <h3 className="font-medium mb-2">Visualização:</h3>
                <div className="space-y-2 text-center">
                  <div style={{ color: corTitulo }} className="text-xl font-bold">
                    {nomeApp}
                  </div>
                  <div style={{ color: corSubtitulo }} className="text-sm">
                    {subtitulo}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Avatar</CardTitle>
            <CardDescription>
              Seu avatar pessoal (PNG ou JPG, tamanho ideal 512x512px)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20 border">
                <AvatarImage src={perfil.avatar} />
                <AvatarFallback className="text-lg bg-azulPrincipal text-white">
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
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload
                  </Button>
                  {perfil.avatar && (
                    <Button 
                      variant="outline" 
                      onClick={handleRemoveAvatar}
                    >
                      Remover
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Logo do Aplicativo</CardTitle>
            <CardDescription>
              Personalize a logo do seu aplicativo (PNG ou JPG, tamanho ideal 512x512px)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <div className="h-32 w-32 rounded-md border flex items-center justify-center overflow-hidden bg-muted">
                {perfil.logo ? (
                  <img 
                    src={perfil.logo} 
                    alt="Logo" 
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <Image className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div className="grid gap-2">
                <input 
                  type="file" 
                  id="logo" 
                  className="hidden" 
                  accept="image/png, image/jpeg" 
                  onChange={handleLogoUpload}
                  ref={logoInputRef}
                />
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => logoInputRef.current?.click()}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload
                  </Button>
                  {perfil.logo && (
                    <Button 
                      variant="outline" 
                      onClick={handleRemoveLogo}
                    >
                      Remover
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
