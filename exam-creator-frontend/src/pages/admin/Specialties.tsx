import { useEffect, useState } from 'react';
import { Plus, Edit, Trash2, Network } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import AppLayout from '@/components/layout/AppLayout';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
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
}

interface Specialty {
  id: string;
  name: string;
  description: string | null;
  color: string;
  allowed_subject_ids: string[] | null;
}

const AdminSpecialties = () => {
  const { t } = useLanguage();
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<Specialty | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    color: '#8B5CF6',
    allowed_subject_ids: [] as string[],
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [specialtiesRes, subjectsRes] = await Promise.all([
      supabase.from('specialties').select('*').order('name'),
      supabase.from('subjects').select('id, name').order('name'),
    ]);

    if (specialtiesRes.data) setSpecialties(specialtiesRes.data as Specialty[]);
    if (subjectsRes.data) setSubjects(subjectsRes.data as Subject[]);
    setLoading(false);
  };

  const toggleSubject = (subjectId: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      allowed_subject_ids: checked
        ? [...prev.allowed_subject_ids, subjectId]
        : prev.allowed_subject_ids.filter((id) => id !== subjectId),
    }));
  };

  const save = async () => {
    if (!formData.name.trim()) {
      toast.error(t('Nom de filière requis'));
      return;
    }
    if (formData.allowed_subject_ids.length === 0) {
      toast.error(t('Sélectionne au moins une matière autorisée'));
      return;
    }

    if (editing) {
      const { error } = await supabase
        .from('specialties')
        .update({
          name: formData.name,
          description: formData.description || null,
          color: formData.color,
          allowed_subject_ids: formData.allowed_subject_ids,
        })
        .eq('id', editing.id);

      if (error) toast.error(error.message || t('Erreur modification filière'));
      else toast.success(t('Filière modifiée'));
    } else {
      const { error } = await supabase
        .from('specialties')
        .insert({
          name: formData.name,
          description: formData.description || null,
          color: formData.color,
          allowed_subject_ids: formData.allowed_subject_ids,
        });

      if (error) toast.error(error.message || t('Erreur création filière'));
      else toast.success(t('Filière créée'));
    }

    setShowDialog(false);
    setEditing(null);
    setFormData({ name: '', description: '', color: '#8B5CF6', allowed_subject_ids: [] });
    fetchData();
  };

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const remove = async (id: string) => {
    const { error } = await supabase.from('specialties').delete().eq('id', id);
    if (error) toast.error(error.message || t('Erreur suppression filière'));
    else {
      toast.success(t('Filière supprimée'));
      fetchData();
    }
  };

  const openCreate = () => {
    setEditing(null);
    setFormData({ name: '', description: '', color: '#8B5CF6', allowed_subject_ids: [] });
    setShowDialog(true);
  };

  const openEdit = (specialty: Specialty) => {
    setEditing(specialty);
    setFormData({
      name: specialty.name,
      description: specialty.description || '',
      color: specialty.color || '#8B5CF6',
      allowed_subject_ids: specialty.allowed_subject_ids || [],
    });
    setShowDialog(true);
  };

  return (
    <AppLayout title={t('Gestion des Filières')}>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">
            {specialties.length} {t('filière(s) configurée(s)')}
          </p>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button className="gradient-primary" onClick={openCreate}>
                <Plus className="w-4 h-4 mr-2" />
                {t('Créer une filière')}
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? t('Modifier la filière') : t('Nouvelle filière')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-2">
                <div className="space-y-2">
                  <Label>{t('Nom')}</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={t('Ex: Génie Logiciel')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('Description')}</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={t('Description')}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('Couleur')}</Label>
                  <Input
                    type="color"
                    value={formData.color}
                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                    className="w-16 h-10 p-1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('Matières autorisées pour cette filière')}</Label>
                  <div className="space-y-2 max-h-40 overflow-auto border rounded-md p-3">
                    {subjects.map((subject) => {
                      const checked = formData.allowed_subject_ids.includes(subject.id);
                      return (
                        <label key={subject.id} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(val) => toggleSubject(subject.id, Boolean(val))}
                          />
                          <span>{subject.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
                <Button className="w-full gradient-primary" onClick={save}>
                  {editing ? t('Modifier la filière') : t('Créer la filière')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">{t('Chargement...')}</div>
          ) : specialties.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">{t('Aucune filière configurée')}</div>
          ) : (
            specialties.map((specialty) => (
              <Card key={specialty.id} className="bg-card border-border">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${specialty.color}20` }}
                    >
                      <Network className="w-6 h-6" style={{ color: specialty.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-foreground">{specialty.name}</h3>
                      {specialty.description && (
                        <p className="text-sm text-muted-foreground truncate">{specialty.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {(specialty.allowed_subject_ids || []).length} {t('matière(s) autorisée(s)')}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openEdit(specialty)}>
                      <Edit className="w-4 h-4 mr-1" />
                      {t('Modifier')}
                    </Button>
                    <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" onClick={() => setDeleteId(specialty.id)}>
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
        onConfirm={() => { if (deleteId) { remove(deleteId); setDeleteId(null); } }}
        description="Êtes-vous sûr de vouloir supprimer cette filière ?"
      />
    </AppLayout>
  );
};

export default AdminSpecialties;
