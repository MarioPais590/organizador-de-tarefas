/**
 * Componente para mostrar status de conexão do dispositivo
 * Útil para feedback visual sobre conectividade durante o uso
 */

import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, AlertTriangle } from 'lucide-react';
import { 
  ConnectionState,
  ConnectionEvent,
  addConnectionListener,
  removeConnectionListener,
  getConnectionState 
} from '@/services/connectionService';

interface ConnectionStatusProps {
  showLabel?: boolean;
  showOnlyOffline?: boolean;
  className?: string;
}

export function ConnectionStatus({ 
  showLabel = true, 
  showOnlyOffline = false,
  className = '' 
}: ConnectionStatusProps) {
  const [connectionState, setConnectionState] = useState<ConnectionState>(getConnectionState());
  
  useEffect(() => {
    // Função de callback para alterações no estado da conexão
    const handleConnectionChange = (state: ConnectionState) => {
      setConnectionState(state);
    };
    
    // Registrar para eventos de mudança de estado
    addConnectionListener(ConnectionEvent.STATE_CHANGE, handleConnectionChange);
    
    // Limpar listener ao desmontar
    return () => {
      removeConnectionListener(ConnectionEvent.STATE_CHANGE, handleConnectionChange);
    };
  }, []);
  
  // Se estiver configurado para mostrar apenas quando offline e estiver online, não mostrar nada
  if (showOnlyOffline && connectionState !== ConnectionState.OFFLINE) {
    return null;
  }
  
  // Determinar ícone, cor e texto baseado no estado da conexão
  const getConnectionInfo = () => {
    switch (connectionState) {
      case ConnectionState.ONLINE:
        return { 
          icon: <Wifi className="h-4 w-4 text-green-500" />,
          color: 'bg-green-100 text-green-800',
          text: 'Online'
        };
      case ConnectionState.OFFLINE:
        return { 
          icon: <WifiOff className="h-4 w-4 text-red-500" />,
          color: 'bg-red-100 text-red-800',
          text: 'Offline'
        };
      case ConnectionState.SLOW:
        return { 
          icon: <AlertTriangle className="h-4 w-4 text-yellow-500" />,
          color: 'bg-yellow-100 text-yellow-800',
          text: 'Conexão lenta'
        };
      case ConnectionState.METERED:
        return { 
          icon: <AlertTriangle className="h-4 w-4 text-blue-500" />,
          color: 'bg-blue-100 text-blue-800',
          text: 'Dados limitados'
        };
      default:
        return { 
          icon: <Wifi className="h-4 w-4 text-gray-500" />,
          color: 'bg-gray-100 text-gray-800',
          text: 'Desconhecido'
        };
    }
  };
  
  const { icon, color, text } = getConnectionInfo();
  
  return (
    <div className={`inline-flex items-center rounded-full px-2 py-1 text-xs ${color} ${className}`}>
      {icon}
      {showLabel && <span className="ml-1">{text}</span>}
    </div>
  );
}

export default ConnectionStatus; 