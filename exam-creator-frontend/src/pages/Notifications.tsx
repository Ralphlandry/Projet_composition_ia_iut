import { useEffect, useState } from 'react';
import { Bell, Check, Trash2 } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { supabase } from '@/lib/backendClient';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

const Notifications = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchNotifications();
    }
  }, [user]);

  const fetchNotifications = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });

    if (data) {
      setNotifications(data);
    }
    setLoading(false);
  };

  const markAsRead = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (!error) {
      setNotifications(notifications.map(n => 
        n.id === id ? { ...n, is_read: true } : n
      ));
    }
  };

  const markAllAsRead = async () => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user?.id)
      .eq('is_read', false);

    if (!error) {
      setNotifications(notifications.map(n => ({ ...n, is_read: true })));
      toast.success(t('Toutes les notifications marquées comme lues'));
    }
  };

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const deleteNotification = async (id: string) => {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id);

    if (!error) {
      setNotifications(notifications.filter(n => n.id !== id));
      toast.success(t('Notification supprimée'));
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'success':
        return 'bg-success/20 text-success';
      case 'warning':
        return 'bg-warning/20 text-warning';
      case 'error':
        return 'bg-destructive/20 text-destructive';
      default:
        return 'bg-primary/20 text-primary';
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <AppLayout title={t('Notifications')}>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">
            {unreadCount > 0 
              ? `${unreadCount} ${unreadCount > 1 ? t('notifications non lues') : t('notification non lue')}`
              : t('Aucune notification non lue')}
          </p>
          {unreadCount > 0 && (
            <Button variant="outline" size="sm" onClick={markAllAsRead}>
              <Check className="w-4 h-4 mr-2" />
              {t('Tout marquer comme lu')}
            </Button>
          )}
        </div>

        {/* Notifications List */}
        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">{t('Chargement...')}</div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{t('Aucune notification')}</p>
            </div>
          ) : (
            notifications.map((notification) => (
              <Card 
                key={notification.id} 
                className={`bg-card border-border transition-colors ${!notification.is_read ? 'border-l-4 border-l-primary' : ''}`}
              >
                <CardContent className="p-4 flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${getTypeIcon(notification.type)}`}>
                    <Bell className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-medium text-foreground">{notification.title}</h4>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(notification.created_at), { 
                          addSuffix: true, 
                          locale: fr 
                        })}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {!notification.is_read && (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => markAsRead(notification.id)}
                        >
                          <Check className="w-4 h-4 mr-1" />
                          {t('Marquer comme lu')}
                        </Button>
                      )}
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setDeleteId(notification.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        {t('Supprimer')}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      <ConfirmDeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        onConfirm={() => { if (deleteId) { deleteNotification(deleteId); setDeleteId(null); } }}
        description={t('Êtes-vous sûr de vouloir supprimer cette notification ?')}
      />
    </AppLayout>
  );
};

export default Notifications;
