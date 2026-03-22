import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, Clock, User, Save, Sparkles } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/backendClient';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface SubmissionDetails {
  id: string;
  score: number | null;
  status: string;
  submitted_at: string;
  exam: {
    id: string;
    title: string;
    total_points: number;
    subject: { name: string } | null;
  } | null;
  student: {
    full_name: string | null;
    email: string;
  } | null;
}

interface Answer {
  id: string;
  answer_text: string;
  points_awarded: number | null;
  feedback: string | null;
  question: {
    id: string;
    question_text: string;
    correct_answer: string;
    points: number;
    question_type: string;
  } | null;
}

const Corrections = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [submission, setSubmission] = useState<SubmissionDetails | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [applyingAi, setApplyingAi] = useState(false);
  const [grades, setGrades] = useState<{ [key: string]: { points: number; feedback: string } }>({});
  const [aiSuggestions, setAiSuggestions] = useState<{ [key: string]: { points: number; feedback: string } }>({});

  useEffect(() => {
    if (id) {
      fetchSubmissionDetails();
    }
  }, [id]);

  const fetchSubmissionDetails = async () => {
    setLoading(true);

    // Fetch submission
    const { data: submissionData } = await supabase
      .from('submissions')
      .select(`
        id,
        score,
        status,
        submitted_at,
        exam:exams(id, title, total_points, subject:subjects(name)),
        student:profiles(full_name, email)
      `)
      .eq('id', id)
      .single();

    if (submissionData) {
      setSubmission(submissionData as unknown as SubmissionDetails);
    }

    // Fetch answers
    const { data: answersData } = await supabase
      .from('answers')
      .select(`
        id,
        answer_text,
        points_awarded,
        feedback,
        question:questions(id, question_text, correct_answer, points, question_type)
      `)
      .eq('submission_id', id);

    if (answersData) {
      setAnswers(answersData as unknown as Answer[]);
      
      // Initialize grades
      const initialGrades: typeof grades = {};
      const initialAiSuggestions: typeof grades = {};
      answersData.forEach((a: any) => {
        initialGrades[a.id] = {
          points: a.points_awarded || 0,
          feedback: a.feedback || '',
        };
        initialAiSuggestions[a.id] = {
          points: a.points_awarded || 0,
          feedback: a.feedback || '',
        };
      });
      setGrades(initialGrades);
      setAiSuggestions(initialAiSuggestions);
    }

    setLoading(false);
  };

  const saveGrades = async () => {
    setSaving(true);

    try {
      // Update each answer
      for (const [answerId, grade] of Object.entries(grades)) {
        const answer = answers.find((a) => a.id === answerId);
        const isBlankAnswer = !((answer?.answer_text || '').trim());
        const safePoints = isBlankAnswer ? 0 : grade.points;

        await supabase
          .from('answers')
          .update({
            points_awarded: safePoints,
            feedback: grade.feedback,
            is_correct: safePoints > 0,
          })
          .eq('id', answerId);
      }

      // Calculate total score
      const totalScore = Object.entries(grades).reduce((acc, [answerId, g]) => {
        const answer = answers.find((a) => a.id === answerId);
        const isBlankAnswer = !((answer?.answer_text || '').trim());
        return acc + (isBlankAnswer ? 0 : g.points);
      }, 0);

      // Update submission
      await supabase
        .from('submissions')
        .update({
          score: totalScore,
          status: 'corrige',
          graded_by: user?.id,
          graded_at: new Date().toISOString(),
        })
        .eq('id', id);

      toast.success('Correction enregistrée');
      navigate('/dashboard');
    } catch (error) {
      console.error('Erreur sauvegarde correction:', error);
      toast.error('Erreur lors de l\'enregistrement');
    } finally {
      setSaving(false);
    }
  };

  const runAiCorrection = async () => {
    if (!id) return;
    setApplyingAi(true);
    try {
      // Re-trigger backend auto-correction pipeline.
      const { error } = await supabase
        .from('submissions')
        .update({ status: 'soumis' })
        .eq('id', id);

      if (error) throw error;

      await fetchSubmissionDetails();
      toast.success('Correction IA lancée. Les propositions ont été rechargées.');
    } catch (error) {
      console.error('Error running AI correction:', error);
      toast.error('Impossible de lancer la correction IA. Vérifiez que le service IA est démarré.');
    } finally {
      setApplyingAi(false);
    }
  };

  const totalPoints = submission?.exam?.total_points || 20;
  const currentScore = Object.values(grades).reduce((acc, g) => acc + g.points, 0);
  const progress = (currentScore / totalPoints) * 100;

  if (loading) {
    return (
      <AppLayout title="Correction">
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          Chargement...
        </div>
      </AppLayout>
    );
  }

  if (!submission) {
    return (
      <AppLayout title="Correction">
        <div className="text-center py-12 text-muted-foreground">
          Soumission non trouvée
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Correction">
      <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Button>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={runAiCorrection}
              disabled={applyingAi}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {applyingAi ? 'Correction IA...' : 'Lancer correction IA'}
            </Button>
            <Button 
              onClick={saveGrades}
              disabled={saving}
              className="gradient-success"
            >
              <Save className="w-4 h-4 mr-2" />
              Enregistrer
            </Button>
          </div>
        </div>

        {/* Exam Info */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <h2 className="text-xl font-bold text-foreground mb-2">
              {submission.exam?.title}
            </h2>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4" />
                {submission.student?.full_name || submission.student?.email}
              </div>
              {submission.submitted_at && (
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Soumis le {new Date(submission.submitted_at).toLocaleDateString('fr-FR')}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Progress */}
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Note actuelle</span>
              <span className="text-lg font-bold text-foreground">
                {currentScore}/{totalPoints}
              </span>
            </div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>

        {/* Answers */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-foreground">Réponses</h3>
          
          {answers.length === 0 ? (
            <p className="text-muted-foreground">Aucune réponse soumise</p>
          ) : (
            answers.map((answer, index) => (
              <Card key={answer.id} className="bg-card border-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>Question {index + 1}</span>
                    <Badge variant="outline">
                      {answer.question?.points || 0} pt{(answer.question?.points || 0) > 1 ? 's' : ''}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <p className="text-foreground font-medium mb-2">
                      {answer.question?.question_text}
                    </p>
                    {answer.question?.correct_answer && (
                      <p className="text-sm text-muted-foreground">
                        Réponse correcte: <span className="font-medium text-foreground">{answer.question.correct_answer}</span>
                      </p>
                    )}
                    {!answer.question?.correct_answer && (answer.question?.question_type === 'reponse_courte' || answer.question?.question_type === 'redaction') && (
                      <p className="text-xs text-blue-600 dark:text-blue-400">Question ouverte — correction guidée par l'IA</p>
                    )}
                  </div>

                  <div className="p-3 bg-secondary rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Réponse de l'étudiant :</p>
                    <p className="text-foreground">{answer.answer_text || <em className="text-muted-foreground">Pas de réponse</em>}</p>
                  </div>

                  {aiSuggestions[answer.id]?.feedback && (
                    <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-1.5 text-sm font-medium text-blue-600 dark:text-blue-400">
                          <Sparkles className="w-3.5 h-3.5" />
                          Analyse IA — proposition : {aiSuggestions[answer.id].points} / {answer.question?.points || 0} pt{(answer.question?.points || 0) > 1 ? 's' : ''}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-xs h-6 px-2 text-blue-600 hover:text-blue-700"
                          onClick={() => setGrades({
                            ...grades,
                            [answer.id]: { ...aiSuggestions[answer.id] },
                          })}
                        >
                          Appliquer
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">{aiSuggestions[answer.id].feedback}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Points attribués</Label>
                      <Input
                        type="number"
                        min={0}
                        max={answer.question?.points || 1}
                        value={grades[answer.id]?.points || 0}
                        disabled={!((answer.answer_text || '').trim())}
                        onChange={(e) => setGrades({
                          ...grades,
                          [answer.id]: {
                            ...grades[answer.id],
                            points: parseFloat(e.target.value) || 0,
                          }
                        })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Feedback</Label>
                      <Textarea
                        placeholder="Commentaire pour l'étudiant..."
                        value={grades[answer.id]?.feedback || ''}
                        onChange={(e) => setGrades({
                          ...grades,
                          [answer.id]: {
                            ...grades[answer.id],
                            feedback: e.target.value,
                          }
                        })}
                        rows={2}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Bottom Actions */}
        <div className="flex gap-3 pb-20 md:pb-0">
          <Button 
            variant="outline" 
            className="flex-1"
            onClick={() => navigate(-1)}
          >
            Annuler
          </Button>
          <Button 
            className="flex-1 gradient-success"
            onClick={saveGrades}
            disabled={saving}
          >
            <Check className="w-4 h-4 mr-2" />
            Valider la correction
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default Corrections;
