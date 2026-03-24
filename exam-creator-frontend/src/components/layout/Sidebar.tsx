import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  BarChart3, 
  ClipboardCheck,
  Table2,
  Settings, 
  BookOpen,
  GraduationCap,
  UserCog,
  Bell,
  Shield,
  LogOut,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';

const Sidebar = () => {
  const { isProfesseur, isAdmin, user, signOut } = useAuth();
  const { t } = useLanguage();

  const professorNavItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: t('Tableau de Bord') },
    { to: '/exams', icon: FileText, label: t('Epreuves') },
    { to: '/grades/subject', icon: ClipboardCheck, label: t('Notes par matiere') },
    { to: '/grades/all-subjects', icon: Table2, label: t('Notes toutes matieres') },
    { to: '/analytics', icon: BarChart3, label: t('Rapports') },
  ];

  const studentNavItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: t('Accueil') },
    { to: '/my-exams', icon: FileText, label: t('Mes Epreuves') },
    { to: '/my-results', icon: BarChart3, label: t('Mes Resultats') },
  ];

  const adminNavItems = [
    { to: '/admin/dashboard', icon: LayoutDashboard, label: t('Tableau de Bord') },
    { to: '/admin/users', icon: UserCog, label: t('Utilisateurs') },
    { to: '/admin/filieres', icon: BookOpen, label: t('Filieres') },
    { to: '/admin/subjects', icon: BookOpen, label: t('Matieres') },
    { to: '/admin/levels', icon: GraduationCap, label: t('Niveaux') },
    { to: '/admin/notifications', icon: Bell, label: t('Notifications') },
    { to: '/admin/audit-logs', icon: Shield, label: t('Journal d\'audit') },
  ];

  const commonNavItems = [
    { to: '/settings', icon: Settings, label: t('Parametres') },
  ];

  const navItems = isAdmin ? [] : isProfesseur ? professorNavItems : studentNavItems;

  const getInitials = () => {
    if (!user?.email) return 'U';
    return user.email.charAt(0).toUpperCase();
  };

  return (
    <aside className="hidden md:flex md:w-[260px] md:flex-col md:fixed md:inset-y-0 overflow-hidden sidebar-bg">
      <div className="flex flex-col h-full">
        {/* Logo */}
        <div className="flex items-center justify-center h-20 flex-shrink-0 border-b sidebar-border py-2">
          <img
            src="/logo-(1).png"
            alt="EvalPro"
            className="h-14 w-auto object-contain"
          />
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-5 overflow-y-auto space-y-6">
          {navItems.length > 0 && (
          <div>
            <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              {t('Navigation')}
            </p>
            <div className="space-y-0.5">
              {navItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200',
                      isActive
                        ? 'text-white shadow-lg shadow-emerald-500/25 nav-active-bg'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06]'
                    )
                  }
                >
                  <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          </div>
          )}

          {isAdmin && (
            <div>
              <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
                {t('Administration')}
              </p>
              <div className="space-y-0.5">
                {adminNavItems.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200',
                        isActive
                          ? 'text-white shadow-lg shadow-emerald-500/25 nav-active-bg'
                          : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06]'
                      )
                    }
                  >
                    <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                    <span>{label}</span>
                  </NavLink>
                ))}
              </div>
            </div>
          )}

          <div>
            <p className="px-3 mb-2 text-[11px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
              {t('Compte')}
            </p>
            <div className="space-y-0.5">
              {commonNavItems.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200',
                      isActive
                        ? 'text-white shadow-lg shadow-emerald-500/25 nav-active-bg'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/[0.06]'
                    )
                  }
                >
                  <Icon className="w-[18px] h-[18px] flex-shrink-0" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </nav>

        {/* User footer */}
        <div className="flex-shrink-0 px-3 pb-4 pt-3 border-t sidebar-border">
          <div className="flex items-center gap-3 px-2 py-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 text-white avatar-bg">
              {getInitials()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{user?.email}</p>
            </div>
            <button
              onClick={signOut}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex-shrink-0"
              title={t('Deconnexion')}
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
