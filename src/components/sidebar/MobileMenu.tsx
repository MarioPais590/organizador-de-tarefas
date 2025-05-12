import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { NavItems } from './NavItems';
import { UserProfileHeader } from './UserProfileHeader';
import { useApp } from '@/context/AppContext';

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const { user } = useApp();
  
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <div className="fixed top-0 right-0 z-40 flex items-center justify-between w-full px-4 py-2 bg-background border-b md:hidden">
      <div className="relative flex-1"></div>
      
      <div className="flex items-center">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="h-9 w-9 rounded-full">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent className="w-[80%] max-w-sm" side="left">
            <div className="flex flex-col h-full">
              {user && <UserProfileHeader />}
              
              <div className="flex-1 mt-6">
                <NavItems onNavigation={() => setOpen(false)} />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}
