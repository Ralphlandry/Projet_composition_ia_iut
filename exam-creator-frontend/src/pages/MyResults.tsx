import { useState, useEffect } from 'react';
import { Trophy, Clock, CheckCircle, XCircle, Eye } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/backendClient';
import { useAuth } from '@/hooks/useAuth';
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

  const viewDetails = async (submission: Submission) => {
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
        label: 'Validée',
        badgeClass: 'bg-success text-success-foreground',
      };
    }
    if (status === 'corrige_auto') {
      return {
        label: 'Provisoire',
        badgeClass: 'bg-primary text-primary-foreground',
      };
    }
    return {
      label: 'En attente IA',
      badgeClass: 'bg-warning text-warning-foreground',
    };
  };

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
                <p className="text-sm text-muted-foreground">Épreuves passées</p>
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
                <p className="text-sm text-muted-foreground">Corrigées</p>
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
                <p className="text-sm text-muted-foreground">Provisoires</p>
                <p className="text-2xl font-bold">
                  {submissions.filter(s => s.status === 'corrige_auto').length}
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Results List */}
        {submissions.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Aucun résultat disponible</p>
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
                        <span>Soumis le {new Date(submission.submitted_at).toLocaleDateString('fr-FR')}</span>
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
                      <Button variant="outline" onClick={() => viewDetails(submission)}>
                        <Eye className="w-4 h-4 mr-2" />
                        Détails
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
            <DialogTitle>Détails de la correction - {selectedSubmission?.exam?.title}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            {answers.map((answer, index) => (
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
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default MyResults;
