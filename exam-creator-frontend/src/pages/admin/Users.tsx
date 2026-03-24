import { useEffect, useState } from 'react';
import { Search, KeyRound, UserX, UserCheck } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AdminUser, supabase } from '@/lib/backendClient';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from 'sonner';

interface SignUpOptions {
  levels: Array<{ id: string; name: string }>;
  specialties: Array<{ id: string; name: string }>;
}

const AdminUsers = () => {
  const { t } = useLanguage();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [options, setOptions] = useState<SignUpOptions>({ levels: [], specialties: [] });

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    role: 'etudiant' as 'admin' | 'professeur' | 'etudiant',
    student_number: '',
    level_id: '',
    specialty_id: '',
  });

  useEffect(() => {
    load();
  }, []);

  const load = async () => {
    setLoading(true);
    const [{ data: usersData, error: usersError }, { data: optData, error: optError }] = await Promise.all([
      supabase.auth.adminListUsers(),
      supabase.auth.getSignUpOptions(),
    ]);

    if (usersError || !usersData) {
      toast.error(usersError?.message || 'Erreur chargement utilisateurs');
    } else {
      setUsers(usersData.users || []);
    }

    if (optError || !optData) {
      toast.error(optError?.message || 'Erreur chargement niveaux/spécialités');
    } else {
      setOptions({
        levels: optData.levels || [],
        specialties: optData.specialties || [],
      });
    }

    setLoading(false);
  };

  const createUser = async () => {
    if (form.role === 'etudiant' && (options.levels.length === 0 || options.specialties.length === 0)) {
      toast.error('Configure d\'abord les niveaux et filières avant de créer un étudiant');
      return;
    }

    if (!form.email || !form.password) {
      toast.error('Email et mot de passe obligatoires');
      return;
    }

    if (form.role === 'etudiant' && (!form.student_number || !form.level_id || !form.specialty_id)) {
      toast.error('Pour un étudiant: matricule, niveau et spécialité sont obligatoires');
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.adminCreateUser({
      email: form.email,
      password: form.password,
      full_name: form.full_name,
      role: form.role,
      student_number: form.role === 'etudiant' ? form.student_number : undefined,
      level_id: form.role === 'etudiant' ? form.level_id : undefined,
      specialty_id: form.role === 'etudiant' ? form.specialty_id : undefined,
    });
    setSaving(false);

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Utilisateur créé');
    setForm({
      full_name: '',
      email: '',
      password: '',
      role: 'etudiant',
      student_number: '',
      level_id: '',
      specialty_id: '',
    });
    await load();
  };

  const updateUserRole = async (user: AdminUser, newRole: 'admin' | 'professeur' | 'etudiant') => {
    let student_number = user.student_profile?.student_number;
    let level_id = user.student_profile?.level_id;
    let specialty_id = user.student_profile?.specialty_id;

    if (newRole === 'etudiant' && (!student_number || !level_id || !specialty_id)) {
      student_number = window.prompt('Matricule étudiant ?', '') || '';
      level_id = window.prompt('ID du niveau ?', '') || '';
      specialty_id = window.prompt('ID de la spécialité ?', '') || '';
    }

    const { error } = await supabase.auth.adminUpdateRole(user.id, {
      role: newRole,
      student_number: newRole === 'etudiant' ? student_number : undefined,
      level_id: newRole === 'etudiant' ? level_id : undefined,
      specialty_id: newRole === 'etudiant' ? specialty_id : undefined,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Rôle mis à jour');
      load();
    }
  };

  const resetPassword = async (user: AdminUser) => {
    const newPwd = window.prompt(`Nouveau mot de passe pour ${user.full_name || user.email} (min 8 caractères) :`);
    if (!newPwd || newPwd.length < 8) {
      if (newPwd !== null) toast.error('Mot de passe trop court (minimum 8 caractères)');
      return;
    }
    const { error } = await supabase.auth.adminResetPassword(user.id, newPwd);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Mot de passe de ${user.full_name || user.email} réinitialisé`);
    }
  };

  const toggleDisable = async (user: AdminUser) => {
    const isDisabled = user.full_name?.startsWith('[DÉSACTIVÉ]');
    const action = isDisabled ? 'réactiver' : 'désactiver';
    if (!window.confirm(`${action.charAt(0).toUpperCase() + action.slice(1)} ${user.full_name || user.email} ?`)) return;
    const { error } = await supabase.auth.adminDisableUser(user.id, !isDisabled);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(`Compte ${action}`);
      load();
    }
  };

  const filteredUsers = users.filter((user) =>
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
  );

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'admin':
        return <Badge className="bg-destructive/20 text-destructive border-0">{t('Admin')}</Badge>;
      case 'professeur':
        return <Badge className="bg-primary/20 text-primary border-0">{t('Professeur')}</Badge>;
      default:
        return <Badge className="bg-success/20 text-success border-0">{t('Étudiant')}</Badge>;
    }
  };

  return (
    <AppLayout title="Gestion des Utilisateurs">
      <div className="space-y-6 animate-fade-in">
        <Card>
          <CardHeader>
            <CardTitle>{t('Créer un utilisateur (admin)')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-3 md:grid-cols-2">
              <Input
                placeholder={t('Nom complet')}
                value={form.full_name}
                onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              />
              <Input
                placeholder={t('Email')}
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <Input
                placeholder={t('Mot de passe')}
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <Select
                value={form.role}
                onValueChange={(value: 'admin' | 'professeur' | 'etudiant') => setForm({ ...form, role: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="etudiant">{t('Étudiant')}</SelectItem>
                  <SelectItem value="professeur">{t('Professeur')}</SelectItem>
                  <SelectItem value="admin">{t('Admin')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {form.role === 'etudiant' && (
              <div className="grid gap-3 md:grid-cols-3">
                <Input
                  placeholder={t('Matricule')}
                  value={form.student_number}
                  onChange={(e) => setForm({ ...form, student_number: e.target.value })}
                />
                <Select value={form.level_id} onValueChange={(value) => setForm({ ...form, level_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('Niveau')} />
                  </SelectTrigger>
                  <SelectContent>
                    {options.levels.map((level) => (
                      <SelectItem key={level.id} value={level.id}>{level.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={form.specialty_id} onValueChange={(value) => setForm({ ...form, specialty_id: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder={t('Spécialité')} />
                  </SelectTrigger>
                  <SelectContent>
                    {options.specialties.map((specialty) => (
                      <SelectItem key={specialty.id} value={specialty.id}>{specialty.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button disabled={saving} onClick={createUser}>{t('Créer l\'utilisateur')}</Button>
          </CardContent>
        </Card>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t('Rechercher un utilisateur...')}
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">{t('Chargement...')}</div>
          ) : (
            filteredUsers.map((user) => (
              <Card key={user.id} className="bg-card border-border">
                <CardContent className="p-4 flex items-center gap-4">
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="bg-secondary">
                      {user.full_name?.charAt(0) || user.email.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{user.full_name || t('Sans nom')}</p>
                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                    {user.student_profile && (
                      <p className="text-xs text-muted-foreground truncate">{t('Matricule')}: {user.student_profile.student_number}</p>
                    )}
                  </div>
                  {getRoleBadge(user.role)}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Select
                      value={user.role}
                      onValueChange={(value: 'admin' | 'professeur' | 'etudiant') => updateUserRole(user, value)}
                    >
                      <SelectTrigger className="w-[130px]">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="etudiant">{t('Étudiant')}</SelectItem>
                        <SelectItem value="professeur">{t('Professeur')}</SelectItem>
                        <SelectItem value="admin">{t('Admin')}</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => resetPassword(user)}
                      title={t('Réinitialiser le mot de passe')}
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => toggleDisable(user)}
                      title={user.full_name?.startsWith('[DÉSACTIVÉ]') ? 'Réactiver le compte' : 'Désactiver le compte'}
                      className={user.full_name?.startsWith('[DÉSACTIVÉ]') ? 'text-green-600' : 'text-destructive'}
                    >
                      {user.full_name?.startsWith('[DÉSACTIVÉ]')
                        ? <UserCheck className="w-3.5 h-3.5" />
                        : <UserX className="w-3.5 h-3.5" />}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default AdminUsers;
