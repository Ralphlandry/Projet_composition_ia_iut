import { Bell } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Link } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/backendClient';
import { toast } from 'sonner';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  title: string;
}

const Header = ({ title }: HeaderProps) => {
  const { user, signOut, role } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const knownIdsRef = useRef<Set<string> | null>(null);

  const getToastFn = (type: string) => {
    if (type === 'success') return toast.success;
    if (type === 'warning') return toast.warning;
    if (type === 'error') return toast.error;
    return toast.info;
  };

  const showNotifToast = (n: { title: string; message: string; type: string }, duration: number) => {
    getToastFn(n.type)(n.title, {
      description: n.message,
      duration,
      action: {
        label: 'Voir',
        onClick: () => { globalThis.location.assign('/notifications'); },
      },
    });
  };

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      const { data } = await supabase
        .from('notifications')
        .select('id, title, message, type, is_read')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (!data) return;

      const unread = data.filter((n: { is_read: boolean }) => !n.is_read);
      setUnreadCount(unread.length);

      if (knownIdsRef.current === null) {
        knownIdsRef.current = new Set(data.map((n: { id: string }) => n.id));

        // Show unread notifications on login (max 3 most recent)
        const unreadToShow = unread.slice(0, 3);
        unreadToShow.forEach((n: { title: string; message: string; type: string }, i: number) => {
          setTimeout(() => showNotifToast(n, 6000), 1000 + i * 800);
        });
        if (unread.length > 3) {
          const remaining = unread.length - 3;
          setTimeout(() => {
            toast.info(`Et ${remaining} autre${remaining > 1 ? 's' : ''} notification${remaining > 1 ? 's' : ''} non lue${remaining > 1 ? 's' : ''}`, {
              duration: 5000,
              action: {
                label: 'Tout voir',
                onClick: () => { globalThis.location.assign('/notifications'); },
              },
            });
          }, 1000 + 3 * 800);
        }
        return;
      }

      const newOnes = data.filter((n: { id: string }) => !knownIdsRef.current.has(n.id));
      newOnes.forEach((n: { id: string; title: string; message: string; type: string }) => {
        knownIdsRef.current.add(n.id);
        showNotifToast(n, 8000);
      });
    };

    fetchNotifications();
    const interval = setInterval(fetchNotifications, 15000);
    return () => clearInterval(interval);
  }, [user]);

  const getInitials = () => {
    if (!user?.email) return 'U';
    return user.email.charAt(0).toUpperCase();
  };

  const getRoleBadge = () => {
    switch (role) {
      case 'admin': return 'Admin';
      case 'professeur': return 'Professeur';
      default: return 'Etudiant';
    }
  };

  return (
    <header className="sticky top-0 z-40 header-bg">
      <div className="flex items-center justify-end h-16 px-4 md:px-6">
        <div className="flex items-center gap-2">
          <Link to="/notifications">
            <button className="relative w-9 h-9 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors">
              <Bell className="w-[18px] h-[18px] text-slate-500 dark:text-slate-400" />
              {unreadCount > 0 && (
                <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 text-[10px] font-bold rounded-full flex items-center justify-center px-1 text-white" style={{ background: 'linear-gradient(135deg, #ef4444, #f97316)' }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.06] transition-colors">
                <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white avatar-bg">
                  {getInitials()}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-tight">{getRoleBadge()}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2">
                <p className="text-sm font-medium text-foreground">{user?.email}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{getRoleBadge()}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link to="/profile" className="cursor-pointer">Mon profil</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link to="/settings" className="cursor-pointer">Parametres</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive cursor-pointer">
                Deconnexion
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;
