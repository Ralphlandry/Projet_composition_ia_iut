import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Trophy, Clock, CheckCircle, BookOpen, ChevronRight, Loader2, AlertCircle } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/lib/backendClient';
import { useAuth } from '@/hooks/useAuth';

interface SubmissionResult {
  id: string;
  score: number | null;
  status: string;
  submitted_at: string | null;
  exam: {
    title: string;
    total_points: number | null;
    end_date: string | null;
    duration_minutes: number | null;
    subject: { name: string; color: string } | null;
  } | null;
}

interface AnswerDetail {
  id: string;
  answer_text: string | null;
  is_correct: boolean | null;
  points_awarded: number | null;
  feedback: string | null;
  question: {
    question_text: string;
    question_type: string;
    points: number | null;
    correct_answer: string | null;
  } | null;
}

const STATUS_LABELS: Record<string, string> = {
  soumis: 'En cours de correction',
  corrige_auto: 'Provisoire',
  corrige: 'Validée',
};

const ExamResult = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [result, setResult] = useState<SubmissionResult | null>(null);
  const [answers, setAnswers] = useState<AnswerDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [polling, setPolling] = useState(false);
  const [examEnded, setExamEnded] = useState(false);
  const [timeUntilReveal, setTimeUntilReveal] = useState<string | null>(null);

  const fetchResult = async () => {
    if (!id || !user) return;

    const { data: sub } = await supabase
      .from('submissions')
      .select(`
        id, score, status, submitted_at,
        exam:exams(title, total_points, end_date, duration_minutes, subject:subjects(name, color))
      `)
      .eq('id', id)
      .eq('student_id', user.id)
      .single();

    if (sub) {
      setResult(sub as unknown as SubmissionResult);

      // Calculer si l'épreuve est terminée pour tout le monde
      const exam = (sub as unknown as SubmissionResult).exam;
      let endTime: Date | null = null;
      if (exam?.end_date) {
        endTime = new Date(exam.end_date);
      } else if (exam?.duration_minutes && sub.submitted_at) {
        // Pas de date de fin fixe : on considère l'épreuve terminée
        // après duration_minutes depuis la première soumission possible.
        // Par sécurité on ajoute duration_minutes depuis maintenant.
        endTime = new Date(Date.now() + exam.duration_minutes * 60 * 1000);
      }
      const ended = endTime ? Date.now() >= endTime.getTime() : true;
      setExamEnded(ended);

      if (!ended && endTime) {
        const diff = endTime.getTime() - Date.now();
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        setTimeUntilReveal(h > 0 ? `${h}h${m.toString().padStart(2, '0')}min` : `${m} min`);
      }

      const { data: ans } = await supabase
        .from('answers')
        .select(`
          id, answer_text, is_correct, points_awarded, feedback,
          question:questions(question_text, question_type, points, correct_answer)
        `)
        .eq('submission_id', id);

      setAnswers((ans as unknown as AnswerDetail[]) || []);
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchResult();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, user]);

  // Polling toutes les 10s si la correction n'est pas encore disponible
  useEffect(() => {
    if (!result) return;
    if (result.status !== 'soumis') {
      setPolling(false);
      return;
    }
    setPolling(true);
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('submissions')
        .select('status, score')
        .eq('id', id)
        .single();
      if (data && data.status !== 'soumis') {
        clearInterval(interval);
        setPolling(false);
        fetchResult();
      }
    }, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result?.status]);

  if (loading) {
    return (
      <AppLayout title="Résultat">
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  if (!result) {
    return (
      <AppLayout title="Résultat">
        <div className="text-center py-20 text-muted-foreground">Résultat introuvable.</div>
      </AppLayout>
    );
  }

  const total = result.exam?.total_points || 20;
  const score = result.score ?? null;
  const percent = score !== null ? Math.round((score / total) * 100) : null;
  const isProvisoire = result.status === 'corrige_auto';
  const isEnCours = result.status === 'soumis';
  const isValide = result.status === 'corrige';

  const scoreColor =
    percent === null
      ? 'text-muted-foreground'
      : percent >= 75
      ? 'text-green-600 dark:text-green-400'
      : percent >= 50
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-red-600 dark:text-red-400';

  return (
    <AppLayout title="Résultat de l'épreuve">
      <div className="max-w-2xl mx-auto space-y-6 animate-fade-in pb-20">

        {/* Carte principale */}
        <Card className="bg-card border-border overflow-hidden">
          <div className="bg-gradient-to-r from-primary/20 to-primary/5 p-6 text-center">
            <div className="flex justify-center mb-3">
              {isValide ? (
                <CheckCircle className="w-14 h-14 text-green-500" />
              ) : isProvisoire ? (
                <Trophy className="w-14 h-14 text-amber-500" />
              ) : (
                <Clock className="w-14 h-14 text-primary" />
              )}
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-1">
              {isValide ? 'Correction validée !' : isProvisoire ? 'Note provisoire' : 'Épreuve soumise'}
            </h1>
            <p className="text-sm text-muted-foreground">{result.exam?.title}</p>
            {result.exam?.subject && (
              <Badge className="mt-2" variant="secondary">
                {result.exam.subject.name}
              </Badge>
            )}
          </div>

          <CardContent className="p-6 space-y-4">
            {/* Score */}
            {isEnCours ? (
              <div className="text-center py-4">
                <div className="flex items-center justify-center gap-2 text-muted-foreground mb-2">
                  {polling && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Correction IA en cours…</span>
                </div>
                <p className="text-xs text-muted-foreground">La note provisoire apparaîtra ici dans quelques instants.</p>
              </div>
            ) : (
              <>
                <div className="text-center">
                  <div className={`text-5xl font-bold ${scoreColor} mb-1`}>
                    {score !== null ? score.toFixed(1) : '—'}
                    <span className="text-2xl text-muted-foreground">/{total}</span>
                  </div>
                  {percent !== null && (
                    <p className={`text-lg font-semibold ${scoreColor}`}>{percent}%</p>
                  )}
                </div>
                {percent !== null && (
                  <Progress value={percent} className="h-3 rounded-full" />
                )}
              </>
            )}

            {/* Statut */}
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Statut</span>
              <Badge variant={isValide ? 'default' : 'secondary'}>
                {STATUS_LABELS[result.status] || result.status}
              </Badge>
            </div>

            {result.submitted_at && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Soumis le</span>
                <span className="text-foreground">
                  {new Date(result.submitted_at).toLocaleString('fr-FR')}
                </span>
              </div>
            )}

            {isProvisoire && (
              <div className="flex items-start gap-2 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg text-sm text-amber-700 dark:text-amber-400">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>Cette note est provisoire et générée par l'IA. Elle sera validée par votre enseignant.</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Détail des réponses */}
        {answers.length > 0 && !isEnCours && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Détail des réponses
            </h2>

            {!examEnded && (
              <div className="flex items-start gap-2 p-4 bg-secondary border border-border rounded-lg text-sm">
                <Clock className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">Réponses masquées</p>
                  <p className="text-muted-foreground">
                    Le détail des corrections sera visible une fois l'épreuve terminée pour tous les étudiants
                    {timeUntilReveal ? ` (dans environ ${timeUntilReveal})` : ''}.
                  </p>
                </div>
              </div>
            )}

            {examEnded && answers.map((answer, index) => {
              const qType = answer.question?.question_type;
              const isOpen = qType === 'reponse_courte' || qType === 'redaction';
              const pts = answer.points_awarded ?? 0;
              const maxPts = answer.question?.points ?? 0;
              const isCorrect = answer.is_correct;

              return (
                <Card key={answer.id} className="bg-card border-border">
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">
                        Q{index + 1}. {answer.question?.question_text}
                      </p>
                      <Badge
                        variant="outline"
                        className={
                          isCorrect
                            ? 'border-green-500 text-green-600'
                            : pts > 0
                            ? 'border-amber-500 text-amber-600'
                            : 'border-red-400 text-red-500'
                        }
                      >
                        {pts}/{maxPts}
                      </Badge>
                    </div>

                    <div className="text-sm text-muted-foreground">
                      Votre réponse :{' '}
                      <span className="text-foreground">
                        {answer.answer_text || <em>Pas de réponse</em>}
                      </span>
                    </div>

                    {!isOpen && answer.question?.correct_answer && (
                      <div className="text-sm text-muted-foreground">
                        Réponse correcte :{' '}
                        <span className="text-green-600 dark:text-green-400 font-medium">
                          {answer.question.correct_answer}
                        </span>
                      </div>
                    )}

                    {answer.feedback && (
                      <div className="text-xs p-2 bg-secondary rounded text-muted-foreground italic">
                        {answer.feedback}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => navigate('/my-exams')}
          >
            Mes épreuves
          </Button>
          <Button
            className="flex-1"
            onClick={() => navigate('/my-results')}
          >
            Tous mes résultats
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};

export default ExamResult;
