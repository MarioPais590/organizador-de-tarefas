import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { verificarIconesPWA, isPWAInstalado, isIOS, isSafari, podeInstalarPWA, forcarAtualizacaoIconesPWA } from '@/utils/pwaHelpers';
import { AlertCircle, CheckCircle, Download, RefreshCw, Image } from 'lucide-react';

export function PWADiagnostics() {
  const [iconesSaoValidos, setIconesSaoValidos] = useState<boolean | null>(null);
  const [instalado, setInstalado] = useState(false);
  const [podeInstalar, setPodeInstalar] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isUpdatingIcons, setIsUpdatingIcons] = useState(false);
  const [serviceWorkerRegistrado, setServiceWorkerRegistrado] = useState(false);

  useEffect(() => {
    checkPWAStatus();
  }, []);

  const checkPWAStatus = async () => {
    setIsChecking(true);
    
    // Verificar se o PWA está instalado
    const pwaInstalado = isPWAInstalado();
    setInstalado(pwaInstalado);
    
    // Verificar se o PWA pode ser instalado
    setPodeInstalar(podeInstalarPWA());
    
    // Verificar se os ícones são válidos
    const icones = await verificarIconesPWA();
    setIconesSaoValidos(icones);
    
    // Verificar se o service worker está registrado
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      setServiceWorkerRegistrado(registrations.length > 0);
    }
    
    setIsChecking(false);
  };

  const handleRefresh = () => {
    checkPWAStatus();
  };
  
  const handleUpdateIcons = async () => {
    setIsUpdatingIcons(true);
    
    try {
      // Forçar a atualização dos ícones
      const resultado = await forcarAtualizacaoIconesPWA();
      
      if (resultado) {
        alert('Ícones atualizados com sucesso! Recarregue a página para ver as alterações.');
      } else {
        alert('Não foi possível atualizar todos os ícones. Verifique o console para mais detalhes.');
      }
      
      // Verificar novamente o status
      await checkPWAStatus();
    } catch (error) {
      console.error('Erro ao atualizar ícones:', error);
      alert('Ocorreu um erro ao tentar atualizar os ícones.');
    } finally {
      setIsUpdatingIcons(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Diagnóstico do PWA</CardTitle>
        <CardDescription>
          Verifique o status da instalação do aplicativo
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center">
            <span>Status de instalação:</span>
            {instalado ? (
              <Badge variant="default" className="bg-green-500 text-white">Instalado</Badge>
            ) : (
              <Badge variant="outline">Não instalado</Badge>
            )}
          </div>
          
          <div className="flex justify-between items-center">
            <span>Service Worker:</span>
            {serviceWorkerRegistrado ? (
              <Badge variant="default" className="bg-green-500 text-white">Registrado</Badge>
            ) : (
              <Badge variant="destructive">Não registrado</Badge>
            )}
          </div>
          
          <div className="flex justify-between items-center">
            <span>Ícones do PWA:</span>
            {iconesSaoValidos === null ? (
              <Badge variant="outline">Verificando...</Badge>
            ) : iconesSaoValidos ? (
              <Badge variant="default" className="bg-green-500 text-white">Válidos</Badge>
            ) : (
              <Badge variant="destructive">Problemas encontrados</Badge>
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
          
          <div className="flex justify-between items-center">
            <span>Pode ser instalado:</span>
            {podeInstalar ? (
              <Badge variant="default" className="bg-green-500 text-white">Sim</Badge>
            ) : (
              <Badge variant="destructive">Não</Badge>
            )}
          </div>
        </div>
        
        {!iconesSaoValidos && iconesSaoValidos !== null && (
          <div className="flex items-center gap-2 p-3 bg-yellow-100 text-yellow-800 rounded-md">
            <AlertCircle size={18} />
            <p className="text-sm">
              Foram detectados problemas com os ícones do PWA. Isso pode impedir a instalação correta do aplicativo.
              Tente usar o botão "Atualizar ícones" abaixo.
            </p>
          </div>
        )}
        
        {!serviceWorkerRegistrado && (
          <div className="flex items-center gap-2 p-3 bg-red-100 text-red-800 rounded-md">
            <AlertCircle size={18} />
            <p className="text-sm">
              O Service Worker não está registrado. O aplicativo não poderá ser instalado sem um Service Worker.
              Recarregue a página para tentar registrá-lo novamente.
            </p>
          </div>
        )}
        
        {podeInstalar && !instalado && (
          <div className="flex items-center gap-2 p-3 bg-green-100 text-green-800 rounded-md">
            <CheckCircle size={18} />
            <p className="text-sm">
              Este aplicativo pode ser instalado como um PWA. Procure pelo botão de instalação no canto superior direito da tela.
            </p>
          </div>
        )}
        
        {isIOS() && !instalado && (
          <div className="flex items-center gap-2 p-3 bg-blue-100 text-blue-800 rounded-md">
            <AlertCircle size={18} />
            <p className="text-sm">
              No iOS, você precisa usar o botão de compartilhamento e selecionar "Adicionar à Tela de Início" para instalar o aplicativo.
            </p>
          </div>
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
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2">
        <Button 
          variant="outline" 
          onClick={handleRefresh} 
          disabled={isChecking}
          className="flex items-center gap-2"
        >
          <RefreshCw size={16} className={isChecking ? "animate-spin" : ""} />
          Atualizar status
        </Button>
        
        <Button 
          variant="outline" 
          onClick={handleUpdateIcons} 
          disabled={isUpdatingIcons}
          className="flex items-center gap-2"
        >
          <Image size={16} className={isUpdatingIcons ? "animate-pulse" : ""} />
          Atualizar ícones
        </Button>
        
        {window.deferredPrompt && !instalado && (
          <Button 
            onClick={() => {
              if (window.deferredPrompt) {
                window.deferredPrompt.prompt();
              }
            }}
            className="flex items-center gap-2"
          >
            <Download size={16} />
            Instalar agora
          </Button>
        )}
      </CardFooter>
    </Card>
  );
} 