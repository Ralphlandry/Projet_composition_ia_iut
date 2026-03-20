import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, GraduationCap } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
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
      toast.error('Veuillez entrer un nom');
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
        toast.error('Erreur lors de la modification');
      } else {
        toast.success('Niveau modifié');
      }
    } else {
      const { error } = await supabase.from('levels').insert({
        name: formData.name,
        description: formData.description || null,
      });

      if (error) {
        toast.error('Erreur lors de la création');
      } else {
        toast.success('Niveau créé');
      }
    }

    setShowDialog(false);
    setEditingLevel(null);
    setFormData({ name: '', description: '' });
    fetchLevels();
  };

  const deleteLevel = async (id: string) => {
    const { error } = await supabase.from('levels').delete().eq('id', id);
    if (error) {
      toast.error('Erreur lors de la suppression');
    } else {
      toast.success('Niveau supprimé');
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
    <AppLayout title="Gestion des Niveaux">
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">
            {levels.length} niveau{levels.length > 1 ? 'x' : ''} configuré{levels.length > 1 ? 's' : ''}
          </p>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button className="gradient-primary" onClick={openCreateDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Ajouter
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingLevel ? 'Modifier le niveau' : 'Nouveau niveau'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input
                    placeholder="Ex: IUT Niv. 1"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    placeholder="Description du niveau"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <Button onClick={saveLevel} className="w-full gradient-primary">
                  {editingLevel ? 'Modifier' : 'Créer'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Levels List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              Chargement...
            </div>
          ) : levels.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              Aucun niveau configuré
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
                      Modifier
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteLevel(level.id)}
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
    </AppLayout>
  );
};

export default AdminLevels;
