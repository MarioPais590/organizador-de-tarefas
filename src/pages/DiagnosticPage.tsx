import React, { useEffect, useState } from 'react';
import { Layout } from '@/components/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { appLogger } from '@/utils/logger';

export function DiagnosticPage() {
  const [systemInfo, setSystemInfo] = useState({
    browser: '',
    os: '',
    resolution: '',
    localStorage: false,
    indexedDB: false,
    cookies: false,
    serviceWorker: false
  });
  
  const [logs, setLogs] = useState<string[]>([]);
  
  useEffect(() => {
    // Detectar navegador
    const userAgent = navigator.userAgent;
    let browser = 'Desconhecido';
    
    if (userAgent.indexOf('Chrome') > -1) browser = 'Chrome';
    else if (userAgent.indexOf('Firefox') > -1) browser = 'Firefox';
    else if (userAgent.indexOf('Safari') > -1) browser = 'Safari';
    else if (userAgent.indexOf('Edge') > -1) browser = 'Edge';
    else if (userAgent.indexOf('MSIE') > -1 || userAgent.indexOf('Trident') > -1) browser = 'Internet Explorer';
    
    // Detectar sistema operacional
    let os = 'Desconhecido';
    if (userAgent.indexOf('Windows') > -1) os = 'Windows';
    else if (userAgent.indexOf('Mac') > -1) os = 'macOS';
    else if (userAgent.indexOf('Linux') > -1) os = 'Linux';
    else if (userAgent.indexOf('Android') > -1) os = 'Android';
    else if (userAgent.indexOf('iOS') > -1) os = 'iOS';
    
    // Verificar suporte a recursos
    const hasLocalStorage = !!window.localStorage;
    const hasIndexedDB = !!window.indexedDB;
    const hasCookies = navigator.cookieEnabled;
    const hasServiceWorker = 'serviceWorker' in navigator;
    
    // Obter resolução
    const resolution = `${window.innerWidth}x${window.innerHeight}`;
    
    setSystemInfo({
      browser,
      os,
      resolution,
      localStorage: hasLocalStorage,
      indexedDB: hasIndexedDB,
      cookies: hasCookies,
      serviceWorker: hasServiceWorker
    });
    
    // Obter logs
    try {
      const storedLogs = localStorage.getItem('app_logs');
      if (storedLogs) {
        setLogs(JSON.parse(storedLogs));
      }
    } catch (error) {
      console.error('Erro ao carregar logs:', error);
    }
  }, []);
  
  const limparCache = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
      appLogger.info('Cache limpo com sucesso');
      window.location.reload();
    } catch (error) {
      appLogger.error('Erro ao limpar cache:', error);
    }
  };
  
  return (
    <Layout>
      <div className="space-y-6">
        <h1 className="text-3xl font-bold">Diagnóstico do Aplicativo</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Informações do Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <div className="flex items-center justify-between">
                <span>Navegador:</span>
                <Badge variant="outline">{systemInfo.browser}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Sistema Operacional:</span>
                <Badge variant="outline">{systemInfo.os}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Resolução:</span>
                <Badge variant="outline">{systemInfo.resolution}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Local Storage:</span>
                <Badge variant={systemInfo.localStorage ? "secondary" : "destructive"}>
                  {systemInfo.localStorage ? "Disponível" : "Indisponível"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>IndexedDB:</span>
                <Badge variant={systemInfo.indexedDB ? "secondary" : "destructive"}>
                  {systemInfo.indexedDB ? "Disponível" : "Indisponível"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Cookies:</span>
                <Badge variant={systemInfo.cookies ? "secondary" : "destructive"}>
                  {systemInfo.cookies ? "Disponível" : "Indisponível"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Ações de Diagnóstico</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="destructive" onClick={limparCache}>
              Limpar Cache e Recarregar
            </Button>
          </CardContent>
        </Card>
        
        {logs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Logs do Aplicativo</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[200px] rounded border p-4">
                {logs.map((log, index) => (
                  <div key={index} className="py-1 text-sm">
                    {log}
                  </div>
                ))}
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}

export default DiagnosticPage; 