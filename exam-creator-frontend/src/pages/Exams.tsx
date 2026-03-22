import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, ChevronRight, MoreVertical, Edit, Trash2, Eye } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { toast } from 'sonner';

interface Subject {
  id: string;
  name: string;
  color: string;
}

interface Level {
  id: string;
  name: string;
}

interface Exam {
  id: string;
  title: string;
  description: string;
  status: string;
  evaluation_type: string | null;
  semester: string | null;
  created_at: string;
  subject: Subject | null;
  specialty: { id: string; name: string } | null;
  level: Level | null;
}

const Exams = () => {
  const [exams, setExams] = useState<Exam[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');

  useEffect(() => {
    fetchExams();
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    const { data } = await supabase.from('subjects').select('*');
    if (data) setSubjects(data);
  };

  const fetchExams = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('exams')
      .select(`
        id,
        title,
        description,
        status,
        evaluation_type,
        semester,
        created_at,
        subject:subjects(id, name, color),
        specialty:specialties(id, name),
        level:levels(id, name)
      `)
      .order('created_at', { ascending: false });

    if (data) {
      setExams(data as unknown as Exam[]);
    }
    setLoading(false);
  };

  const deleteExam = async (id: string) => {
    const { error } = await supabase.from('exams').delete().eq('id', id);
    if (error) {
      toast.error('Erreur lors de la suppression');
    } else {
      toast.success('Épreuve supprimée');
      fetchExams();
    }
  };

  const filteredExams = exams.filter((exam) => {
    const matchesSearch = exam.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = filterSubject === 'all' || exam.subject?.id === filterSubject;
    const matchesStatus = filterStatus === 'all' || exam.status === filterStatus;
    return matchesSearch && matchesSubject && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'publie':
        return <Badge className="bg-success/20 text-success border-0">Publié</Badge>;
      case 'brouillon':
        return <Badge className="bg-warning/20 text-warning border-0">Brouillon</Badge>;
      case 'corrige':
        return <Badge className="bg-primary/20 text-primary border-0">Corrigé</Badge>;
      case 'archive':
        return <Badge className="bg-muted text-muted-foreground border-0">Archivé</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <AppLayout title="Épreuves">
      <div className="space-y-6 animate-fade-in">
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une épreuve..."
              className="pl-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Matière" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les matières</SelectItem>
                {subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Statut" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="brouillon">Brouillon</SelectItem>
                <SelectItem value="publie">Publié</SelectItem>
                <SelectItem value="corrige">Corrigé</SelectItem>
                <SelectItem value="archive">Archivé</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Exams List */}
        <div className="space-y-3">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Chargement...</div>
          ) : filteredExams.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground mb-4">Aucune épreuve trouvée</p>
              <Link to="/exams/create">
                <Button className="gradient-primary">
                  <Plus className="w-4 h-4 mr-2" />
                  Créer une épreuve
                </Button>
              </Link>
            </div>
          ) : (
            filteredExams.map((exam) => (
              <Card key={exam.id} className="bg-card border-border hover:border-primary/50 transition-all">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4 flex-1">
                      <div 
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-xl font-semibold shrink-0"
                        style={{ 
                          backgroundColor: `${exam.subject?.color || '#3B82F6'}20`, 
                          color: exam.subject?.color || '#3B82F6' 
                        }}
                      >
                        {exam.subject?.name?.charAt(0) || 'E'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-foreground truncate">{exam.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {exam.level?.name} - {exam.specialty?.name || 'Filière non définie'} - {exam.subject?.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {(exam.evaluation_type || 'Type non défini').replaceAll('_', ' ')} · {exam.semester || 'Semestre non défini'}
                        </p>
                      </div>
                      {getStatusBadge(exam.status)}
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link to={`/exams/${exam.id}/submissions`} className="flex items-center">
                            <Eye className="w-4 h-4 mr-2" />
                            Voir les soumissions
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to={`/exams/${exam.id}/edit`} className="flex items-center">
                            <Edit className="w-4 h-4 mr-2" />
                            Modifier
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={() => deleteExam(exam.id)}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* FAB for mobile */}
        <Link to="/exams/create" className="fixed bottom-20 right-4 md:bottom-6 md:right-6">
          <Button className="w-14 h-14 rounded-full gradient-success shadow-lg">
            <Plus className="w-6 h-6" />
          </Button>
        </Link>
      </div>
    </AppLayout>
  );
};

export default Exams;
