import { useEffect, useState } from 'react';
import { Plus, Search, Filter, ChevronRight, Edit, Trash2, MoreVertical, Users } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import ConfirmDeleteDialog from '@/components/ConfirmDeleteDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/lib/backendClient';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';

interface Subject {
  id: string;
  name: string;
  color: string;
}

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  difficulty: string;
  points: number;
  created_by: string | null;
  subject: Subject | null;
  creator: { full_name: string | null; email: string } | null;
}

const Questions = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterOwner, setFilterOwner] = useState<string>('all');
  const [showDialog, setShowDialog] = useState(false);

  const [newQuestion, setNewQuestion] = useState({
    question_text: '',
    question_type: 'qcm' as 'qcm' | 'vrai_faux' | 'reponse_courte' | 'redaction',
    difficulty: 'moyen' as 'facile' | 'moyen' | 'difficile',
    subject_id: '',
    points: 1,
    options: ['', '', '', ''],
    correct_answer: '',
  });

  useEffect(() => {
    fetchQuestions();
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    const { data } = await supabase.from('subjects').select('*');
    if (data) setSubjects(data);
  };

  const fetchQuestions = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('questions')
      .select(`
        id,
        question_text,
        question_type,
        difficulty,
        points,
        created_by,
        subject:subjects(id, name, color)
      `)
      .order('created_at', { ascending: false });

    if (data) {
      setQuestions(data as unknown as Question[]);
    }
    setLoading(false);
  };

  const createQuestion = async () => {
    if (!newQuestion.question_text.trim()) {
      toast.error(t('Veuillez entrer une question'));
      return;
    }

    const { error } = await supabase.from('questions').insert({
      question_text: newQuestion.question_text,
      question_type: newQuestion.question_type,
      difficulty: newQuestion.difficulty,
      subject_id: newQuestion.subject_id || null,
      points: newQuestion.points,
      options: newQuestion.options.filter(o => o.trim()),
      correct_answer: newQuestion.correct_answer,
      created_by: user?.id,
    });

    if (error) {
      toast.error(t('Erreur lors de la création'));
    } else {
      toast.success(t('Question créée'));
      setShowDialog(false);
      setNewQuestion({
        question_text: '',
        question_type: 'qcm',
        difficulty: 'moyen',
        subject_id: '',
        points: 1,
        options: ['', '', '', ''],
        correct_answer: '',
      });
      fetchQuestions();
    }
  };

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const deleteQuestion = async (id: string) => {
    const { error } = await supabase.from('questions').delete().eq('id', id);
    if (error) {
      toast.error(t('Erreur lors de la suppression'));
    } else {
      toast.success(t('Question supprimée'));
      fetchQuestions();
    }
  };

  const filteredQuestions = questions.filter((q) => {
    const matchesSearch = q.question_text.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = filterSubject === 'all' || q.subject?.id === filterSubject;
    const matchesDifficulty = filterDifficulty === 'all' || q.difficulty === filterDifficulty;
    const matchesType = filterType === 'all' || q.question_type === filterType;
    const matchesOwner = filterOwner === 'all' || (filterOwner === 'mine' && q.created_by === user?.id);
    return matchesSearch && matchesSubject && matchesDifficulty && matchesType && matchesOwner;
  });

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case 'facile':
        return <Badge className="bg-success/20 text-success border-0">{t('Facile')}</Badge>;
      case 'moyen':
        return <Badge className="bg-warning/20 text-warning border-0">{t('Moyen')}</Badge>;
      case 'difficile':
        return <Badge className="bg-destructive/20 text-destructive border-0">{t('Difficile')}</Badge>;
      default:
        return <Badge variant="secondary">{difficulty}</Badge>;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'qcm': return '≡';
      case 'vrai_faux': return '✓';
      case 'reponse_courte': return '∑';
      case 'redaction': return '¶';
      default: return '?';
    }
  };

  return (
    <AppLayout title={t("Banque de Questions")}>
      <div className="space-y-6 animate-fade-in">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t("Rechercher par mot-clé")}
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="flex items-center gap-1 px-3 py-1.5 cursor-pointer">
            <Filter className="w-3 h-3" />
            {t('Filtres')}
          </Badge>
          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger className="w-auto h-8">
              <SelectValue placeholder={t("Matière")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('Toutes')}</SelectItem>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
            <SelectTrigger className="w-auto h-8">
              <SelectValue placeholder={t("Niveau")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('Tous')}</SelectItem>
              <SelectItem value="facile">{t('Facile')}</SelectItem>
              <SelectItem value="moyen">{t('Moyen')}</SelectItem>
              <SelectItem value="difficile">{t('Difficile')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-auto h-8">
              <SelectValue placeholder={t("Type")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('Tous')}</SelectItem>
              <SelectItem value="qcm">{t('QCM')}</SelectItem>
              <SelectItem value="vrai_faux">{t('Vrai/Faux')}</SelectItem>
              <SelectItem value="reponse_courte">{t('Réponse courte')}</SelectItem>
              <SelectItem value="redaction">{t('Rédaction')}</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterOwner} onValueChange={setFilterOwner}>
            <SelectTrigger className="w-auto h-8">
              <SelectValue placeholder={t("Auteur")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <span className="flex items-center gap-1"><Users className="w-3 h-3" />{t('Banque partagée')}</span>
              </SelectItem>
              <SelectItem value="mine">{t('Mes questions')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Questions List */}
        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">{t('Chargement...')}</div>
          ) : filteredQuestions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              {t('Aucune question trouvée')}
            </div>
          ) : (
            filteredQuestions.map((question) => (
              <Card key={question.id} className="bg-card border-border hover:bg-secondary/50 transition-colors">
                <CardContent className="p-4 flex items-center gap-4">
                  <div 
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-lg font-semibold shrink-0"
                    style={{ 
                      backgroundColor: `${question.subject?.color || '#3B82F6'}20`, 
                      color: question.subject?.color || '#3B82F6' 
                    }}
                  >
                    {getTypeIcon(question.question_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground truncate">{question.question_text}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {getDifficultyBadge(question.difficulty)}
                      <span className="text-xs text-muted-foreground">
                        {question.subject?.name}
                      </span>
                      {question.created_by !== user?.id && question.creator && (
                        <span className="text-xs text-muted-foreground italic">
                          — {question.creator.full_name || question.creator.email}
                        </span>
                      )}
                    </div>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Edit className="w-4 h-4 mr-2" />
                        {t('Modifier')}
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => setDeleteId(question.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {t('Supprimer')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Add Question Dialog */}
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button className="fixed bottom-20 right-4 md:bottom-6 md:right-6 w-14 h-14 rounded-full gradient-primary shadow-lg">
              <Plus className="w-6 h-6" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('Nouvelle Question')}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>{t('Matière')}</Label>
                <Select
                  value={newQuestion.subject_id}
                  onValueChange={(value) => setNewQuestion({ ...newQuestion, subject_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("Sélectionnez")} />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('Type')}</Label>
                  <Select
                    value={newQuestion.question_type}
                    onValueChange={(value: typeof newQuestion.question_type) => 
                      setNewQuestion({ ...newQuestion, question_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="qcm">{t('QCM')}</SelectItem>
                      <SelectItem value="vrai_faux">{t('Vrai/Faux')}</SelectItem>
                      <SelectItem value="reponse_courte">{t('Réponse courte')}</SelectItem>
                      <SelectItem value="redaction">{t('Rédaction')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('Difficulté')}</Label>
                  <Select
                    value={newQuestion.difficulty}
                    onValueChange={(value: typeof newQuestion.difficulty) => 
                      setNewQuestion({ ...newQuestion, difficulty: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="facile">{t('Facile')}</SelectItem>
                      <SelectItem value="moyen">{t('Moyen')}</SelectItem>
                      <SelectItem value="difficile">{t('Difficile')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>{t('Question')}</Label>
                <Textarea
                  placeholder={t("Entrez votre question...")}
                  value={newQuestion.question_text}
                  onChange={(e) => setNewQuestion({ ...newQuestion, question_text: e.target.value })}
                />
              </div>

              {newQuestion.question_type === 'qcm' && (
                <div className="space-y-2">
                  <Label>{t('Options')}</Label>
                  {newQuestion.options.map((opt, idx) => (
                    <Input
                      key={idx}
                      placeholder={`${t('Option')} ${idx + 1}`}
                      value={opt}
                      onChange={(e) => {
                        const newOptions = [...newQuestion.options];
                        newOptions[idx] = e.target.value;
                        setNewQuestion({ ...newQuestion, options: newOptions });
                      }}
                    />
                  ))}
                </div>
              )}

              <div className="space-y-2">
                <Label>{t('Réponse correcte')}</Label>
                {newQuestion.question_type === 'vrai_faux' ? (
                  <Select
                    value={newQuestion.correct_answer}
                    onValueChange={(value) => setNewQuestion({ ...newQuestion, correct_answer: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={t("Sélectionnez")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vrai">{t('Vrai')}</SelectItem>
                      <SelectItem value="faux">{t('Faux')}</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder={t("Réponse correcte")}
                    value={newQuestion.correct_answer}
                    onChange={(e) => setNewQuestion({ ...newQuestion, correct_answer: e.target.value })}
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label>{t('Points')}</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={newQuestion.points}
                  onChange={(e) => setNewQuestion({ ...newQuestion, points: parseInt(e.target.value) || 1 })}
                />
              </div>

              <Button onClick={createQuestion} className="w-full gradient-primary">
                {t('Créer la question')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <ConfirmDeleteDialog
        open={!!deleteId}
        onOpenChange={(open) => { if (!open) setDeleteId(null); }}
        onConfirm={() => { if (deleteId) { deleteQuestion(deleteId); setDeleteId(null); } }}
        description={t("Êtes-vous sûr de vouloir supprimer cette question ?")}
      />
    </AppLayout>
  );
};

export default Questions;
