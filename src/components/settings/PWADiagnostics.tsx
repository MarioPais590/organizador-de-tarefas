import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { verificarIconesPWA, forcarAtualizacaoIconesPWA, estaPWAInstalado, solicitarInstalacaoPWA } from '@/utils/pwaHelpers';
import { 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  Download, 
  Info, 
  Server, 
  Shield 
} from 'lucide-react';
import { unregister } from '@/services/serviceWorkerRegistration';

export interface PWADiagnosticResult {
  supported: boolean;
  installed: boolean;
  canInstall: boolean;
  serviceWorker: boolean;
  manifest: boolean;
  icons: {
    valid: boolean;
    problems: string[];
  };
  offline: boolean;
}

export function PWADiagnostics() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<PWADiagnosticResult>({
    supported: false,
    installed: false,
    canInstall: false,
    serviceWorker: false,
    manifest: false,
    icons: {
      valid: false,
      problems: []
    },
    offline: false
  });
  const [installResult, setInstallResult] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  
  const runDiagnostics = async () => {
    setLoading(true);
    
    try {
      // Verificar suporte básico
      const pwaSupported = 'serviceWorker' in navigator;
      
      // Verificar se está instalado
      const isPwaInstalled = estaPWAInstalado();
      
      // Verificar se pode ser instalado (deferredPrompt disponível)
      const canInstallPwa = !!window.deferredPrompt;
      
      // Verificar Service Worker
      let serviceWorkerRegistered = false;
      if (pwaSupported) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        serviceWorkerRegistered = registrations.length > 0;
      }
      
      // Verificar manifest
      let manifestValid = false;
      try {
        const response = await fetch('/manifest.json');
        manifestValid = response.ok;
      } catch (error) {
        console.error('[PWA] Erro ao verificar manifest:', error);
      }
      
      // Verificar ícones
      const iconResult = await verificarIconesPWA();
      
      // Verificar suporte offline
      let offlineSupported = false;
      if ('caches' in window) {
        const caches = await window.caches.keys();
        offlineSupported = caches.length > 0;
      }
      
      setStatus({
        supported: pwaSupported,
        installed: isPwaInstalled,
        canInstall: canInstallPwa,
        serviceWorker: serviceWorkerRegistered,
        manifest: manifestValid,
        icons: {
          valid: iconResult.validos,
          problems: iconResult.problemas
        },
        offline: offlineSupported
      });
    } catch (error) {
      console.error('[PWA] Erro durante diagnóstico:', error);
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    runDiagnostics();
  }, []);
  
  const refreshIcons = async () => {
    setRefreshing(true);
    try {
      await forcarAtualizacaoIconesPWA();
      // O componente será recarregado pela função forcarAtualizacaoIconesPWA
    } catch (error) {
      console.error('[PWA] Erro ao atualizar ícones:', error);
      setRefreshing(false);
    }
  };
  
  const installPwa = async () => {
    try {
      const result = await solicitarInstalacaoPWA();
      setInstallResult(result);
      
      if (result === 'accepted') {
        // Atualizar o status após a instalação bem-sucedida
        setTimeout(() => {
          runDiagnostics();
        }, 1000);
      }
    } catch (error) {
      console.error('[PWA] Erro ao solicitar instalação:', error);
      setInstallResult('error');
    }
  };
  
  const resetServiceWorker = async () => {
    try {
      await unregister();
      // Recarregar a página para aplicar as alterações
      window.location.reload();
    } catch (error) {
      console.error('[PWA] Erro ao resetar service worker:', error);
    }
  };
  
  const StatusIcon = ({ condition }: { condition: boolean }) => (
    condition ? 
      <CheckCircle className="h-5 w-5 text-green-500" /> : 
      <XCircle className="h-5 w-5 text-red-500" />
  );
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-2">
          <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-600"></div>
          <p className="text-sm text-muted-foreground">Verificando status do PWA...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-6">
        {/* Status Geral */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-medium">Status do PWA</h3>
            {!status.supported && (
              <Badge variant="destructive">Não suportado</Badge>
            )}
            {status.supported && !status.installed && (
              <Badge variant="outline">Não instalado</Badge>
            )}
            {status.installed && (
              <Badge variant="secondary">Instalado</Badge>
            )}
          </div>
          
          <div className="grid gap-2 md:grid-cols-2">
            <Card>
              <CardHeader className="p-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Server className="h-4 w-4" />
                  Suporte Técnico
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-2 pt-0">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center justify-between">
                    <span>PWA Suportado:</span>
                    <StatusIcon condition={status.supported} />
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Service Worker:</span>
                    <StatusIcon condition={status.serviceWorker} />
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Manifesto:</span>
                    <StatusIcon condition={status.manifest} />
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Ícones:</span>
                    <StatusIcon condition={status.icons.valid} />
                  </li>
                </ul>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="p-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Status de Instalação
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-2 pt-0">
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center justify-between">
                    <span>Aplicativo Instalado:</span>
                    <StatusIcon condition={status.installed} />
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Pode Instalar:</span>
                    <StatusIcon condition={status.canInstall} />
                  </li>
                  <li className="flex items-center justify-between">
                    <span>Suporte Offline:</span>
                    <StatusIcon condition={status.offline} />
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Ações */}
        <div>
          <h3 className="mb-2 text-lg font-medium">Ações</h3>
          <div className="flex flex-wrap gap-2">
            {status.canInstall && (
              <Button onClick={installPwa}>
                <Download className="mr-2 h-4 w-4" />
                Instalar aplicativo
              </Button>
            )}
            <Button variant="outline" onClick={refreshIcons} disabled={refreshing}>
              <RefreshCw className={`mr-2 h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Atualizando...' : 'Atualizar ícones'}
            </Button>
            <Button variant="outline" onClick={resetServiceWorker}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Reiniciar Service Worker
            </Button>
            <Button variant="outline" onClick={runDiagnostics}>
              <RefreshCw className="mr-2 h-4 w-4" />
              Verificar novamente
            </Button>
          </div>
          
          {installResult && (
            <Alert className="mt-4" variant={installResult === 'accepted' ? 'default' : 'destructive'}>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Resultado da instalação</AlertTitle>
              <AlertDescription>
                {installResult === 'accepted' && 'Aplicativo instalado com sucesso!'}
                {installResult === 'dismissed' && 'Instalação cancelada pelo usuário.'}
                {installResult === 'unavailable' && 'Não é possível instalar no momento.'}
                {installResult === 'error' && 'Erro ao tentar instalar.'}
              </AlertDescription>
            </Alert>
          )}
        </div>
        
        {/* Detalhes e Problemas */}
        {(!status.icons.valid || status.icons.problems.length > 0) && (
          <Card>
            <CardHeader className="p-4">
              <CardTitle className="text-base">Problemas com Ícones</CardTitle>
              <CardDescription>
                Alguns ícones do PWA estão faltando ou são inacessíveis.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-4 pb-2 pt-0">
              <ul className="space-y-1 text-sm">
                {status.icons.problems.map((problem, index) => (
                  <li key={index} className="text-red-500 flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                    <span>{problem}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter className="p-4 pt-2">
              <Button variant="outline" size="sm" onClick={refreshIcons}>
                <RefreshCw className="mr-2 h-3 w-3" />
                Atualizar ícones
              </Button>
            </CardFooter>
          </Card>
        )}
        
        {/* Informações */}
        <div>
          <h3 className="mb-2 text-lg font-medium flex items-center gap-2">
            <Info className="h-4 w-4" />
            Informações
          </h3>
          <Card>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground mb-4">
                Um Progressive Web App (PWA) permite que o aplicativo seja instalado no dispositivo, 
                oferecendo uma experiência semelhante a um aplicativo nativo com acesso offline.
              </p>
              
              <Separator className="my-4" />
              
              <h4 className="text-sm font-medium mb-2">O que fazer se tiver problemas?</h4>
              <ul className="text-sm space-y-2">
                <li className="flex gap-2">
                  <RefreshCw className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Atualize os ícones se estiverem faltando ou corrompidos.</span>
                </li>
                <li className="flex gap-2">
                  <RefreshCw className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Reinicie o Service Worker se o aplicativo não estiver funcionando corretamente.</span>
                </li>
                <li className="flex gap-2">
                  <RefreshCw className="h-4 w-4 mt-0.5 flex-shrink-0" />
                  <span>Limpe o cache do navegador se enfrentar problemas persistentes.</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
} 