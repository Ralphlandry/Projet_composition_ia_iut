import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Users, Send, Clock, CheckCircle, Download, AlertTriangle, FileSpreadsheet, FileText, History, BarChart3 } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabase } from '@/lib/backendClient';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';
import ExamHistory from '@/components/ExamHistory';
import QuestionStats from '@/components/QuestionStats';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Submission {
  id: string;
  student_id: string;
  status: string | null;
  score: number | null;
  started_at: string | null;
  submitted_at: string | null;
  incidents: string | null;
  student: {
    full_name: string | null;
    email: string;
  } | null;
  student_number?: string;
}

interface ExamInfo {
  id: string;
  title: string;
  total_points: number | null;
}

const ExamSubmissions = () => {
  const { t } = useLanguage();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [exam, setExam] = useState<ExamInfo | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [incidentStudent, setIncidentStudent] = useState<{ name: string; incidents: { event: string; at: string }[] } | null>(null);

  useEffect(() => {
    if (id) fetchData();
  }, [id]);

  const fetchData = async () => {
    try {
      const [examRes, subsRes] = await Promise.all([
        supabase.from('exams').select('id, title, total_points').eq('id', id!).single(),
        supabase.from('submissions')
          .select('id, student_id, status, score, started_at, submitted_at, incidents, student:profiles(full_name, email)')
          .eq('exam_id', id!)
          .order('started_at', { ascending: false }),
      ]);

      if (examRes.data) setExam(examRes.data);
      if (subsRes.data) {
        const subs = subsRes.data as unknown as Submission[];
        // Fetch student_number for all students
        const studentIds = subs.map(s => s.student_id).filter(Boolean);
        if (studentIds.length > 0) {
          const { data: spData } = await supabase
            .from('student_profiles')
            .select('user_id, student_number')
            .in('user_id', studentIds);
          const matriculeMap = new Map<string, string>();
          (spData || []).forEach((sp: any) => { if (sp.user_id) matriculeMap.set(sp.user_id, sp.student_number || ''); });
          subs.forEach(s => { s.student_number = matriculeMap.get(s.student_id) || ''; });
        }
        setSubmissions(subs);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error(t('Erreur lors du chargement'));
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'soumis':
        return <Badge className="bg-warning/20 text-warning border-0">{t('Soumis')}</Badge>;
      case 'corrige_auto':
        return <Badge className="bg-primary/20 text-primary border-0">{t('Provisoire IA')}</Badge>;
      case 'en_cours':
        return <Badge className="bg-primary/20 text-primary border-0">{t('En cours')}</Badge>;
      case 'corrige':
        return <Badge className="bg-success/20 text-success border-0">{t('Corrigé')}</Badge>;
      default:
        return <Badge variant="secondary">{status || t('Inconnu')}</Badge>;
    }
  };

  const getExportRows = () => {
    return submissions.map(sub => {
      const incidentCount = sub.incidents
        ? (() => { try { return JSON.parse(sub.incidents).length; } catch { return 0; } })()
        : 0;
      return [
        sub.student_number ?? '',
        sub.student?.full_name ?? '',
        sub.student?.email ?? '',
        sub.status ?? '',
        sub.score !== null ? sub.score : '',
        exam?.total_points ?? 20,
        sub.started_at ? new Date(sub.started_at).toLocaleString('fr-FR') : '',
        sub.submitted_at ? new Date(sub.submitted_at).toLocaleString('fr-FR') : '',
        incidentCount,
      ];
    });
  };

  const exportHeaders = [t('Matricule'), t('Étudiant'), t('Email'), t('Statut'), t('Note'), t('Total'), t('Début'), t('Soumis le'), t('Incidents réseau')];
  const filename = `${exam?.title ?? 'resultats'}_${new Date().toISOString().slice(0, 10)}`;

  const exportExcel = () => {
    const rows = getExportRows();
    const ws = XLSX.utils.aoa_to_sheet([exportHeaders, ...rows]);
    const colWidths = exportHeaders.map((h, i) => {
      const maxLen = Math.max(h.length, ...rows.map(r => String(r[i]).length));
      return { wch: maxLen + 2 };
    });
    ws['!cols'] = colWidths;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t('Soumissions'));
    XLSX.writeFile(wb, `${filename}.xlsx`);
    toast.success(t('Export Excel téléchargé'));
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text(exam?.title ?? t('Résultats'), 14, 20);
    doc.setFontSize(10);
    doc.text(`${t('Exporté le')} ${new Date().toLocaleDateString('fr-FR')}`, 14, 28);

    const rows = getExportRows().map(r => r.map(c => String(c)));
    autoTable(doc, {
      head: [exportHeaders],
      body: rows,
      startY: 34,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [34, 197, 94] },
    });

    doc.save(`${filename}.pdf`);
    toast.success(t('Export PDF téléchargé'));
  };

  const submitted = submissions.filter(s => s.status === 'soumis').length;
  const pending = submissions.filter(s => s.status === 'corrige_auto').length;
  const graded = submissions.filter(s => s.status === 'corrige').length;

  if (loading) {
    return (
      <AppLayout title={t("Soumissions")}>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={exam?.title || t('Soumissions')}>
      <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            {t('Retour')}
          </Button>
          {submissions.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  {t('Exporter')}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportExcel}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  Excel (.xlsx)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportPDF}>
                  <FileText className="w-4 h-4 mr-2" />
                  PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{submissions.length}</p>
                <p className="text-xs text-muted-foreground">{t('Étudiants')}</p>
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
                <p className="text-xs text-muted-foreground">{t('Soumis')}</p>
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
                <p className="text-xs text-muted-foreground">{t('A valider')}</p>
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
                <p className="text-xs text-muted-foreground">{t('Corrigés')}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submissions List */}
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-foreground">{t('Soumissions des étudiants')}</h3>
          {submissions.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">{t('Aucune soumission pour cette épreuve')}</p>
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
                          {sub.student?.full_name || t('Sans nom')}
                        </p>
                        <p className="text-sm text-muted-foreground">{sub.student?.email}</p>
                        {sub.student_number && (
                          <p className="text-xs text-muted-foreground">{t('Matricule')}: {sub.student_number}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {(() => {
                        const incidents = sub.incidents ? (() => { try { return JSON.parse(sub.incidents); } catch { return []; } })() : [];
                        return incidents.length > 0 ? (
                          <button
                            onClick={() => setIncidentStudent({ name: sub.student?.full_name || sub.student?.email || t('Étudiant'), incidents })}
                            className="text-xs font-medium bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300 px-2 py-0.5 rounded-full border border-orange-300 dark:border-orange-700 cursor-pointer hover:bg-orange-200 dark:hover:bg-orange-900/60 transition-colors"
                          >
                            ⚠️ {incidents.length} incident{incidents.length > 1 ? 's' : ''} réseau
                          </button>
                        ) : null;
                      })()}
                      {sub.score !== null && (
                        <span className="text-sm font-medium text-foreground">
                          {sub.score}/{exam?.total_points || 20}
                        </span>
                      )}
                      {sub.status !== 'soumis' && sub.status !== 'corrige_auto' && sub.status !== 'corrige' && (
                        <span className="text-sm text-muted-foreground">{t('Non soumis')}</span>
                      )}
                      {getStatusBadge(sub.status)}
                      {(sub.status === 'soumis' || sub.status === 'corrige_auto' || sub.status === 'corrige') && (
                        <Link to={`/corrections/${sub.id}`}>
                          <Button size="sm" variant="outline">
                            {t('Corriger')}
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

        {/* Statistiques par question */}
        {exam && submissions.length > 0 && (
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                <BarChart3 className="w-4 h-4" />
                {t('Statistiques par question')}
              </h3>
              <QuestionStats examId={exam.id} />
            </CardContent>
          </Card>
        )}

        {/* Exam modification history */}
        {exam && (
          <Card className="bg-card border-border mx-0">
            <CardContent className="p-4">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2 mb-3">
                <History className="w-4 h-4" />
                {t('Historique des modifications')}
              </h3>
              <ExamHistory examId={exam.id} />
            </CardContent>
          </Card>
        )}

      {/* Incident details dialog */}
      <Dialog open={!!incidentStudent} onOpenChange={(open) => { if (!open) setIncidentStudent(null); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-500" />
              {t('Incidents réseau')} — {incidentStudent?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {incidentStudent?.incidents.map((inc, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border">
                <div className="flex items-center gap-2">
                  <span className="text-orange-500">⚠️</span>
                  <span className="text-sm font-medium text-foreground">{inc.event}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {new Date(inc.at).toLocaleString('fr-FR')}
                </span>
              </div>
            ))}
          </div>
          {incidentStudent && (
            <p className="text-xs text-muted-foreground text-center">
              {incidentStudent.incidents.length} incident{incidentStudent.incidents.length > 1 ? 's' : ''} enregistré{incidentStudent.incidents.length > 1 ? 's' : ''}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default ExamSubmissions;
