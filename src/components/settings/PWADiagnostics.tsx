import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { isPWAInstalado, isIOS, isSafari, podeInstalarPWA, forcarAtualizacaoIconesPWA } from '@/utils/pwaHelpers';
import { AlertCircle, CheckCircle2, Download, RefreshCw, Image, Smartphone } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function PWADiagnostics() {
  const [isPWA, setIsPWA] = useState<boolean>(false);
  const [podeInstalar, setPodeInstalar] = useState<boolean>(false);
  const [isVerificando, setIsVerificando] = useState<boolean>(false);
  const [serviceWorkerRegistrado, setServiceWorkerRegistrado] = useState(false);

  useEffect(() => {
    verificarStatus();
  }, []);

  const verificarStatus = async () => {
    setIsVerificando(true);
    
    // Verificar se está instalado como PWA
    const instalado = isPWAInstalado();
    setIsPWA(instalado);
    
    // Verificar se pode instalar
    const podeInstalar = podeInstalarPWA();
    setPodeInstalar(podeInstalar);
    
    // Verificar se o service worker está registrado
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        setServiceWorkerRegistrado(registrations.length > 0);
      } catch (error) {
        console.error('Erro ao verificar service worker:', error);
        setServiceWorkerRegistrado(false);
      }
    }
    
    setIsVerificando(false);
  };

  const forcarAtualizacao = async () => {
    setIsVerificando(true);
    
    // Limpar cache
    if ('caches' in window) {
      try {
        const cacheKeys = await caches.keys();
        for (const cacheKey of cacheKeys) {
          if (cacheKey.includes('organizador-tarefas')) {
            await caches.delete(cacheKey);
            console.log(`Cache limpo: ${cacheKey}`);
          }
        }
      } catch (error) {
        console.error('Erro ao limpar cache:', error);
      }
    }
    
    // Atualizar o service worker
    if ('serviceWorker' in navigator) {
      try {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
          await registration.update();
        }
      } catch (error) {
        console.error('Erro ao atualizar service worker:', error);
      }
    }
    
    await verificarStatus();
    
    // Recarregar a página para aplicar as alterações
    window.location.reload();
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Smartphone className="h-5 w-5" /> Diagnóstico PWA
        </CardTitle>
        <CardDescription>
          Verifique o status da instalação do aplicativo como PWA
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4">
          <div className="flex items-center justify-between">
            <span>Status do PWA:</span>
            <span className={`flex items-center gap-1 ${isPWA ? 'text-green-500' : 'text-amber-500'}`}>
              {isPWA ? (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Instalado como PWA
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4" /> Não instalado como PWA
                </>
              )}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span>Pode instalar:</span>
            <span className={`flex items-center gap-1 ${podeInstalar ? 'text-green-500' : 'text-red-500'}`}>
              {podeInstalar ? (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Sim
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4" /> Não
                </>
              )}
            </span>
          </div>
          
          <div className="flex justify-between items-center">
            <span>Service Worker:</span>
            {serviceWorkerRegistrado ? (
              <Badge variant="outline" className="bg-green-500 text-white">Registrado</Badge>
            ) : (
              <Badge variant="destructive">Não registrado</Badge>
            )}
          </div>
          
          <div className="flex justify-between items-center">
            <span>Dispositivo iOS:</span>
            <Badge variant={isIOS() ? "default" : "outline"}>
              {isIOS() ? "Sim" : "Não"}
            </Badge>
          </div>
          
          <div className="flex justify-between items-center">
            <span>Navegador Safari:</span>
            <Badge variant={isSafari() ? "default" : "outline"}>
              {isSafari() ? "Sim" : "Não"}
            </Badge>
          </div>
        </div>
        
        {!isPWA && podeInstalar && (
          <Alert>
            <Download className="h-4 w-4" />
            <AlertTitle>PWA disponível</AlertTitle>
            <AlertDescription>
              Este aplicativo pode ser instalado como PWA. 
              Procure pelo botão de instalação no navegador.
            </AlertDescription>
          </Alert>
        )}
        
        {!serviceWorkerRegistrado && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Service Worker não registrado</AlertTitle>
            <AlertDescription>
              O Service Worker não está registrado. O aplicativo não poderá ser instalado sem um Service Worker.
              Recarregue a página para tentar registrá-lo novamente.
            </AlertDescription>
          </Alert>
        )}
        
        <div className="mt-4">
          <h3 className="text-lg font-medium mb-2">Visualização do ícone</h3>
          <div className="flex justify-center">
            <img 
              src={`/task-manager-icon.png?v=${Date.now()}`} 
              alt="Ícone do aplicativo" 
              className="border rounded-md"
              width={128}
              height={128}
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWFsZXJ0LWNpcmNsZSI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiLz48bGluZSB4MT0iMTIiIHkxPSI4IiB4Mj0iMTIiIHkyPSIxMiIvPjxsaW5lIHgxPSIxMiIgeTE9IjE2IiB4Mj0iMTIuMDEiIHkyPSIxNiIvPjwvc3ZnPg==';
              }}
            />
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        <Button 
          variant="outline" 
          onClick={verificarStatus} 
          disabled={isVerificando}
        >
          {isVerificando ? (
            <>
              <RefreshCw className="mr-2 h-4 w-4 animate-spin" /> Verificando
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" /> Verificar
            </>
          )}
        </Button>
        
        <Button 
          variant="default" 
          onClick={forcarAtualizacao} 
          disabled={isVerificando}
        >
          <RefreshCw className="mr-2 h-4 w-4" /> Forçar atualização
        </Button>
      </CardFooter>
    </Card>
  );
} 