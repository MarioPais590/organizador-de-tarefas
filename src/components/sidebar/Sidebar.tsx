
import { useState } from 'react';
import { MobileMenu } from './MobileMenu';
import { DesktopSidebar } from './DesktopSidebar';

export function Sidebar() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  return (
    <>
      <MobileMenu />
      
      <DesktopSidebar isOpen={true} />
    </>
  );
}
