import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, GraduationCap } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import AppLayout from '@/components/layout/AppLayout';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { supabase } from '@/lib/backendClient';
import { toast } from 'sonner';

interface Level {
  id: string;
  name: string;
  description: string | null;
}

const AdminLevels = () => {
  const { t } = useLanguage();
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingLevel, setEditingLevel] = useState<Level | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    fetchLevels();
  }, []);

  const fetchLevels = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('levels')
      .select('*')
      .order('name');
    
    if (data) setLevels(data);
    setLoading(false);
  };

  const saveLevel = async () => {
    if (!formData.name.trim()) {
      toast.error(t('Veuillez entrer un nom'));
      return;
    }

    if (editingLevel) {
      const { error } = await supabase
        .from('levels')
        .update({
          name: formData.name,
          description: formData.description || null,
        })
        .eq('id', editingLevel.id);

      if (error) {
        toast.error(t('Erreur lors de la modification'));
      } else {
        toast.success(t('Niveau modifié'));
      }
    } else {
      const { error } = await supabase.from('levels').insert({
        name: formData.name,
        description: formData.description || null,
      });

      if (error) {
        toast.error(t('Erreur lors de la création'));
      } else {
        toast.success(t('Niveau créé'));
      }
    }

    setShowDialog(false);
    setEditingLevel(null);
    setFormData({ name: '', description: '' });
    fetchLevels();
  };

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const deleteLevel = async (id: string) => {
    const { error } = await supabase.from('levels').delete().eq('id', id);
    if (error) {
      toast.error(t('Erreur lors de la suppression'));
    } else {
      toast.success(t('Niveau supprimé'));
      fetchLevels();
    }
  };

  const openEditDialog = (level: Level) => {
    setEditingLevel(level);
    setFormData({
      name: level.name,
      description: level.description || '',
    });
    setShowDialog(true);
  };

  const openCreateDialog = () => {
    setEditingLevel(null);
    setFormData({ name: '', description: '' });
    setShowDialog(true);
  };

  return (
    <AppLayout title={t('Gestion des Niveaux')}>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">
            {levels.length} {t('niveau(x) configuré(s)')}
          </p>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button className="gradient-primary" onClick={openCreateDialog}>
                <Plus className="w-4 h-4 mr-2" />
                {t('Ajouter')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingLevel ? t('Modifier le niveau') : t('Nouveau niveau')}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>{t('Nom')}</Label>
                  <Input
                    placeholder={t('Ex: IUT Niv. 1')}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('Description')}</Label>
                  <Input
                    placeholder={t('Description du niveau')}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <Button onClick={saveLevel} className="w-full gradient-primary">
                  {editingLevel ? t('Modifier') : t('Créer')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Levels List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              {t('Chargement...')}
            </div>
          ) : levels.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              {t('Aucun niveau configuré')}
            </div>
          ) : (
            levels.map((level) => (
              <Card key={level.id} className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
                      <GraduationCap className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground">{level.name}</h3>
                      {level.description && (
                        <p className="text-sm text-muted-foreground truncate">
                          {level.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => openEditDialog(level)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      {t('Modifier')}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(level.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
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
        onConfirm={() => { if (deleteId) { deleteLevel(deleteId); setDeleteId(null); } }}
        description="Êtes-vous sûr de vouloir supprimer ce niveau ?"
      />
    </AppLayout>
  );
};

export default AdminLevels;
