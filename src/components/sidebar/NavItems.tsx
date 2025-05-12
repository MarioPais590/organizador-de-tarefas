import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  Calendar, 
  Clock, 
  Settings, 
  User, 
  CheckCircle,
  BarChart,
  Tag,
  LogOut,
  Sun,
  Moon,
  Activity
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { useTheme } from '@/components/theme-provider';

type NavItemProps = {
  to: string;
  icon: React.ElementType;
  label: string;
  isCollapsed?: boolean;
  onClick?: () => void;
};

type NavItemsProps = {
  isCollapsed?: boolean;
  onNavigation?: () => void;
};

export function NavItems({ isCollapsed, onNavigation }: NavItemsProps) {
  const navigate = useNavigate();
  const { logout } = useApp();
  const { theme, setTheme } = useTheme();

  const handleLogout = async () => {
    if (onNavigation) {
      onNavigation();
    }
    const success = await logout();
    if (success) {
      navigate('/login');
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <>
      <NavItem to="/" icon={BarChart} label="Dashboard" isCollapsed={isCollapsed} onClick={onNavigation} />
      <NavItem to="/tarefas" icon={CheckCircle} label="Tarefas" isCollapsed={isCollapsed} onClick={onNavigation} />
      <NavItem to="/rotinas" icon={Clock} label="Rotinas" isCollapsed={isCollapsed} onClick={onNavigation} />
      <NavItem to="/calendario" icon={Calendar} label="Calendário" isCollapsed={isCollapsed} onClick={onNavigation} />
      <NavItem to="/categorias" icon={Tag} label="Categorias" isCollapsed={isCollapsed} onClick={onNavigation} />
      <NavItem to="/perfil" icon={User} label="Perfil" isCollapsed={isCollapsed} onClick={onNavigation} />
      <NavItem to="/configuracoes" icon={Settings} label="Configurações" isCollapsed={isCollapsed} onClick={onNavigation} />
      <NavItem to="/diagnostico" icon={Activity} label="Diagnóstico" isCollapsed={isCollapsed} onClick={onNavigation} />
      
      {/* Botão de alternar tema */}
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 transition-all cursor-pointer",
          "hover:bg-muted text-muted-foreground hover:text-foreground",
          isCollapsed && "justify-center px-2"
        )}
        onClick={toggleTheme}
      >
        {theme === 'dark' ? (
          <Sun className="h-5 w-5" />
        ) : (
          <Moon className="h-5 w-5" />
        )}
        {!isCollapsed && <span>Alternar Tema</span>}
      </div>
      
      {/* Botão de Logout */}
      <div
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 transition-all cursor-pointer",
          "hover:bg-muted text-muted-foreground hover:text-foreground",
          isCollapsed && "justify-center px-2"
        )}
        onClick={handleLogout}
      >
        <LogOut className="h-5 w-5" />
        {!isCollapsed && <span>Sair</span>}
      </div>
    </>
  );
}

function NavItem({ to, icon: Icon, label, isCollapsed, onClick }: NavItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 transition-all",
          isActive 
            ? "bg-azulPrincipal text-white" 
            : "hover:bg-muted text-muted-foreground hover:text-foreground",
          isCollapsed && "justify-center px-2"
        )
      }
      onClick={onClick}
    >
      <Icon className="h-5 w-5" />
      {!isCollapsed && <span>{label}</span>}
    </NavLink>
  );
}
