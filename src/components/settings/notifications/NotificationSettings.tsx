import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useApp } from '@/context/AppContext';
import { Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NotificationTestButton } from './NotificationTestButton';
import { BackgroundNotificationCheck } from './BackgroundNotificationCheck';
import { DiagnosticButton } from './DiagnosticButton';

const NotificationSettings = () => {
  const { configNotificacoes, atualizarConfigNotificacoes } = useApp();
  const [isUpdating, setIsUpdating] = useState(false);
  
  const handleNotificationsToggle = async (checked: boolean) => {
    setIsUpdating(true);
    await atualizarConfigNotificacoes({ ativadas: checked });
    setIsUpdating(false);
  };
  
  const handleSoundToggle = async (checked: boolean) => {
    setIsUpdating(true);
    await atualizarConfigNotificacoes({ comSom: checked });
    setIsUpdating(false);
  };
  
  const handleValorChange = async (valor: string) => {
    setIsUpdating(true);
    await atualizarConfigNotificacoes({ 
      antecedencia: { 
        ...configNotificacoes.antecedencia,
        valor: parseInt(valor, 10) 
      } 
    });
    setIsUpdating(false);
  };
  
  const handleUnidadeChange = async (unidade: 'minutos' | 'horas') => {
    setIsUpdating(true);
    await atualizarConfigNotificacoes({ 
      antecedencia: { 
        ...configNotificacoes.antecedencia,
        unidade 
      } 
    });
    setIsUpdating(false);
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Configurações de Notificações</CardTitle>
            <div className="flex items-center gap-2">
              <DiagnosticButton />
              <NotificationTestButton />
            </div>
          </div>
          <CardDescription>
            Configure como e quando deseja receber notificações de tarefas
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between space-x-2">
            <div>
              <Label htmlFor="notifications-toggle" className="text-base font-medium">
                Ativar notificações
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Receba alertas sobre suas tarefas pendentes
              </p>
            </div>
            <Switch
              id="notifications-toggle"
              disabled={isUpdating}
              checked={configNotificacoes.ativadas}
              onCheckedChange={handleNotificationsToggle}
            />
          </div>
          
          <div className="flex items-center justify-between space-x-2">
            <div>
              <Label htmlFor="sound-toggle" className="text-base font-medium">
                Som de notificação
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                Reproduzir som ao receber uma notificação
              </p>
            </div>
            <Switch
              id="sound-toggle"
              disabled={isUpdating || !configNotificacoes.ativadas}
              checked={configNotificacoes.comSom}
              onCheckedChange={handleSoundToggle}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="antecedencia" className="text-base font-medium">
              Tempo de antecedência
            </Label>
            <p className="text-sm text-muted-foreground mb-2">
              Com quanto tempo de antecedência deseja ser notificado
            </p>
            <div className="flex space-x-2">
              <Select
                disabled={isUpdating || !configNotificacoes.ativadas}
                value={configNotificacoes.antecedencia.valor.toString()}
                onValueChange={handleValorChange}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Valor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1</SelectItem>
                  <SelectItem value="2">2</SelectItem>
                  <SelectItem value="5">5</SelectItem>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="15">15</SelectItem>
                  <SelectItem value="30">30</SelectItem>
                  <SelectItem value="60">60</SelectItem>
                  <SelectItem value="120">120</SelectItem>
                  <SelectItem value="180">180</SelectItem>
                  <SelectItem value="240">240</SelectItem>
                </SelectContent>
              </Select>
              
              <Select
                disabled={isUpdating || !configNotificacoes.ativadas}
                value={configNotificacoes.antecedencia.unidade}
                onValueChange={(value) => handleUnidadeChange(value as 'minutos' | 'horas')}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Unidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minutos">Minutos</SelectItem>
                  <SelectItem value="horas">Horas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {configNotificacoes.ativadas && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-md flex items-start space-x-2">
              <Info className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm text-yellow-800">
                  Nota para tempos de antecedência curtos (1-5 minutos): Para garantir que receba notificações imediatas, 
                  recomendamos manter o aplicativo aberto em uma aba ou instalá-lo como aplicativo na tela inicial.
                </p>
              </div>
            </div>
          )}
        </CardContent>
        <CardFooter className="border-t pt-6 mt-4">
          <div className="w-full flex flex-col space-y-2">
            <div className="text-sm font-medium">Dicas para notificações confiáveis:</div>
            <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
              <li>Em dispositivos iOS, adicione este app à tela inicial para melhor funcionamento em segundo plano.</li>
              <li>Para tempos muito curtos (1-2 minutos), mantenha o aplicativo aberto para maior precisão.</li>
              <li>Permita que o aplicativo use energia em segundo plano nas configurações do seu dispositivo.</li>
            </ul>
          </div>
        </CardFooter>
      </Card>
      
      <BackgroundNotificationCheck 
        onStatusChange={(enabled) => {
          // A implementação pode incluir alguma lógica adicional aqui
          console.log("Status das notificações em segundo plano:", enabled);
        }} 
      />
    </div>
  );
};

export default NotificationSettings; 