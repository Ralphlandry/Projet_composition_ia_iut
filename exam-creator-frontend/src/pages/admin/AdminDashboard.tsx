import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  FileText,
  BookOpen,
  GraduationCap,
  Layers,
  ChevronRight,
  UserCog,
  Bell,
  TrendingUp,
  Activity,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/backendClient';

interface UsersByRole {
  total: number;
  admins: number;
  professeurs: number;
  etudiants: number;
}

interface ExamsByStatus {
  total: number;
  brouillon: number;
  publie: number;
  planifie: number;
}

interface RecentUser {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
  created_at: string;
}

const AdminDashboard = () => {
  const { user } = useAuth();
  const [userStats, setUserStats] = useState<UsersByRole>({ total: 0, admins: 0, professeurs: 0, etudiants: 0 });
  const [examStats, setExamStats] = useState<ExamsByStatus>({ total: 0, brouillon: 0, publie: 0, planifie: 0 });
  const [subjectsCount, setSubjectsCount] = useState(0);
  const [specialtiesCount, setSpecialtiesCount] = useState(0);
  const [levelsCount, setLevelsCount] = useState(0);
  const [submissionsCount, setSubmissionsCount] = useState(0);
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        const [
          { data: profiles },
          { data: exams },
          { data: subjects },
          { data: specialties },
          { data: levels },
          { data: submissions },
          { data: recent },
        ] = await Promise.all([
          supabase.from('profiles').select('role'),
          supabase.from('exams').select('status'),
          supabase.from('subjects').select('id'),
          supabase.from('specialties').select('id'),
          supabase.from('levels').select('id'),
          supabase.from('submissions').select('id'),
          supabase.from('profiles').select('id, full_name, email, role, created_at').order('created_at', { ascending: false }).limit(5),
        ]);

        if (profiles) {
          const arr = profiles as Array<{ role: string }>;
          setUserStats({
            total: arr.length,
            admins: arr.filter(p => p.role === 'admin').length,
            professeurs: arr.filter(p => p.role === 'professeur').length,
            etudiants: arr.filter(p => p.role === 'etudiant').length,
          });
        }

        if (exams) {
          const arr = exams as Array<{ status: string }>;
          setExamStats({
            total: arr.length,
            brouillon: arr.filter(e => e.status === 'brouillon').length,
            publie: arr.filter(e => e.status === 'publie').length,
            planifie: arr.filter(e => e.status === 'planifie').length,
          });
        }

        setSubjectsCount(subjects?.length || 0);
        setSpecialtiesCount(specialties?.length || 0);
        setLevelsCount(levels?.length || 0);
        setSubmissionsCount(submissions?.length || 0);

        if (recent) {
          setRecentUsers(recent as unknown as RecentUser[]);
        }
      } catch (error) {
        console.error('Error fetching admin dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border-0 text-[10px]">Admin</Badge>;
      case 'professeur':
        return <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-0 text-[10px]">Professeur</Badge>;
      case 'etudiant':
        return <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-0 text-[10px]">Etudiant</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px]">{role}</Badge>;
    }
  };

  const statCards = [
    {
      label: 'Utilisateurs',
      value: userStats.total,
      detail: `${userStats.professeurs} prof. / ${userStats.etudiants} etud.`,
      icon: Users,
      gradient: 'linear-gradient(135deg, #3b82f6, #60a5fa)',
      link: '/admin/users',
    },
    {
      label: 'Epreuves',
      value: examStats.total,
      detail: `${examStats.publie} publiee${examStats.publie > 1 ? 's' : ''} / ${examStats.brouillon} brouillon${examStats.brouillon > 1 ? 's' : ''}`,
      icon: FileText,
      gradient: 'linear-gradient(135deg, #8b5cf6, #a78bfa)',
    },
    {
      label: 'Soumissions',
      value: submissionsCount,
      detail: 'Copies rendues',
      icon: TrendingUp,
      gradient: 'linear-gradient(135deg, #f97316, #fb923c)',
    },
    {
      label: 'Matieres',
      value: subjectsCount,
      detail: `${specialtiesCount} filiere${specialtiesCount > 1 ? 's' : ''} / ${levelsCount} niveau${levelsCount > 1 ? 'x' : ''}`,
      icon: BookOpen,
      gradient: 'linear-gradient(135deg, #10b981, #34d399)',
      link: '/admin/subjects',
    },
  ];

  const quickActions = [
    { label: 'Gerer les utilisateurs', icon: UserCog, to: '/admin/users', color: 'text-blue-500' },
    { label: 'Gerer les filieres', icon: Layers, to: '/admin/filieres', color: 'text-purple-500' },
    { label: 'Gerer les matieres', icon: BookOpen, to: '/admin/subjects', color: 'text-emerald-500' },
    { label: 'Gerer les niveaux', icon: GraduationCap, to: '/admin/levels', color: 'text-orange-500' },
    { label: 'Envoyer une notification', icon: Bell, to: '/admin/notifications', color: 'text-pink-500' },
  ];

  return (
    <AppLayout title="Administration">
      <div className="space-y-6 animate-fade-in">

        {/* Welcome */}
        <div className="bg-card rounded-xl p-6 shadow-card border border-border">
          <h2 className="text-xl font-bold text-foreground">
            Panneau d'Administration
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Vue d'ensemble de la plateforme EvalPro.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((card) => {
            const Icon = card.icon;
            const content = (
              <div
                key={card.label}
                className="rounded-xl p-5 shadow-card text-white"
                style={{ background: card.gradient }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-white/80 font-medium">{card.label}</p>
                    <p className="text-3xl font-bold mt-1">{card.value}</p>
                  </div>
                  <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                </div>
                <p className="text-xs text-white/70 mt-3">{card.detail}</p>
              </div>
            );

            return card.link ? (
              <Link key={card.label} to={card.link} className="block hover:scale-[1.02] transition-transform">
                {content}
              </Link>
            ) : (
              <div key={card.label}>{content}</div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Derniers inscrits */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <h3 className="text-sm font-semibold text-foreground">Derniers inscrits</h3>
              <Badge variant="secondary" className="text-[10px] h-5 font-semibold">{recentUsers.length}</Badge>
            </div>
            <div className="space-y-2">
              {recentUsers.length === 0 && !loading && (
                <p className="text-sm text-muted-foreground">Aucun utilisateur.</p>
              )}
              {recentUsers.map((u) => (
                <Card key={u.id} className="border shadow-card hover:shadow-card-hover transition-shadow">
                  <CardContent className="p-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <Activity className="w-4 h-4 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {u.full_name || u.email}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </div>
                    </div>
                    {getRoleBadge(u.role)}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Actions rapides */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Actions rapides</h3>
            <div className="space-y-2">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link key={action.to} to={action.to}>
                    <Card className="border shadow-card hover:shadow-card-hover transition-all group cursor-pointer">
                      <CardContent className="p-4 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl bg-muted flex items-center justify-center ${action.color}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">
                            {action.label}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </AppLayout>
  );
};

export default AdminDashboard;
