import { useState } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { NavItems } from './NavItems';
import { UserProfileHeader } from './UserProfileHeader';
import { useApp } from '@/context/AppContext';

interface DesktopSidebarProps {
  isOpen: boolean;
}

export function DesktopSidebar({ isOpen }: DesktopSidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { user } = useApp();

  return (
    <aside className={`hidden md:flex flex-col h-screen bg-background border-r p-3 transition-all duration-300 ${
      collapsed ? 'w-20' : 'w-64'
    }`}>
      <div className="flex items-center justify-end mb-6">
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8" 
          onClick={() => setCollapsed(!collapsed)}
        >
          <ChevronLeft className={`h-5 w-5 transition-transform ${collapsed ? 'rotate-180' : ''}`} />
        </Button>
      </div>
      
      {user && <UserProfileHeader isCollapsed={collapsed} />}
      
      <div className="mt-6 flex-1 overflow-y-auto">
        <NavItems isCollapsed={collapsed} />
      </div>
    </aside>
  );
}
