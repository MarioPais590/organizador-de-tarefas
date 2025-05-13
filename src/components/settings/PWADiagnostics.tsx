import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { verificarIconesPWA, isPWAInstalado, isIOS, isSafari, podeInstalarPWA, forcarAtualizacaoIconesPWA, verificarIconesDiferentes } from '@/utils/pwaHelpers';
import { AlertCircle, CheckCircle2, Download, RefreshCw, Image, Smartphone } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function PWADiagnostics() {
  const [iconeStatus, setIconeStatus] = useState<'verificando' | 'ok' | 'erro'>('verificando');
  const [iconesReais, setIconesReais] = useState<boolean | null>(null);
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
    
    // Verificar ícones
    const iconesCarregados = await verificarIconesPWA();
    setIconeStatus(iconesCarregados ? 'ok' : 'erro');
    
    // Verificar se os ícones são reais ou placeholders
    const saoReais = await verificarIconesDiferentes();
    setIconesReais(saoReais);
    
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
    await forcarAtualizacaoIconesPWA();
    await verificarStatus();
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
          
          <div className="flex items-center justify-between">
            <span>Status dos ícones:</span>
            <span className={`flex items-center gap-1 ${
              iconeStatus === 'ok' ? 'text-green-500' : 
              iconeStatus === 'erro' ? 'text-red-500' : 'text-amber-500'
            }`}>
              {iconeStatus === 'ok' ? (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Carregados
                </>
              ) : iconeStatus === 'erro' ? (
                <>
                  <AlertCircle className="h-4 w-4" /> Erro
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> Verificando
                </>
              )}
            </span>
          </div>
          
          <div className="flex items-center justify-between">
            <span>Ícones reais:</span>
            <span className={`flex items-center gap-1 ${
              iconesReais === true ? 'text-green-500' : 
              iconesReais === false ? 'text-red-500' : 'text-amber-500'
            }`}>
              {iconesReais === true ? (
                <>
                  <CheckCircle2 className="h-4 w-4" /> Sim
                </>
              ) : iconesReais === false ? (
                <>
                  <AlertCircle className="h-4 w-4" /> Não (placeholders)
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" /> Verificando
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
        
        {iconesReais === false && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Problema com ícones</AlertTitle>
            <AlertDescription>
              Os ícones do PWA parecem ser placeholders ou estão corrompidos. 
              Substitua-os por ícones reais para que o PWA funcione corretamente.
            </AlertDescription>
          </Alert>
        )}
        
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
          <h3 className="text-lg font-medium mb-2">Visualização dos ícones</h3>
          <div className="grid grid-cols-4 gap-2">
            {[72, 96, 128, 144, 152, 192].map(size => (
              <div key={size} className="flex flex-col items-center">
                <img 
                  src={`/icons/icon-${size}x${size}.png?v=${Date.now()}`} 
                  alt={`Ícone ${size}x${size}`} 
                  className="border rounded-md"
                  width={size > 100 ? 100 : size}
                  height={size > 100 ? 100 : size}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyNCIgaGVpZ2h0PSIyNCIgdmlld0JveD0iMCAwIDI0IDI0IiBmaWxsPSJub25lIiBzdHJva2U9ImN1cnJlbnRDb2xvciIgc3Ryb2tlLXdpZHRoPSIyIiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIGNsYXNzPSJsdWNpZGUgbHVjaWRlLWFsZXJ0LWNpcmNsZSI+PGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTAiLz48bGluZSB4MT0iMTIiIHkxPSI4IiB4Mj0iMTIiIHkyPSIxMiIvPjxsaW5lIHgxPSIxMiIgeTE9IjE2IiB4Mj0iMTIuMDEiIHkyPSIxNiIvPjwvc3ZnPg==';
                  }}
                />
                <span className="text-xs mt-1">{size}x{size}</span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="mt-4 p-4 border rounded-md bg-gray-50">
          <h3 className="text-lg font-medium mb-2">Instruções para corrigir ícones</h3>
          <ol className="list-decimal pl-5 space-y-2">
            <li>Crie ícones nos tamanhos corretos: 72x72, 96x96, 128x128, 144x144, 152x152, 192x192, 384x384, 512x512</li>
            <li>Crie também um ícone "maskable" de 512x512 com área de segurança (ícone dentro de um círculo)</li>
            <li>Substitua os arquivos na pasta <code>public/icons/</code></li>
            <li>Recarregue a página e use o botão "Atualizar ícones" abaixo</li>
          </ol>
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