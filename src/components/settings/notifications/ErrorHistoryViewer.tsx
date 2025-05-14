import React, { useState, useEffect } from 'react';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { AlertTriangle, RefreshCw, XCircle, Check, Code, Download } from 'lucide-react';
import { getPushErrorHistory, clearPushErrorHistory, PushErrorType } from '@/services/errorMonitoringService';
import { toast } from 'sonner';

interface ErrorHistoryViewerProps {
  maxErrors?: number;
}

export function ErrorHistoryViewer({ maxErrors = 5 }: ErrorHistoryViewerProps) {
  const [errors, setErrors] = useState<any[]>([]);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    loadErrors();
  }, []);

  const loadErrors = () => {
    try {
      const errorHistory = getPushErrorHistory();
      setErrors(errorHistory.slice(-maxErrors));
    } catch (error) {
      console.error('Erro ao carregar histórico de erros:', error);
    }
  };

  const clearErrors = () => {
    try {
      clearPushErrorHistory();
      setErrors([]);
      toast.success('Histórico de erros limpo com sucesso');
    } catch (error) {
      console.error('Erro ao limpar histórico:', error);
      toast.error('Erro ao limpar histórico');
    }
  };

  const refreshErrors = () => {
    loadErrors();
    toast.success('Histórico atualizado');
  };

  const downloadErrorsJson = () => {
    try {
      const errorData = JSON.stringify(errors, null, 2);
      const blob = new Blob([errorData], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `push-error-history-${new Date().toISOString().slice(0, 10)}.json`;
      document.body.appendChild(a);
      a.click();
      
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      toast.success('Arquivo de diagnóstico gerado');
    } catch (error) {
      console.error('Erro ao exportar histórico:', error);
      toast.error('Erro ao exportar histórico');
    }
  };

  // Mapeamento de cores por tipo de erro
  const getErrorBadgeColor = (errorType: PushErrorType): string => {
    const colors: Record<PushErrorType, string> = {
      [PushErrorType.PERMISSION_DENIED]: 'bg-orange-100 text-orange-800',
      [PushErrorType.SUBSCRIPTION_FAILED]: 'bg-red-100 text-red-800',
      [PushErrorType.NETWORK_ERROR]: 'bg-blue-100 text-blue-800',
      [PushErrorType.SERVICE_WORKER_ERROR]: 'bg-purple-100 text-purple-800',
      [PushErrorType.BACKGROUND_SYNC_ERROR]: 'bg-indigo-100 text-indigo-800',
      [PushErrorType.NOTIFICATION_DELIVERY_FAILED]: 'bg-pink-100 text-pink-800',
      [PushErrorType.DEVICE_SPECIFIC]: 'bg-teal-100 text-teal-800',
      [PushErrorType.UNSUPPORTED_BROWSER]: 'bg-slate-100 text-slate-800',
      [PushErrorType.UNKNOWN]: 'bg-gray-100 text-gray-800',
    };
    
    return colors[errorType] || 'bg-gray-100 text-gray-800';
  };

  // Formatação de data/hora
  const formatTimestamp = (timestamp: number): string => {
    return new Date(timestamp).toLocaleString();
  };

  if (errors.length === 0) {
    return (
      <div className="border rounded-md p-4 text-center text-muted-foreground bg-muted/40">
        <div className="flex justify-center mb-2">
          <Check className="h-5 w-5 text-green-500" />
        </div>
        <p>Nenhum erro de notificação registrado</p>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={refreshErrors}
          className="mt-2"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Atualizar
        </Button>
      </div>
    );
  }

  return (
    <div className="border rounded-md p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium flex items-center">
          <AlertTriangle className="h-4 w-4 mr-1 text-amber-500" />
          Histórico de erros ({errors.length})
        </h3>
        
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={refreshErrors} title="Atualizar">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={clearErrors} title="Limpar histórico">
            <XCircle className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={downloadErrorsJson} title="Baixar diagnóstico">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>
      
      <div className="space-y-3">
        {errors.map((error, index) => (
          <div key={index} className="p-2 bg-muted/30 rounded-sm text-xs">
            <div className="flex items-center justify-between mb-1">
              <Badge className={getErrorBadgeColor(error.type)}>
                {error.type}
              </Badge>
              <span className="text-muted-foreground">
                {formatTimestamp(error.timestamp)}
              </span>
            </div>
            
            <p className="mb-1">{error.message}</p>
            
            {expanded && (
              <>
                {error.deviceInfo && (
                  <div className="mt-2 p-1 bg-muted/70 rounded text-[10px] overflow-hidden">
                    <div className="flex items-center gap-1 mb-1">
                      <Code className="h-3 w-3" />
                      <span className="font-medium">Informações do dispositivo</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <span>iOS: {error.deviceInfo.isIOS ? 'Sim' : 'Não'}</span>
                      <span>Android: {error.deviceInfo.isAndroid ? 'Sim' : 'Não'}</span>
                      <span>Safari: {error.deviceInfo.isSafari ? 'Sim' : 'Não'}</span>
                      <span>PWA: {error.deviceInfo.isPWA ? 'Sim' : 'Não'}</span>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
      
      <Button 
        variant="link" 
        size="sm" 
        onClick={() => setExpanded(!expanded)} 
        className="mt-2 text-xs h-auto p-0"
      >
        {expanded ? 'Mostrar menos detalhes' : 'Mostrar mais detalhes'}
      </Button>
    </div>
  );
}

export default ErrorHistoryViewer; 