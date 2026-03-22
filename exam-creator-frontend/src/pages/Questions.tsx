import { useEffect, useState } from 'react';
import { Plus, Search, Filter, ChevronRight, Edit, Trash2, MoreVertical } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
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
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

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
  subject: Subject | null;
}

const Questions = () => {
  const { user } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
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
      toast.error('Veuillez entrer une question');
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
      toast.error('Erreur lors de la création');
    } else {
      toast.success('Question créée');
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

  const deleteQuestion = async (id: string) => {
    const { error } = await supabase.from('questions').delete().eq('id', id);
    if (error) {
      toast.error('Erreur lors de la suppression');
    } else {
      toast.success('Question supprimée');
      fetchQuestions();
    }
  };

  const filteredQuestions = questions.filter((q) => {
    const matchesSearch = q.question_text.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesSubject = filterSubject === 'all' || q.subject?.id === filterSubject;
    const matchesDifficulty = filterDifficulty === 'all' || q.difficulty === filterDifficulty;
    const matchesType = filterType === 'all' || q.question_type === filterType;
    return matchesSearch && matchesSubject && matchesDifficulty && matchesType;
  });

  const getDifficultyBadge = (difficulty: string) => {
    switch (difficulty) {
      case 'facile':
        return <Badge className="bg-success/20 text-success border-0">Facile</Badge>;
      case 'moyen':
        return <Badge className="bg-warning/20 text-warning border-0">Moyen</Badge>;
      case 'difficile':
        return <Badge className="bg-destructive/20 text-destructive border-0">Difficile</Badge>;
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
    <AppLayout title="Banque de Questions">
      <div className="space-y-6 animate-fade-in">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par mot-clé"
            className="pl-10"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" className="flex items-center gap-1 px-3 py-1.5 cursor-pointer">
            <Filter className="w-3 h-3" />
            Filtres
          </Badge>
          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger className="w-auto h-8">
              <SelectValue placeholder="Matière" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
            <SelectTrigger className="w-auto h-8">
              <SelectValue placeholder="Niveau" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="facile">Facile</SelectItem>
              <SelectItem value="moyen">Moyen</SelectItem>
              <SelectItem value="difficile">Difficile</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-auto h-8">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous</SelectItem>
              <SelectItem value="qcm">QCM</SelectItem>
              <SelectItem value="vrai_faux">Vrai/Faux</SelectItem>
              <SelectItem value="reponse_courte">Réponse courte</SelectItem>
              <SelectItem value="redaction">Rédaction</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Questions List */}
        <div className="space-y-2">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">Chargement...</div>
          ) : filteredQuestions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              Aucune question trouvée
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
                        Modifier
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-destructive"
                        onClick={() => deleteQuestion(question.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Supprimer
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
              <DialogTitle>Nouvelle Question</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Matière</Label>
                <Select
                  value={newQuestion.subject_id}
                  onValueChange={(value) => setNewQuestion({ ...newQuestion, subject_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionnez" />
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
                  <Label>Type</Label>
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
                      <SelectItem value="qcm">QCM</SelectItem>
                      <SelectItem value="vrai_faux">Vrai/Faux</SelectItem>
                      <SelectItem value="reponse_courte">Réponse courte</SelectItem>
                      <SelectItem value="redaction">Rédaction</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Difficulté</Label>
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
                      <SelectItem value="facile">Facile</SelectItem>
                      <SelectItem value="moyen">Moyen</SelectItem>
                      <SelectItem value="difficile">Difficile</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Question</Label>
                <Textarea
                  placeholder="Entrez votre question..."
                  value={newQuestion.question_text}
                  onChange={(e) => setNewQuestion({ ...newQuestion, question_text: e.target.value })}
                />
              </div>

              {newQuestion.question_type === 'qcm' && (
                <div className="space-y-2">
                  <Label>Options</Label>
                  {newQuestion.options.map((opt, idx) => (
                    <Input
                      key={idx}
                      placeholder={`Option ${idx + 1}`}
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
                <Label>Réponse correcte</Label>
                {newQuestion.question_type === 'vrai_faux' ? (
                  <Select
                    value={newQuestion.correct_answer}
                    onValueChange={(value) => setNewQuestion({ ...newQuestion, correct_answer: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionnez" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vrai">Vrai</SelectItem>
                      <SelectItem value="faux">Faux</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Input
                    placeholder="Réponse correcte"
                    value={newQuestion.correct_answer}
                    onChange={(e) => setNewQuestion({ ...newQuestion, correct_answer: e.target.value })}
                  />
                )}
              </div>

              <div className="space-y-2">
                <Label>Points</Label>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={newQuestion.points}
                  onChange={(e) => setNewQuestion({ ...newQuestion, points: parseInt(e.target.value) || 1 })}
                />
              </div>

              <Button onClick={createQuestion} className="w-full gradient-primary">
                Créer la question
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AppLayout>
  );
};

export default Questions;
