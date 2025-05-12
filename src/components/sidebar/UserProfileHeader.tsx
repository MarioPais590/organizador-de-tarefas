
import { useApp } from '@/context/AppContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User } from 'lucide-react';

type UserProfileHeaderProps = {
  isCollapsed?: boolean;
};

export function UserProfileHeader({ isCollapsed = false }: UserProfileHeaderProps) {
  const { perfil, user } = useApp();
  const userName = perfil?.nome || 'Usuário';
  const userEmail = user?.email || '';
  const avatarImage = perfil?.avatar || '';

  return (
    <div className={`flex items-center ${isCollapsed ? 'justify-center' : 'gap-3'} px-1 py-2`}>
      <Avatar className="h-10 w-10">
        {avatarImage ? (
          <AvatarImage src={avatarImage} alt={userName} />
        ) : (
          <AvatarFallback className="bg-azulPrincipal/20 text-azulPrincipal">
            <User className="h-5 w-5" />
          </AvatarFallback>
        )}
      </Avatar>
      {!isCollapsed && (
        <div className="flex flex-col overflow-hidden">
          <span className="truncate font-medium text-sm">{userName}</span>
          {userEmail && (
            <span className="truncate text-xs text-muted-foreground">{userEmail}</span>
          )}
        </div>
      )}
    </div>
  );
}
