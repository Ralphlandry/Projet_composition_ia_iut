import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, Search, Table2, Users } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { supabase } from '@/lib/backendClient';
import { toast } from 'sonner';

type IdName = { id: string; name: string };

type StudentProfileRef = {
  user_id: string;
};

type ProfileRef = {
  id: string;
  full_name: string | null;
  email: string;
};

type GlobalRow = {
  student_id: string;
  full_name: string;
  email: string;
  subject_name: string;
  exam_title: string;
  score: number | null;
  total_points: number | null;
  submission_status: string;
  submitted_at: string | null;
};

type SubmissionLike = {
  student_id: string;
  exam_id: string;
  score: number | null;
  status: string | null;
  submitted_at: string | null;
  started_at?: string | null;
};

type ExamLike = {
  id: string;
  title?: string | null;
  total_points?: number | null;
  subject_id?: string | null;
  subject?: {
    name?: string | null;
  } | null;
};

const getSubmissionTime = (item: SubmissionLike) => new Date(item.submitted_at || item.started_at || 0).getTime();

const sortRows = (rows: GlobalRow[]) =>
  [...rows].sort((a, b) => {
    const aStudent = (a.full_name || a.email).toLocaleLowerCase('fr-FR');
    const bStudent = (b.full_name || b.email).toLocaleLowerCase('fr-FR');
    if (aStudent < bStudent) return -1;
    if (aStudent > bStudent) return 1;

    const aSubject = (a.subject_name || '').toLocaleLowerCase('fr-FR');
    const bSubject = (b.subject_name || '').toLocaleLowerCase('fr-FR');
    if (aSubject < bSubject) return -1;
    if (aSubject > bSubject) return 1;
    return 0;
  });

const GradesAllSubjects = () => {
  const [levels, setLevels] = useState<IdName[]>([]);
  const [specialties, setSpecialties] = useState<IdName[]>([]);
  const [filters, setFilters] = useState({ level_id: '', specialty_id: '' });
  const [rows, setRows] = useState<GlobalRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const loadMeta = async () => {
      const [levelsRes, specialtiesRes] = await Promise.all([
        supabase.from('levels').select('id, name').order('name', { ascending: true }),
        supabase.from('specialties').select('id, name').order('name', { ascending: true }),
      ]);

      setLevels((levelsRes.data || []) as IdName[]);
      setSpecialties((specialtiesRes.data || []) as IdName[]);
    };

    loadMeta();
  }, []);

  const selectedNames = useMemo(() => {
    const level = levels.find((l) => l.id === filters.level_id)?.name || '-';
    const specialty = specialties.find((s) => s.id === filters.specialty_id)?.name || '-';
    return { level, specialty };
  }, [filters, levels, specialties]);

  const filteredRows = useMemo(() => {
    const normalized = searchTerm.trim().toLocaleLowerCase('fr-FR');
    if (!normalized) return rows;
    return rows.filter((r) => {
      const student = (r.full_name || '').toLocaleLowerCase('fr-FR');
      const email = (r.email || '').toLocaleLowerCase('fr-FR');
      const subject = (r.subject_name || '').toLocaleLowerCase('fr-FR');
      return student.includes(normalized) || email.includes(normalized) || subject.includes(normalized);
    });
  }, [rows, searchTerm]);

  const stats = useMemo(() => {
    const studentCount = new Set(rows.map((r) => r.student_id)).size;
    const subjectCount = new Set(rows.map((r) => r.subject_name)).size;
    const composedCount = rows.filter((r) => r.submission_status !== 'non_compose').length;
    const withScore = rows.filter((r) => r.score !== null && r.total_points);
    const moyenne = withScore.length > 0
      ? withScore.reduce((sum, r) => sum + ((r.score! / r.total_points!) * 20), 0) / withScore.length
      : null;
    return {
      students: studentCount,
      subjects: subjectCount,
      composed: composedCount,
      lines: rows.length,
      moyenne,
    };
  }, [rows]);

  const fetchGrades = async () => {
    if (!filters.level_id || !filters.specialty_id) {
      toast.error('Sélectionnez niveau et filière');
      return;
    }

    setLoading(true);
    try {
      const studentProfilesRes = await supabase
        .from('student_profiles')
        .select('user_id')
        .eq('level_id', filters.level_id)
        .eq('specialty_id', filters.specialty_id);

      const studentIds = ((studentProfilesRes.data || []) as StudentProfileRef[])
        .map((sp) => sp.user_id)
        .filter(Boolean);

      if (studentIds.length === 0) {
        setRows([]);
        setLoaded(true);
        return;
      }

      const [profilesRes, examsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, full_name, email')
          .in('id', studentIds),
        supabase
          .from('exams')
          .select('id, title, total_points, subject_id, subject:subjects(name)')
          .eq('level_id', filters.level_id)
          .eq('specialty_id', filters.specialty_id),
      ]);

      const examList = ((examsRes.data || []) as ExamLike[]).filter((e) => e.id && e.subject_id);
      const examIds = examList.map((e) => e.id);
      if (examIds.length === 0) {
        setRows([]);
        setLoaded(true);
        return;
      }

      const submissionsRes = await supabase
        .from('submissions')
        .select('student_id, exam_id, score, status, submitted_at, started_at')
        .in('student_id', studentIds)
        .in('exam_id', examIds)
        .in('status', ['soumis', 'corrige_auto', 'corrige']);

      const profileMap = new Map<string, { full_name: string; email: string }>();
      ((profilesRes.data || []) as ProfileRef[]).forEach((p) => {
        profileMap.set(p.id, {
          full_name: p.full_name || '',
          email: p.email || '',
        });
      });

      const examMap = new Map<string, ExamLike>();
      examList.forEach((exam) => examMap.set(exam.id, exam));

      const subjects = new Map<string, string>();
      examList.forEach((exam) => {
        const subjectId = exam.subject_id;
        const subjectName = exam.subject?.name || 'Matière';
        if (subjectId) subjects.set(subjectId, subjectName);
      });

      const mostRecentByStudentSubject = new Map<string, SubmissionLike>();
      ((submissionsRes.data || []) as SubmissionLike[]).forEach((submission) => {
        const exam = examMap.get(submission.exam_id);
        const subjectId = exam?.subject_id;
        if (!subjectId || !submission.student_id) return;

        const key = `${submission.student_id}::${subjectId}`;
        const current = mostRecentByStudentSubject.get(key);
        if (!current || getSubmissionTime(submission) > getSubmissionTime(current)) {
          mostRecentByStudentSubject.set(key, submission);
        }
      });

      const allRows: GlobalRow[] = [];
      studentIds.forEach((studentId) => {
        const profile = profileMap.get(studentId);
        if (!profile) return;

        subjects.forEach((subjectName, subjectId) => {
          const key = `${studentId}::${subjectId}`;
          const selectedSubmission = mostRecentByStudentSubject.get(key);
          const selectedExam = selectedSubmission ? examMap.get(selectedSubmission.exam_id) : undefined;

          allRows.push({
            student_id: studentId,
            full_name: profile.full_name || profile.email,
            email: profile.email,
            subject_name: subjectName,
            exam_title: selectedExam?.title || '-',
            score: selectedSubmission?.score ?? null,
            total_points: selectedExam?.total_points ?? null,
            submission_status: selectedSubmission?.status || 'non_compose',
            submitted_at: selectedSubmission?.submitted_at || null,
          });
        });
      });

      setRows(sortRows(allRows));
      setLoaded(true);
    } catch (error) {
      console.error(error);
      toast.error('Erreur lors du chargement des notes globales');
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = () => {
    if (filteredRows.length === 0) {
      toast.error('Aucune donnée à exporter');
      return;
    }

    const statusLabels: Record<string, string> = {
      corrige: 'Validée',
      corrige_auto: 'Provisoire',
      soumis: 'Soumis',
      non_compose: 'Non composé',
    };

    const data = filteredRows.map((r, idx) => ({
      'N°': idx + 1,
      'Nom complet': r.full_name,
      'Email': r.email,
      'Matière': r.subject_name,
      'Épreuve': r.exam_title,
      'Note': r.score ?? '',
      'Barème': r.total_points ?? '',
      'Note /20': r.score !== null && r.total_points ? Math.round(((r.score / r.total_points) * 20) * 100) / 100 : '',
      'Statut': statusLabels[r.submission_status] || r.submission_status,
      'Date de soumission': r.submitted_at ? new Date(r.submitted_at).toLocaleString('fr-FR') : '',
    }));

    if (stats.moyenne !== null) {
      data.push({
        'N°': '' as any,
        'Nom complet': '',
        'Email': '',
        'Matière': '',
        'Épreuve': 'MOYENNE GÉNÉRALE',
        'Note': '' as any,
        'Barème': '' as any,
        'Note /20': Math.round(stats.moyenne * 100) / 100 as any,
        'Statut': '',
        'Date de soumission': '',
      });
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'NotesGlobales');
    XLSX.writeFile(
      wb,
      `notes_globales_${selectedNames.specialty.replace(/\s+/g, '_')}_${selectedNames.level.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
  };

  const getStatusBadge = (status: string) => {
    if (status === 'corrige') return <Badge className="bg-green-500/15 text-green-600 dark:text-green-400 border-0">Validée</Badge>;
    if (status === 'corrige_auto') return <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-0">Provisoire</Badge>;
    if (status === 'soumis') return <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-0">Soumis</Badge>;
    return <Badge className="bg-muted text-muted-foreground border-0">Non composé</Badge>;
  };

  const getScoreDisplay = (score: number | null, total: number | null) => {
    if (score === null) return <span className="text-muted-foreground">-</span>;
    const pct = total ? (score / total) * 100 : 0;
    const colorClass = pct >= 70 ? 'text-green-600 dark:text-green-400 font-semibold' : pct >= 50 ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-red-600 dark:text-red-400 font-medium';
    return <span className={colorClass}>{score}/{total ?? '-'}</span>;
  };

  let tableContent = (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <Table2 className="w-12 h-12 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">Sélectionnez un niveau et une filière, puis cliquez sur « Afficher les notes ».</p>
    </div>
  );

  if (loaded && filteredRows.length === 0) {
    tableContent = (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Users className="w-12 h-12 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">Aucune donnée trouvée pour ces critères.</p>
      </div>
    );
  }

  if (loaded && filteredRows.length > 0) {
    tableContent = (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>Étudiant</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Matière</TableHead>
            <TableHead>Épreuve</TableHead>
            <TableHead>Note</TableHead>
            <TableHead>Statut</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredRows.map((r, idx) => (
            <TableRow key={`${r.student_id}-${r.subject_name}-${idx}`}>
              <TableCell>{idx + 1}</TableCell>
              <TableCell className="font-medium">{r.full_name}</TableCell>
              <TableCell>{r.email}</TableCell>
              <TableCell>{r.subject_name}</TableCell>
              <TableCell>{r.exam_title}</TableCell>
              <TableCell>{getScoreDisplay(r.score, r.total_points)}</TableCell>
              <TableCell>{getStatusBadge(r.submission_status)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  return (
    <AppLayout title="Notes globales (toutes matières)">
      <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Table2 className="w-5 h-5 text-primary" />
              Vue globale des notes
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Consultez les notes de toutes les matières pour l'ensemble des étudiants d'un niveau et d'une filière, classées par ordre alphabétique.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Niveau</Label>
                <Select value={filters.level_id} onValueChange={(v) => setFilters((p) => ({ ...p, level_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Sélectionnez" /></SelectTrigger>
                  <SelectContent>
                    {levels.map((item) => (
                      <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Filière</Label>
                <Select value={filters.specialty_id} onValueChange={(v) => setFilters((p) => ({ ...p, specialty_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Sélectionnez" /></SelectTrigger>
                  <SelectContent>
                    {specialties.map((item) => (
                      <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Recherche</Label>
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nom, email ou matière"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={fetchGrades} disabled={loading}>
                <Search className="w-4 h-4 mr-2" />
                {loading ? 'Chargement...' : 'Afficher les notes'}
              </Button>
              <Button variant="outline" onClick={exportExcel} disabled={filteredRows.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                Exporter en Excel
              </Button>
            </div>
          </CardContent>
        </Card>

        {loaded && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Étudiants</p>
                <p className="text-2xl font-semibold">{stats.students}</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Matières</p>
                <p className="text-2xl font-semibold">{stats.subjects}</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Lignes exportables</p>
                <p className="text-2xl font-semibold">{stats.lines}</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Copies composées</p>
                <p className="text-2xl font-semibold">{stats.composed}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {loaded && stats.moyenne !== null && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Moyenne générale (sur 20)</p>
                <p className={`text-3xl font-bold ${
                  stats.moyenne >= 14 ? 'text-green-600 dark:text-green-400' :
                  stats.moyenne >= 10 ? 'text-amber-600 dark:text-amber-400' :
                  'text-red-600 dark:text-red-400'
                }`}>{Math.round(stats.moyenne * 100) / 100}</p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p>Basée sur {rows.filter(r => r.score !== null && r.total_points).length} copie(s) notée(s)</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Classement alphabétique — {selectedNames.level} / {selectedNames.specialty}</span>
              {loaded && <Badge variant="outline" className="ml-2 font-normal">{filteredRows.length} résultat(s)</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>{tableContent}</CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default GradesAllSubjects;
