import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FileText, BarChart3, Settings, ClipboardCheck, Table2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';

const BottomNav = () => {
  const { isProfesseur } = useAuth();
  const { t } = useLanguage();

  const navItems = isProfesseur ? [
    { to: '/dashboard', icon: LayoutDashboard, label: t('Tableau de Bord') },
    { to: '/exams', icon: FileText, label: t('Epreuves') },
    { to: '/grades/subject', icon: ClipboardCheck, label: t('Notes') },
    { to: '/grades/all-subjects', icon: Table2, label: t('Global') },
  ] : [
    { to: '/dashboard', icon: LayoutDashboard, label: t('Accueil') },
    { to: '/my-exams', icon: FileText, label: t('Epreuves') },
    { to: '/my-results', icon: BarChart3, label: t('Résultats') },
    { to: '/profile', icon: Settings, label: t('Profil') },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border md:hidden">
      <div className="flex items-center justify-around py-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors",
                isActive 
                  ? "text-primary" 
                  : "text-muted-foreground hover:text-foreground"
              )
            }
          >
            <Icon className="w-5 h-5" />
            <span className="text-xs font-medium">{label}</span>
          </NavLink>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;
