import { useState, useEffect, useMemo } from 'react';
import { Trophy, Clock, CheckCircle, XCircle, Eye, TrendingUp } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/backendClient';
import { useAuth } from '@/hooks/useAuth';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Submission {
  id: string;
  exam_id: string;
  status: string | null;
  score: number | null;
  submitted_at: string | null;
  graded_at: string | null;
  exam: {
    title: string;
    total_points: number | null;
    end_date: string | null;
    duration_minutes: number | null;
    subject: { name: string; color: string } | null;
  } | null;
}

interface Answer {
  id: string;
  question_id: string;
  answer_text: string | null;
  is_correct: boolean | null;
  points_awarded: number | null;
  feedback: string | null;
  question: {
    question_text: string;
    points: number | null;
  } | null;
}

const MyResults = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, [user]);

  const fetchSubmissions = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('submissions')
        .select(`
          id,
          exam_id,
          status,
          score,
          submitted_at,
          graded_at,
          exam:exams(
            title,
            total_points,
            end_date,
            duration_minutes,
            subject:subjects(name, color)
          )
        `)
        .eq('student_id', user.id)
        .in('status', ['soumis', 'corrige_auto', 'corrige'])
        .order('submitted_at', { ascending: false });

      if (error) throw error;
      setSubmissions(data || []);
    } catch (error) {
      console.error('Error fetching submissions:', error);
      toast.error('Erreur lors du chargement des résultats');
    } finally {
      setLoading(false);
    }
  };

  const isExamEnded = (submission: Submission): boolean => {
    const exam = submission.exam;
    if (!exam) return true;
    if (exam.end_date) return Date.now() >= new Date(exam.end_date).getTime();
    // Sans date de fin fixe : on ne peut pas savoir, on laisse voir
    return true;
  };

  const viewDetails = async (submission: Submission) => {
    if (!isExamEnded(submission)) {
      const exam = submission.exam;
      let msg = "Les détails seront disponibles à la fin de l'épreuve.";
      if (exam?.end_date) {
        const end = new Date(exam.end_date);
        const diff = end.getTime() - Date.now();
        const h = Math.floor(diff / 3600000);
        const m = Math.floor((diff % 3600000) / 60000);
        const reste = h > 0 ? `${h}h${String(m).padStart(2, '0')}min` : `${m} min`;
        msg = `Les détails seront disponibles dans environ ${reste}.`;
      }
      toast.info(msg);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('answers')
        .select(`
          id,
          question_id,
          answer_text,
          is_correct,
          points_awarded,
          feedback,
          question:questions(question_text, points)
        `)
        .eq('submission_id', submission.id);

      if (error) throw error;
      setAnswers(data || []);
      setSelectedSubmission(submission);
      setShowDetails(true);
    } catch (error) {
      console.error('Error fetching answers:', error);
      toast.error('Erreur lors du chargement des détails');
    }
  };

  const getScoreColor = (score: number | null, total: number | null) => {
    if (score === null || total === null || total === 0) return 'text-muted-foreground';
    const percentage = (score / total) * 100;
    if (percentage >= 80) return 'text-success';
    if (percentage >= 50) return 'text-warning';
    return 'text-destructive';
  };

  const getScorePercentage = (score: number | null, total: number | null) => {
    if (score === null || total === null || total === 0) return 0;
    return Math.round((score / total) * 100);
  };

  const getSubmissionStatusMeta = (status: string | null) => {
    if (status === 'corrige') {
      return {
        label: t('Validée'),
        badgeClass: 'bg-success text-success-foreground',
      };
    }
    if (status === 'corrige_auto') {
      return {
        label: t('Provisoire'),
        badgeClass: 'bg-primary text-primary-foreground',
      };
    }
    return {
      label: t('En attente IA'),
      badgeClass: 'bg-warning text-warning-foreground',
    };
  };

  // Données pour le graphique d'évolution des notes
  const chartData = useMemo(() => {
    return submissions
      .filter(s => s.score !== null && s.exam?.total_points)
      .map(s => ({
        date: s.submitted_at ? new Date(s.submitted_at) : new Date(),
        percentage: Math.round(((s.score || 0) / (s.exam?.total_points || 1)) * 100),
        label: s.exam?.title || '',
        score: s.score || 0,
        total: s.exam?.total_points || 0,
      }))
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [submissions]);

  // Moyenne générale
  const averageScore = useMemo(() => {
    if (chartData.length === 0) return 0;
    const sum = chartData.reduce((acc, d) => acc + d.percentage, 0);
    return Math.round(sum / chartData.length);
  }, [chartData]);

  if (loading) {
    return (
      <AppLayout title="Mes Résultats">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Mes Résultats">
      <div className="space-y-4 animate-fade-in pb-20 md:pb-0">
        {/* Stats Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-primary/20">
                <Trophy className="w-6 h-6 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('Épreuves passées')}</p>
                <p className="text-2xl font-bold">{submissions.length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-success/20">
                <CheckCircle className="w-6 h-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('Corrigées')}</p>
                <p className="text-2xl font-bold">{submissions.filter(s => s.status === 'corrige').length}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-4">
              <div className="p-3 rounded-xl bg-warning/20">
                <Clock className="w-6 h-6 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">{t('Provisoires')}</p>
                <p className="text-2xl font-bold">
                  {submissions.filter(s => s.status === 'corrige_auto').length}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Graphique d'évolution des notes */}
        {chartData.length >= 2 && (
          <Card className="bg-card border-border">
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  <h3 className="font-semibold text-foreground">{t('Évolution des notes')}</h3>
                </div>
                <div className="text-sm text-muted-foreground">
                  {t('Moyenne')} : <span className={`font-bold ${averageScore >= 50 ? 'text-success' : 'text-destructive'}`}>{averageScore}%</span>
                </div>
              </div>
              <div className="relative w-full" style={{ height: '220px' }}>
                <svg viewBox="0 0 600 200" className="w-full h-full" preserveAspectRatio="xMidYMid meet">
                  {/* Lignes de grille horizontales */}
                  {[0, 25, 50, 75, 100].map(v => {
                    const y = 180 - (v / 100) * 160;
                    return (
                      <g key={v}>
                        <line x1="40" y1={y} x2="580" y2={y} stroke="currentColor" strokeOpacity={0.1} strokeDasharray="4 4" />
                        <text x="35" y={y + 4} textAnchor="end" className="fill-muted-foreground" fontSize="10">{v}%</text>
                      </g>
                    );
                  })}
                  {/* Ligne de la moyenne */}
                  <line
                    x1="40"
                    y1={180 - (averageScore / 100) * 160}
                    x2="580"
                    y2={180 - (averageScore / 100) * 160}
                    stroke="hsl(var(--primary))"
                    strokeOpacity={0.3}
                    strokeDasharray="6 3"
                    strokeWidth={1.5}
                  />
                  {/* Courbe des notes */}
                  {chartData.length > 1 && (
                    <polyline
                      fill="none"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2.5}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      points={chartData.map((d, i) => {
                        const x = 40 + (i / (chartData.length - 1)) * 540;
                        const y = 180 - (d.percentage / 100) * 160;
                        return `${x},${y}`;
                      }).join(' ')}
                    />
                  )}
                  {/* Aire sous la courbe */}
                  {chartData.length > 1 && (
                    <polygon
                      fill="hsl(var(--primary))"
                      fillOpacity={0.08}
                      points={[
                        `40,180`,
                        ...chartData.map((d, i) => {
                          const x = 40 + (i / (chartData.length - 1)) * 540;
                          const y = 180 - (d.percentage / 100) * 160;
                          return `${x},${y}`;
                        }),
                        `580,180`,
                      ].join(' ')}
                    />
                  )}
                  {/* Points + labels */}
                  {chartData.map((d, i) => {
                    const x = 40 + (i / (chartData.length - 1)) * 540;
                    const y = 180 - (d.percentage / 100) * 160;
                    const color = d.percentage >= 50 ? 'hsl(var(--success, 142 71% 45%))' : 'hsl(var(--destructive))';
                    return (
                      <g key={i}>
                        <circle cx={x} cy={y} r={5} fill={color} stroke="hsl(var(--background))" strokeWidth={2} />
                        <text x={x} y={y - 10} textAnchor="middle" className="fill-foreground" fontSize="10" fontWeight="bold">
                          {d.percentage}%
                        </text>
                        <text x={x} y={195} textAnchor="middle" className="fill-muted-foreground" fontSize="8">
                          {d.date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results List */}
        {submissions.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">{t('Aucun résultat disponible')}</p>
            </CardContent>
          </Card>
        ) : (
          submissions.map((submission) => {
            const statusMeta = getSubmissionStatusMeta(submission.status);
            const canShowScore = submission.status === 'corrige' || submission.status === 'corrige_auto';
            return (
            <Card key={submission.id} className="bg-card border-border hover:border-primary/50 transition-colors">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">{submission.exam?.title}</h3>
                      <Badge className={statusMeta.badgeClass}>{statusMeta.label}</Badge>
                    </div>
                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                      {submission.exam?.subject && (
                        <span 
                          className="px-2 py-0.5 rounded text-xs"
                          style={{ 
                            backgroundColor: submission.exam.subject.color + '20', 
                            color: submission.exam.subject.color 
                          }}
                        >
                          {submission.exam.subject.name}
                        </span>
                      )}
                      {submission.submitted_at && (
                        <span>{t('Soumis le')} {new Date(submission.submitted_at).toLocaleDateString('fr-FR')}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {canShowScore && (
                      <div className="text-center">
                        <p className={`text-2xl font-bold ${getScoreColor(submission.score, submission.exam?.total_points || null)}`}>
                          {submission.score}/{submission.exam?.total_points}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {getScorePercentage(submission.score, submission.exam?.total_points || null)}%
                        </p>
                      </div>
                    )}
                    {canShowScore && (
                      <Button
                        variant="outline"
                        onClick={() => viewDetails(submission)}
                        title={isExamEnded(submission) ? undefined : "Disponible à la fin de l'épreuve"}
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        {isExamEnded(submission) ? t('Détails') : t('Détails (verrouillé)')}
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
            );
          })
        )}
      </div>

      {/* Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t('Détails de la correction')} - {selectedSubmission?.exam?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {selectedSubmission && !isExamEnded(selectedSubmission) ? (
              <div className="flex items-start gap-3 p-4 bg-secondary border border-border rounded-lg text-sm">
                <Clock className="w-4 h-4 mt-0.5 shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-medium text-foreground">Réponses masquées</p>
                  <p className="text-muted-foreground">
                    Le détail des corrections sera visible une fois l'épreuve terminée pour tous les étudiants.
                  </p>
                </div>
              </div>
            ) : (
              answers.map((answer, index) => (
                <Card key={answer.id} className="bg-card border-border">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-full ${answer.is_correct ? 'bg-success/20' : 'bg-destructive/20'}`}>
                        {answer.is_correct ? (
                          <CheckCircle className="w-4 h-4 text-success" />
                        ) : (
                          <XCircle className="w-4 h-4 text-destructive" />
                        )}
                      </div>
                      <div className="flex-1 space-y-2">
                        <p className="font-medium text-foreground">
                          Q{index + 1}: {answer.question?.question_text}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Votre réponse: {answer.answer_text || 'Pas de réponse'}
                        </p>
                        {answer.feedback && (
                          <p className="text-sm text-primary bg-primary/10 p-2 rounded">
                            Feedback: {answer.feedback}
                          </p>
                        )}
                        <p className="text-sm">
                          Points: {answer.points_awarded || 0}/{answer.question?.points || 0}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default MyResults;
