import { useEffect, useState } from 'react';
import { Camera, Save, Loader2 } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/backendClient';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
}

const Profile = () => {
  const { t } = useLanguage();
  const { user, role, signOut } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    full_name: '',
  });

  useEffect(() => {
    if (user) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user?.id)
      .single();

    if (data) {
      setProfile(data);
      setFormData({
        full_name: data.full_name || '',
      });
    }
    setLoading(false);
  };

  const updateProfile = async () => {
    if (!user) return;
    
    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: formData.full_name,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (error) {
      toast.error(t('Erreur lors de la mise à jour'));
    } else {
      toast.success(t('Profil mis à jour'));
      fetchProfile();
    }
    setSaving(false);
  };

  const getRoleBadgeColor = () => {
    switch (role) {
      case 'admin': return 'bg-destructive/20 text-destructive';
      case 'professeur': return 'bg-primary/20 text-primary';
      default: return 'bg-success/20 text-success';
    }
  };

  const getRoleLabel = () => {
    switch (role) {
      case 'admin': return t('Administrateur');
      case 'professeur': return t('Professeur');
      default: return t('Étudiant');
    }
  };

  const getInitials = () => {
    if (profile?.full_name) {
      return profile.full_name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return profile?.email?.charAt(0).toUpperCase() || 'U';
  };

  if (loading) {
    return (
      <AppLayout title={t("Mon Profil")}>
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={t("Mon Profil")}>
      <div className="space-y-6 animate-fade-in max-w-2xl mx-auto">
        {/* Profile Header */}
        <Card className="bg-card border-border">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row items-center gap-6">
              <div className="relative">
                <Avatar className="w-24 h-24">
                  <AvatarImage src={profile?.avatar_url || ''} />
                  <AvatarFallback className="bg-primary text-primary-foreground text-2xl">
                    {getInitials()}
                  </AvatarFallback>
                </Avatar>
                <Button 
                  size="icon" 
                  variant="secondary"
                  className="absolute bottom-0 right-0 rounded-full w-8 h-8"
                >
                  <Camera className="w-4 h-4" />
                </Button>
              </div>
              <div className="text-center sm:text-left">
                <h2 className="text-xl font-bold text-foreground">
                  {profile?.full_name || t('Utilisateur')}
                </h2>
                <p className="text-muted-foreground">{profile?.email}</p>
                <Badge className={`mt-2 ${getRoleBadgeColor()}`}>
                  {getRoleLabel()}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Edit Profile */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">{t('Informations personnelles')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('Email')}</Label>
              <Input
                id="email"
                value={profile?.email || ''}
                disabled
                className="bg-secondary"
              />
              <p className="text-xs text-muted-foreground">
                {t("L'email ne peut pas être modifié")}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="full_name">{t('Nom complet')}</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder={t("Votre nom complet")}
              />
            </div>

            <Button 
              onClick={updateProfile} 
              disabled={saving}
              className="gradient-primary"
            >
              {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              <Save className="w-4 h-4 mr-2" />
              {t('Enregistrer')}
            </Button>
          </CardContent>
        </Card>

        {/* Account Actions */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base">{t('Compte')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-foreground">{t('Déconnexion')}</p>
                <p className="text-sm text-muted-foreground">
                  {t("Se déconnecter de l'application")}
                </p>
              </div>
              <Button variant="outline" onClick={signOut}>
                {t('Se déconnecter')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Profile;
