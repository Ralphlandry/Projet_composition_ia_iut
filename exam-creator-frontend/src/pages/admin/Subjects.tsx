import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, BookOpen } from 'lucide-react';
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

interface Subject {
  id: string;
  name: string;
  description: string | null;
  color: string;
}

const AdminSubjects = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#3B82F6',
  });

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    setLoading(true);
    const { data } = await supabase
      .from('subjects')
      .select('*')
      .order('name');
    
    if (data) setSubjects(data);
    setLoading(false);
  };

  const saveSubject = async () => {
    if (!formData.name.trim()) {
      toast.error('Veuillez entrer un nom');
      return;
    }

    if (editingSubject) {
      const { error } = await supabase
        .from('subjects')
        .update({
          name: formData.name,
          description: formData.description || null,
          color: formData.color,
        })
        .eq('id', editingSubject.id);

      if (error) {
        toast.error('Erreur lors de la modification');
      } else {
        toast.success('Matière modifiée');
      }
    } else {
      const { error } = await supabase.from('subjects').insert({
        name: formData.name,
        description: formData.description || null,
        color: formData.color,
      });

      if (error) {
        toast.error('Erreur lors de la création');
      } else {
        toast.success('Matière créée');
      }
    }

    setShowDialog(false);
    setEditingSubject(null);
    setFormData({ name: '', description: '', color: '#3B82F6' });
    fetchSubjects();
  };

  const deleteSubject = async (id: string) => {
    const { error } = await supabase.from('subjects').delete().eq('id', id);
    if (error) {
      toast.error('Erreur lors de la suppression');
    } else {
      toast.success('Matière supprimée');
      fetchSubjects();
    }
  };

  const openEditDialog = (subject: Subject) => {
    setEditingSubject(subject);
    setFormData({
      name: subject.name,
      description: subject.description || '',
      color: subject.color,
    });
    setShowDialog(true);
  };

  const openCreateDialog = () => {
    setEditingSubject(null);
    setFormData({ name: '', description: '', color: '#3B82F6' });
    setShowDialog(true);
  };

  return (
    <AppLayout title="Gestion des Matières">
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">
            {subjects.length} matière{subjects.length > 1 ? 's' : ''} configurée{subjects.length > 1 ? 's' : ''}
          </p>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button className="gradient-primary" onClick={openCreateDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Créer une matière
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingSubject ? 'Modifier la matière' : 'Nouvelle matière'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Nom</Label>
                  <Input
                    placeholder="Ex: Informatique"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    placeholder="Description de la matière"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Couleur</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-16 h-10 p-1"
                    />
                    <Input
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      placeholder="#3B82F6"
                    />
                  </div>
                </div>
                <Button onClick={saveSubject} className="w-full gradient-primary">
                  {editingSubject ? 'Modifier la matière' : 'Créer la matière'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Subjects List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              Chargement...
            </div>
          ) : subjects.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              Aucune matière configurée
            </div>
          ) : (
            subjects.map((subject) => (
              <Card key={subject.id} className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div 
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${subject.color}20` }}
                    >
                      <BookOpen className="w-6 h-6" style={{ color: subject.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground">{subject.name}</h3>
                      {subject.description && (
                        <p className="text-sm text-muted-foreground truncate">
                          {subject.description}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => openEditDialog(subject)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Modifier
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteSubject(subject.id)}
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

export default AdminSubjects;
