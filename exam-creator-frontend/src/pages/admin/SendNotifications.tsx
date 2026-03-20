import { useState, useEffect } from 'react';
import { Send, Users, Bell, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/lib/backendClient';
import { toast } from 'sonner';

interface User {
  id: string;
  full_name: string | null;
  email: string;
  role: string;
}

const SendNotifications = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectAll, setSelectAll] = useState(false);
  const [notification, setNotification] = useState({
    title: '',
    message: '',
    type: 'info',
  });
  const [filter, setFilter] = useState<'all' | 'admin' | 'professeur' | 'etudiant'>('all');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, email');

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      const usersWithRoles = (profiles || []).map(profile => ({
        ...profile,
        role: roles?.find(r => r.user_id === profile.id)?.role || 'etudiant',
      }));

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Erreur lors du chargement des utilisateurs');
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user => 
    filter === 'all' || user.role === filter
  );

  const handleSelectAll = (checked: boolean) => {
    setSelectAll(checked);
    if (checked) {
      setSelectedUsers(filteredUsers.map(u => u.id));
    } else {
      setSelectedUsers([]);
    }
  };

  const handleSelectUser = (userId: string, checked: boolean) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, userId]);
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId));
      setSelectAll(false);
    }
  };

  const handleSendNotifications = async () => {
    if (!notification.title.trim()) {
      toast.error('Le titre est requis');
      return;
    }
    if (selectedUsers.length === 0) {
      toast.error('Sélectionnez au moins un utilisateur');
      return;
    }

    setSending(true);
    try {
      const notificationsToInsert = selectedUsers.map(userId => ({
        user_id: userId,
        title: notification.title,
        message: notification.message,
        type: notification.type,
        is_read: false,
      }));

      const { error } = await supabase
        .from('notifications')
        .insert(notificationsToInsert);

      if (error) throw error;

      toast.success(`Notification envoyée à ${selectedUsers.length} utilisateur(s)`);
      setNotification({ title: '', message: '', type: 'info' });
      setSelectedUsers([]);
      setSelectAll(false);
    } catch (error) {
      console.error('Error sending notifications:', error);
      toast.error('Erreur lors de l\'envoi');
    } finally {
      setSending(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success': return CheckCircle;
      case 'warning': return AlertTriangle;
      default: return Info;
    }
  };

  if (loading) {
    return (
      <AppLayout title="Envoyer des Notifications">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Envoyer des Notifications">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in pb-20 md:pb-0">
        {/* Compose Notification */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              Composer la notification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Titre *</Label>
              <Input
                placeholder="Titre de la notification"
                value={notification.title}
                onChange={(e) => setNotification({ ...notification, title: e.target.value })}
                className="bg-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Message</Label>
              <Textarea
                placeholder="Contenu de la notification..."
                value={notification.message}
                onChange={(e) => setNotification({ ...notification, message: e.target.value })}
                rows={4}
                className="bg-input"
              />
            </div>
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                value={notification.type}
                onValueChange={(value) => setNotification({ ...notification, type: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">
                    <div className="flex items-center gap-2">
                      <Info className="w-4 h-4 text-primary" />
                      Information
                    </div>
                  </SelectItem>
                  <SelectItem value="success">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-success" />
                      Succès
                    </div>
                  </SelectItem>
                  <SelectItem value="warning">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-warning" />
                      Avertissement
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button 
              onClick={handleSendNotifications} 
              disabled={sending || selectedUsers.length === 0}
              className="w-full gradient-primary"
            >
              <Send className="w-4 h-4 mr-2" />
              {sending ? 'Envoi...' : `Envoyer à ${selectedUsers.length} utilisateur(s)`}
            </Button>
          </CardContent>
        </Card>

        {/* Users Selection */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Sélectionner les destinataires
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filter */}
            <div className="flex items-center gap-2">
              <Label>Filtrer par rôle:</Label>
              <Select value={filter} onValueChange={(v) => setFilter(v as any)}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tous</SelectItem>
                  <SelectItem value="admin">Admins</SelectItem>
                  <SelectItem value="professeur">Professeurs</SelectItem>
                  <SelectItem value="etudiant">Étudiants</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Select All */}
            <div className="flex items-center space-x-2 pb-2 border-b border-border">
              <Checkbox
                id="select-all"
                checked={selectAll}
                onCheckedChange={handleSelectAll}
              />
              <Label htmlFor="select-all" className="font-medium cursor-pointer">
                Sélectionner tous ({filteredUsers.length})
              </Label>
            </div>

            {/* Users List */}
            <div className="max-h-80 overflow-y-auto space-y-2">
              {filteredUsers.map((user) => (
                <div 
                  key={user.id} 
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-muted/50"
                >
                  <Checkbox
                    id={user.id}
                    checked={selectedUsers.includes(user.id)}
                    onCheckedChange={(checked) => handleSelectUser(user.id, checked as boolean)}
                  />
                  <Label htmlFor={user.id} className="flex-1 cursor-pointer">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium text-foreground">
                          {user.full_name || 'Sans nom'}
                        </p>
                        <p className="text-sm text-muted-foreground">{user.email}</p>
                      </div>
                      <span className={`text-xs px-2 py-0.5 rounded ${
                        user.role === 'admin' 
                          ? 'bg-destructive/20 text-destructive' 
                          : user.role === 'professeur'
                          ? 'bg-primary/20 text-primary'
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {user.role}
                      </span>
                    </div>
                  </Label>
                </div>
              ))}
              {filteredUsers.length === 0 && (
                <p className="text-center text-muted-foreground py-4">
                  Aucun utilisateur trouvé
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default SendNotifications;
