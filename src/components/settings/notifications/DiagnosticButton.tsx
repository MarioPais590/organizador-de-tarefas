import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileSearch, Cpu } from 'lucide-react';
import { useApp } from '@/context/AppContext';
import { verificarSuporteNotificacoes } from '@/services/notificationService';
import { toast } from 'sonner';
import { detectAvailableFeatures, runDiagnostics } from '@/services/diagnosticService';

export const DiagnosticButton: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [diagnosticResults, setDiagnosticResults] = useState<any>(null);
  const { configNotificacoes } = useApp();
  
  const runFullDiagnostic = async () => {
    setIsRunning(true);
    try {
      // Detectar recursos disponíveis
      const features = detectAvailableFeatures();
      
      // Executar diagnóstico completo
      const results = await runDiagnostics();
      
      // Combinar resultados
      const combinedResults = {
        timestamp: new Date().toISOString(),
        features,
        ...results,
        configNotificacoes
      };
      
      setDiagnosticResults(combinedResults);
      
      // Verificar se há problemas críticos
      const criticalIssues = results.issues.filter((issue: any) => issue.severity === 'critical');
      if (criticalIssues.length > 0) {
        toast.error(`Detectados ${criticalIssues.length} problemas críticos que podem impedir notificações.`);
      }
    } catch (error) {
      console.error("Erro ao executar diagnóstico:", error);
      toast.error("Ocorreu um erro ao executar o diagnóstico.");
    } finally {
      setIsRunning(false);
    }
  };
  
  const renderFeatureStatus = (name: string, value: boolean) => {
    return (
      <div className="flex justify-between my-1">
        <span>{name}</span>
        <span className={value ? "text-green-600 font-medium" : "text-red-500 font-medium"}>
          {value ? "Disponível" : "Indisponível"}
        </span>
      </div>
    );
  };
  
  const handleCopyDiagnostics = () => {
    if (!diagnosticResults) return;
    
    const diagText = JSON.stringify(diagnosticResults, null, 2);
    navigator.clipboard.writeText(diagText)
      .then(() => toast.success("Diagnóstico copiado para a área de transferência"))
      .catch(() => toast.error("Erro ao copiar diagnóstico"));
  };
  
  return (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        onClick={() => setOpen(true)}
        className="flex items-center gap-1"
      >
        <FileSearch className="h-4 w-4 mr-1" />
        Diagnóstico
      </Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              Diagnóstico de Notificações
            </DialogTitle>
            <DialogDescription>
              Verifique a compatibilidade do seu navegador e dispositivo com notificações em segundo plano.
            </DialogDescription>
          </DialogHeader>
          
          {!diagnosticResults ? (
            <div className="flex flex-col items-center justify-center py-8">
              <p className="text-center text-muted-foreground mb-4">
                Execute o diagnóstico para verificar se há problemas com as notificações.
              </p>
              <Button 
                onClick={runFullDiagnostic} 
                disabled={isRunning}
              >
                {isRunning ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-background"></div>
                    Executando diagnóstico...
                  </>
                ) : "Executar Diagnóstico"}
              </Button>
            </div>
          ) : (
            <>
              <ScrollArea className="h-[300px] rounded-md border p-4">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-medium mb-2">Recursos do Navegador</h3>
                    <div className="space-y-1 pl-2">
                      {renderFeatureStatus("Notificações", diagnosticResults.features.notification)}
                      {renderFeatureStatus("Service Worker", diagnosticResults.features.serviceWorker)}
                      {renderFeatureStatus("Push API", diagnosticResults.features.pushManager)}
                      {renderFeatureStatus("Instalado como PWA", diagnosticResults.features.isPWA)}
                      {renderFeatureStatus("Background Sync", diagnosticResults.features.sync || false)}
                      {renderFeatureStatus("Armazenamento Persistente", diagnosticResults.features.persistentStorage)}
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium mb-2">Status das Notificações</h3>
                    <div className="space-y-1 pl-2">
                      <div className="flex justify-between">
                        <span>Permissão</span>
                        <span className={
                          diagnosticResults.notification?.permission === "granted" 
                            ? "text-green-600 font-medium" 
                            : "text-red-500 font-medium"
                        }>
                          {diagnosticResults.notification?.permission || "desconhecida"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Ativadas nas configurações</span>
                        <span className={configNotificacoes.ativadas ? "text-green-600 font-medium" : "text-red-500 font-medium"}>
                          {configNotificacoes.ativadas ? "Sim" : "Não"}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="text-sm font-medium mb-2">Problemas Detectados</h3>
                    {diagnosticResults.issues.length === 0 ? (
                      <p className="text-sm text-green-600">Nenhum problema detectado! O sistema deve funcionar corretamente.</p>
                    ) : (
                      <ul className="space-y-2 pl-2">
                        {diagnosticResults.issues.map((issue: any, index: number) => (
                          <li key={index} className={`text-sm ${issue.severity === 'critical' ? 'text-red-500' : 'text-yellow-600'}`}>
                            {issue.message}
                            {issue.solution && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Solução: {issue.solution}
                              </p>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </ScrollArea>
              
              <DialogFooter className="flex justify-between items-center mt-4">
                <div className="text-xs text-muted-foreground">
                  Executado em: {new Date(diagnosticResults.timestamp).toLocaleString()}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={runFullDiagnostic}>
                    Executar Novamente
                  </Button>
                  <Button variant="secondary" size="sm" onClick={handleCopyDiagnostics}>
                    Copiar Resultados
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}; 