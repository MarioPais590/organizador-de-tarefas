import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useState } from "react";

export function GeneralSettings() {
  const [autoBackup, setAutoBackup] = useState(true);
  const [autoSync, setAutoSync] = useState(true);
  const [animations, setAnimations] = useState(true);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" /> Configurações Gerais
        </CardTitle>
        <CardDescription>
          Configurações básicas do aplicativo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto-backup">Backup Automático</Label>
            <p className="text-sm text-muted-foreground">
              Realiza backups automáticos diariamente
            </p>
          </div>
          <Switch
            id="auto-backup"
            checked={autoBackup}
            onCheckedChange={setAutoBackup}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="auto-sync">Sincronização Automática</Label>
            <p className="text-sm text-muted-foreground">
              Sincroniza mudanças automaticamente com a nuvem
            </p>
          </div>
          <Switch
            id="auto-sync"
            checked={autoSync}
            onCheckedChange={setAutoSync}
          />
        </div>
        
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label htmlFor="animations">Animações</Label>
            <p className="text-sm text-muted-foreground">
              Ativa/desativa animações na interface
            </p>
          </div>
          <Switch
            id="animations"
            checked={animations}
            onCheckedChange={setAnimations}
          />
        </div>
      </CardContent>
    </Card>
  );
} 