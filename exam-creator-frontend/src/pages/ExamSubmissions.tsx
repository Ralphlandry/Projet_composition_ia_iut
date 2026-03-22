import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Users, Send, Clock, CheckCircle } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/lib/backendClient';
import { toast } from 'sonner';

interface Submission {
  id: string;
  status: string | null;
  score: number | null;
  started_at: string | null;
  submitted_at: string | null;
  student: {
    full_name: string | null;
    email: string;
  } | null;
}

interface ExamInfo {
  id: string;
  title: string;
  total_points: number | null;
}

const ExamSubmissions = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [exam, setExam] = useState<ExamInfo | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [examRes, subsRes] = await Promise.all([
        supabase.from('exams').select('id, title, total_points').eq('id', id!).single(),
        supabase.from('submissions')
          .select('id, status, score, started_at, submitted_at, student:profiles(full_name, email)')
          .eq('exam_id', id!)
          .order('started_at', { ascending: false }),
      ]);

      if (examRes.data) setExam(examRes.data);
      if (subsRes.data) setSubmissions(subsRes.data as unknown as Submission[]);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Erreur lors du chargement');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'soumis':
        return <Badge className="bg-warning/20 text-warning border-0">Soumis</Badge>;
      case 'corrige_auto':
        return <Badge className="bg-primary/20 text-primary border-0">Provisoire IA</Badge>;
      case 'en_cours':
        return <Badge className="bg-primary/20 text-primary border-0">En cours</Badge>;
      case 'corrige':
        return <Badge className="bg-success/20 text-success border-0">Corrigé</Badge>;
      default:
        return <Badge variant="secondary">{status || 'Inconnu'}</Badge>;
    }
  };

  const submitted = submissions.filter(s => s.status === 'soumis').length;
  const pending = submissions.filter(s => s.status === 'corrige_auto').length;
  const graded = submissions.filter(s => s.status === 'corrige').length;

  if (loading) {
    return (
      <AppLayout title="Soumissions">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={exam?.title || 'Soumissions'}>
      <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
        <Button variant="ghost" onClick={() => navigate(-1)}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{submissions.length}</p>
                <p className="text-xs text-muted-foreground">Étudiants</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-warning/20 flex items-center justify-center">
                <Send className="w-5 h-5 text-warning" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{submitted}</p>
                <p className="text-xs text-muted-foreground">Soumis</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-orange-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{pending}</p>
                <p className="text-xs text-muted-foreground">A valider</p>
              </div>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{graded}</p>
                <p className="text-xs text-muted-foreground">Corrigés</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submissions List */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground">Soumissions des étudiants</h3>
          {submissions.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">Aucune soumission pour cette épreuve</p>
              </CardContent>
            </Card>
          ) : (
            submissions.map((sub) => (
              <Card key={sub.id} className="bg-card border-border hover:border-primary/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback className="bg-secondary text-secondary-foreground">
                          {(sub.student?.full_name || sub.student?.email || '?').charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-foreground">
                          {sub.student?.full_name || 'Sans nom'}
                        </p>
                        <p className="text-sm text-muted-foreground">{sub.student?.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {sub.score !== null && (
                        <span className="text-sm font-medium text-foreground">
                          {sub.score}/{exam?.total_points || 20}
                        </span>
                      )}
                      {sub.status !== 'soumis' && sub.status !== 'corrige_auto' && sub.status !== 'corrige' && (
                        <span className="text-sm text-muted-foreground">Non soumis</span>
                      )}
                      {getStatusBadge(sub.status)}
                      {(sub.status === 'soumis' || sub.status === 'corrige_auto' || sub.status === 'corrige') && (
                        <Link to={`/corrections/${sub.id}`}>
                          <Button size="sm" variant="outline">
                            Corriger
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default ExamSubmissions;
