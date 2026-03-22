import { useState, useEffect } from 'react';
import { Clock, Play, CheckCircle, AlertCircle } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/backendClient';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

interface Exam {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number | null;
  total_points: number | null;
  start_date: string | null;
  end_date: string | null;
  status: string | null;
  subject: { name: string; color: string } | null;
}

interface Submission {
  id: string;
  exam_id: string;
  status: string | null;
  score: number | null;
  started_at?: string | null;
  submitted_at?: string | null;
}

const MyExams = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [exams, setExams] = useState<Exam[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExamsAndSubmissions();
    const interval = setInterval(() => fetchExamsAndSubmissions(true), 30000);
    return () => clearInterval(interval);
  }, [user]);

  const fetchExamsAndSubmissions = async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
    try {
      // Fetch published exams
      const { data: examsData, error: examsError } = await supabase
        .from('exams')
        .select(`
          id,
          title,
          description,
          duration_minutes,
          total_points,
          start_date,
          end_date,
          status,
          subject:subjects(name, color)
        `)
        .in('status', ['publie', 'programme']);

      if (examsError) throw examsError;

      // Fetch user's submissions
      const { data: submissionsData, error: submissionsError } = await supabase
        .from('submissions')
        .select('id, exam_id, status, score, started_at, submitted_at')
        .eq('student_id', user.id);

      if (submissionsError) throw submissionsError;

      setExams(examsData || []);
      setSubmissions(submissionsData || []);
    } catch (error) {
      console.error('Error fetching exams:', error);
      toast.error('Erreur lors du chargement des épreuves');
    } finally {
      setLoading(false);
    }
  };

  const getSubmissionForExam = (examId: string) => {
    const forExam = submissions.filter((s) => s.exam_id === examId);
    if (forExam.length === 0) return undefined;

    const inProgress = forExam.find((s) => s.status === 'en_cours');
    if (inProgress) return inProgress;

    const submitted = forExam.find((s) => s.status === 'soumis' || s.status === 'corrige_auto' || s.status === 'corrige');
    if (submitted) return submitted;

    return forExam[0];
  };

  const startExam = async (examId: string) => {
    if (!user) return;

    const existing = getSubmissionForExam(examId);
    if (existing?.status === 'soumis' || existing?.status === 'corrige_auto' || existing?.status === 'corrige') {
      toast.info('Vous avez déjà soumis cette épreuve');
      return;
    }

    if (existing?.status === 'en_cours') {
      navigate(`/take-exam/${examId}`);
      return;
    }

    try {
      const { error } = await supabase
        .from('submissions')
        .insert({
          exam_id: examId,
          student_id: user.id,
          status: 'en_cours',
          started_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Épreuve démarrée');
      navigate(`/take-exam/${examId}`);
    } catch (error) {
      console.error('Error starting exam:', error);
      toast.error('Erreur lors du démarrage de l\'épreuve');
    }
  };

  const getExamStatus = (exam: Exam) => {
    const submission = getSubmissionForExam(exam.id);
    const now = new Date();
    const startDate = exam.start_date ? new Date(exam.start_date) : null;
    const endDate = exam.end_date ? new Date(exam.end_date) : null;

    if (submission?.status === 'corrige_auto') {
      return { label: 'Note provisoire', color: 'bg-primary text-primary-foreground', icon: CheckCircle };
    }
    if (submission?.status === 'soumis' || submission?.status === 'corrige') {
      return { label: 'Soumis', color: 'bg-success text-success-foreground', icon: CheckCircle };
    }
    if (submission?.status === 'en_cours') {
      return { label: 'En cours', color: 'bg-warning text-warning-foreground', icon: Clock };
    }
    if (endDate && now > endDate) {
      return { label: 'Terminé', color: 'bg-muted text-muted-foreground', icon: AlertCircle };
    }
    if (startDate && now < startDate) {
      return { label: 'À venir', color: 'bg-secondary text-secondary-foreground', icon: Clock };
    }
    return { label: 'Disponible', color: 'bg-primary text-primary-foreground', icon: Play };
  };

  const canStartExam = (exam: Exam) => {
    const submission = getSubmissionForExam(exam.id);
    if (submission) return false;

    const now = new Date();
    const startDate = exam.start_date ? new Date(exam.start_date) : null;
    const endDate = exam.end_date ? new Date(exam.end_date) : null;

    if (startDate && now < startDate) return false;
    if (endDate && now > endDate) return false;

    return true;
  };

  const canContinueExam = (exam: Exam) => {
    const submission = getSubmissionForExam(exam.id);
    return submission?.status === 'en_cours';
  };

  if (loading) {
    return (
      <AppLayout title="Mes Épreuves">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Mes Épreuves">
      <div className="space-y-4 animate-fade-in pb-20 md:pb-0">
        {exams.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Aucune épreuve disponible pour le moment</p>
            </CardContent>
          </Card>
        ) : (
          exams.map((exam) => {
            const status = getExamStatus(exam);
            const StatusIcon = status.icon;

            return (
              <Card key={exam.id} className="bg-card border-border hover:border-primary/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-foreground">{exam.title}</h3>
                        <Badge className={status.color}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {status.label}
                        </Badge>
                      </div>
                      {exam.description && (
                        <p className="text-sm text-muted-foreground">{exam.description}</p>
                      )}
                      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                        {exam.subject && (
                          <span 
                            className="px-2 py-0.5 rounded text-xs"
                            style={{ backgroundColor: exam.subject.color + '20', color: exam.subject.color }}
                          >
                            {exam.subject.name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {exam.start_date
                            ? new Date(exam.start_date).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })
                            : '—'}
                          {' → '}
                          {exam.end_date
                            ? new Date(exam.end_date).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
                            : '—'}
                        </span>
                        <span>{exam.total_points} points</span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {canStartExam(exam) && (
                        <Button onClick={() => startExam(exam.id)} className="gradient-primary">
                          <Play className="w-4 h-4 mr-2" />
                          Commencer
                        </Button>
                      )}
                      {canContinueExam(exam) && (
                        <Button onClick={() => navigate(`/take-exam/${exam.id}`)} className="gradient-primary">
                          <Play className="w-4 h-4 mr-2" />
                          Continuer
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
    </AppLayout>
  );
};

export default MyExams;
