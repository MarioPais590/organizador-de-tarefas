import React, { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Download } from 'lucide-react';
import { promptPwaInstall, isPwaInstallable } from '@/utils/pwaHelpers';

interface PWAInstallButtonProps {
  variant?: 'default' | 'outline' | 'secondary';
  className?: string;
}

export function PWAInstallButton({ 
  variant = 'default', 
  className = '' 
}: PWAInstallButtonProps) {
  const [canInstall, setCanInstall] = useState(false);
  
  // Verificar se o app pode ser instalado
  useEffect(() => {
    const checkInstallable = () => {
      setCanInstall(isPwaInstallable());
    };
    
    // Verificar inicialmente
    checkInstallable();
    
    // Verificar quando o evento beforeinstallprompt for disparado
    window.addEventListener('beforeinstallprompt', checkInstallable);
    
    // Verificar quando o evento appinstalled for disparado
    window.addEventListener('appinstalled', () => {
      setCanInstall(false);
    });
    
    return () => {
      window.removeEventListener('beforeinstallprompt', checkInstallable);
    };
  }, []);
  
  // Se não pode instalar, não renderiza o botão
  if (!canInstall) {
    return null;
  }
  
  const handleInstall = async () => {
    const installed = await promptPwaInstall();
    if (installed) {
      setCanInstall(false);
    }
  };
  
  return (
    <Button
      variant={variant}
      className={className}
      onClick={handleInstall}
    >
      <Download className="h-4 w-4 mr-2" />
      Instalar App
    </Button>
  );
}

export default PWAInstallButton; 