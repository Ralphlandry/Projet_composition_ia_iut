import { useEffect, useState } from 'react';
import { Plus, Users, ChevronRight, MoreVertical, Edit, Trash2, UserPlus } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { supabase } from '@/lib/backendClient';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from 'sonner';

interface Level {
  id: string;
  name: string;
}

interface Class {
  id: string;
  name: string;
  level: Level | null;
  student_count?: number;
}

const Classes = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [classes, setClasses] = useState<Class[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [newClass, setNewClass] = useState({ name: '', level_id: '' });

  useEffect(() => {
    fetchClasses();
    fetchLevels();
  }, []);

  const fetchLevels = async () => {
    const { data } = await supabase.from('levels').select('*');
    if (data) setLevels(data);
  };

  const fetchClasses = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('classes')
      .select(`
        id,
        name,
        level:levels(id, name)
      `)
      .order('created_at', { ascending: false });

    if (data) {
      // Get student counts
      const classesWithCounts = await Promise.all(
        data.map(async (c) => {
          const { count } = await supabase
            .from('class_students')
            .select('*', { count: 'exact', head: true })
            .eq('class_id', c.id);
          return { ...c, student_count: count || 0 };
        })
      );
      setClasses(classesWithCounts as unknown as Class[]);
    }
    setLoading(false);
  };

  const createClass = async () => {
    if (!newClass.name.trim()) {
      toast.error(t('Veuillez entrer un nom'));
      return;
    }

    const { error } = await supabase.from('classes').insert({
      name: newClass.name,
      level_id: newClass.level_id || null,
      created_by: user?.id,
    });

    if (error) {
      toast.error(t('Erreur lors de la création'));
    } else {
      toast.success(t('Classe créée'));
      setShowDialog(false);
      setNewClass({ name: '', level_id: '' });
      fetchClasses();
    }
  };

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const deleteClass = async (id: string) => {
    const { error } = await supabase.from('classes').delete().eq('id', id);
    if (error) {
      toast.error(t('Erreur lors de la suppression'));
    } else {
      toast.success(t('Classe supprimée'));
      fetchClasses();
    }
  };

  return (
    <AppLayout title={t('Classes')}>
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <p className="text-muted-foreground">{t('Gérez vos classes et étudiants')}</p>
          <Dialog open={showDialog} onOpenChange={setShowDialog}>
            <DialogTrigger asChild>
              <Button className="gradient-primary">
                <Plus className="w-4 h-4 mr-2" />
                {t('Nouvelle classe')}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{t('Créer une classe')}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>{t('Nom de la classe')}</Label>
                  <Input
                    placeholder={t('Ex: BUT GEA - Groupe A')}
                    value={newClass.name}
                    onChange={(e) => setNewClass({ ...newClass, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t('Niveau')}</Label>
                  <Select
                    value={newClass.level_id}
                    onValueChange={(value) => setNewClass({ ...newClass, level_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t('Sélectionnez')} />
                    </SelectTrigger>
                    <SelectContent>
                      {levels.map((level) => (
                        <SelectItem key={level.id} value={level.id}>
                          {level.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={createClass} className="w-full gradient-primary">
                  {t('Créer')}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Classes List */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              {t('Chargement...')}
            </div>
          ) : classes.length === 0 ? (
            <div className="col-span-full text-center py-12 text-muted-foreground">
              {t('Aucune classe créée')}
            </div>
          ) : (
            classes.map((cls) => (
              <Card key={cls.id} className="bg-card border-border hover:border-primary/50 transition-all">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                      <Users className="w-6 h-6 text-primary" />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <UserPlus className="w-4 h-4 mr-2" />
                          {t('Ajouter des étudiants')}
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Edit className="w-4 h-4 mr-2" />
                          {t('Modifier')}
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => setDeleteId(cls.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          {t('Supprimer')}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <h3 className="font-semibold text-foreground">{cls.name}</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    {cls.level?.name || t('Non défini')}
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      {cls.student_count} {(cls.student_count || 0) > 1 ? t('étudiants') : t('étudiant')}
                    </span>
                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
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
        onConfirm={() => { if (deleteId) { deleteClass(deleteId); setDeleteId(null); } }}
        description={t('Êtes-vous sûr de vouloir supprimer cette classe ?')}
      />
    </AppLayout>
  );
};

export default Classes;
