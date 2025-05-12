import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Database } from "lucide-react";
import { toast } from "sonner";

export function DatabaseSettings() {
  const limparCacheDados = () => {
    // Simular limpeza de cache
    setTimeout(() => {
      toast.success("Cache de dados limpo com sucesso!");
    }, 500);
  };

  const sincronizarDados = () => {
    // Simular sincronização de dados
    toast.info("Sincronizando dados...");
    setTimeout(() => {
      toast.success("Dados sincronizados com sucesso!");
    }, 1500);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" /> Gerenciamento de Dados
        </CardTitle>
        <CardDescription>
          Gerencie os dados salvos neste dispositivo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <h3 className="text-sm font-medium">Armazenamento Local</h3>
          <p className="text-sm text-muted-foreground">
            Os dados são armazenados localmente no seu navegador e sincronizados com o servidor.
          </p>
          <div className="flex gap-2 pt-2">
            <Button variant="outline" size="sm" onClick={limparCacheDados}>
              Limpar Cache Local
            </Button>
            <Button size="sm" onClick={sincronizarDados}>
              Sincronizar Agora
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
} 