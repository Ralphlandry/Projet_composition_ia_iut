import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, Search, FileSpreadsheet, Users } from 'lucide-react';
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
import { useLanguage } from '@/hooks/useLanguage';

type IdName = { id: string; name: string };

type StudentProfileRef = {
  user_id: string;
  student_number?: string | null;
};

type ProfileRef = {
  id: string;
  full_name: string | null;
  email: string;
};

type ExamRef = {
  id: string;
};

type StudentRow = {
  student_id: string;
  full_name: string;
  email: string;
  student_number: string;
  score: number | null;
  total_points: number | null;
  submission_status: string;
  submitted_at: string | null;
  exam_title: string;
};

type SubmissionLike = {
  student_id: string;
  score: number | null;
  status: string | null;
  submitted_at: string | null;
  started_at?: string | null;
  exam?: {
    title?: string | null;
    total_points?: number | null;
  } | null;
};

const sortStudents = (rows: StudentRow[]) =>
  [...rows].sort((a, b) => {
    const aKey = (a.full_name || a.email).toLocaleLowerCase('fr-FR');
    const bKey = (b.full_name || b.email).toLocaleLowerCase('fr-FR');
    if (aKey < bKey) return -1;
    if (aKey > bKey) return 1;
    return 0;
  });

const pickMostRecentSubmission = (items: SubmissionLike[]) => {
  return items
    .slice()
    .sort((a, b) => {
      const aDate = new Date(a.submitted_at || a.started_at || 0).getTime();
      const bDate = new Date(b.submitted_at || b.started_at || 0).getTime();
      return bDate - aDate;
    })[0];
};

const GradesBySubject = () => {
  const { t } = useLanguage();
  const [levels, setLevels] = useState<IdName[]>([]);
  const [specialties, setSpecialties] = useState<IdName[]>([]);
  const [subjects, setSubjects] = useState<IdName[]>([]);
  const [filters, setFilters] = useState({ level_id: '', specialty_id: '', subject_id: '' });
  const [rows, setRows] = useState<StudentRow[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const loadMeta = async () => {
      const [levelsRes, specialtiesRes, subjectsRes] = await Promise.all([
        supabase.from('levels').select('id, name').order('name', { ascending: true }),
        supabase.from('specialties').select('id, name').order('name', { ascending: true }),
        supabase.from('subjects').select('id, name').order('name', { ascending: true }),
      ]);

      setLevels((levelsRes.data || []) as IdName[]);
      setSpecialties((specialtiesRes.data || []) as IdName[]);
      setSubjects((subjectsRes.data || []) as IdName[]);
    };

    loadMeta();
  }, []);

  const selectedNames = useMemo(() => {
    const level = levels.find((l) => l.id === filters.level_id)?.name || '-';
    const specialty = specialties.find((s) => s.id === filters.specialty_id)?.name || '-';
    const subject = subjects.find((s) => s.id === filters.subject_id)?.name || '-';
    return { level, specialty, subject };
  }, [filters, levels, specialties, subjects]);

  const filteredRows = useMemo(() => {
    const normalized = searchTerm.trim().toLocaleLowerCase('fr-FR');
    if (!normalized) return rows;
    return rows.filter((r) => {
      const name = (r.full_name || '').toLocaleLowerCase('fr-FR');
      const email = (r.email || '').toLocaleLowerCase('fr-FR');
      return name.includes(normalized) || email.includes(normalized);
    });
  }, [rows, searchTerm]);

  const stats = useMemo(() => {
    const composed = rows.filter((r) => r.submission_status !== 'non_compose').length;
    const provisoires = rows.filter((r) => r.submission_status === 'corrige_auto').length;
    const validees = rows.filter((r) => r.submission_status === 'corrige').length;
    const withScore = rows.filter((r) => r.score !== null && r.total_points);
    const moyenne = withScore.length > 0
      ? withScore.reduce((sum, r) => sum + ((r.score! / r.total_points!) * 20), 0) / withScore.length
      : null;
    return {
      total: rows.length,
      composed,
      provisoires,
      validees,
      moyenne,
    };
  }, [rows]);

  const fetchGrades = async () => {
    if (!filters.level_id || !filters.specialty_id || !filters.subject_id) {
      toast.error(t('Sélectionnez niveau, filière et matière'));
      return;
    }

    setLoading(true);
    try {
      const studentProfilesRes = await supabase
        .from('student_profiles')
        .select('user_id, student_number')
        .eq('level_id', filters.level_id)
        .eq('specialty_id', filters.specialty_id);

      const studentProfiles = (studentProfilesRes.data || []) as StudentProfileRef[];
      const studentIds = studentProfiles.map((sp) => sp.user_id).filter(Boolean);
      const matriculeMap = new Map<string, string>();
      studentProfiles.forEach((sp) => { if (sp.user_id) matriculeMap.set(sp.user_id, sp.student_number || ''); });

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
          .select('id')
          .eq('level_id', filters.level_id)
          .eq('specialty_id', filters.specialty_id)
          .eq('subject_id', filters.subject_id),
      ]);

      const examIds = ((examsRes.data || []) as ExamRef[]).map((e) => e.id).filter(Boolean);
      if (examIds.length === 0) {
        setRows([]);
        setLoaded(true);
        return;
      }

      const submissionsRes = await supabase
        .from('submissions')
        .select('student_id, score, status, submitted_at, started_at, exam:exams(title, total_points)')
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

      const submissionsByStudent = new Map<string, SubmissionLike[]>();
      (submissionsRes.data || []).forEach((s: SubmissionLike) => {
        if (!s.student_id) return;
        const current = submissionsByStudent.get(s.student_id) || [];
        current.push(s);
        submissionsByStudent.set(s.student_id, current);
      });

      const computed = studentIds
        .map((studentId) => {
          const profile = profileMap.get(studentId);
          if (!profile) return null;

          const studentSubs = submissionsByStudent.get(studentId) || [];
          const best = pickMostRecentSubmission(studentSubs);

          return {
            student_id: studentId,
            full_name: profile.full_name || profile.email,
            email: profile.email,
            student_number: matriculeMap.get(studentId) || '',
            score: best?.score ?? null,
            total_points: best?.exam?.total_points ?? null,
            submission_status: best?.status || 'non_compose',
            submitted_at: best?.submitted_at || null,
            exam_title: best?.exam?.title || '-',
          };
        })
        .filter((item): item is StudentRow => item !== null);

      setRows(sortStudents(computed));
      setLoaded(true);
    } catch (error) {
      console.error(error);
      toast.error(t('Erreur lors du chargement des notes'));
    } finally {
      setLoading(false);
    }
  };

  const exportExcel = () => {
    if (filteredRows.length === 0) {
      toast.error(t('Aucune donnée à exporter'));
      return;
    }

    const statusLabels: Record<string, string> = {
      corrige: t('Validée'),
      corrige_auto: t('Provisoire'),
      soumis: t('Soumis'),
      non_compose: t('Non composé'),
    };

    const data = filteredRows.map((r, idx) => ({
      [t('N°')]: idx + 1,
      [t('Matricule')]: r.student_number,
      [t('Nom complet')]: r.full_name,
      [t('Email')]: r.email,
      [t('Matière')]: selectedNames.subject,
      [t('Épreuve')]: r.exam_title,
      [t('Note')]: r.score ?? '',
      [t('Barème')]: r.total_points ?? '',
      [t('Note /20')]: r.score !== null && r.total_points ? Math.round(((r.score / r.total_points) * 20) * 100) / 100 : '',
      [t('Décision')]: r.score !== null && r.total_points ? ((r.score / r.total_points) * 20 >= 10 ? t('Validé') : t('Non validé')) : '',
      [t('Statut')]: statusLabels[r.submission_status] || r.submission_status,
      [t('Date de soumission')]: r.submitted_at ? new Date(r.submitted_at).toLocaleString('fr-FR') : '',
    }));

    if (stats.moyenne !== null) {
      data.push({
        [t('N°')]: '' as any,
        [t('Matricule')]: '',
        [t('Nom complet')]: '',
        [t('Email')]: '',
        [t('Matière')]: '',
        [t('Épreuve')]: t('MOYENNE CLASSE'),
        [t('Note')]: '' as any,
        [t('Barème')]: '' as any,
        [t('Note /20')]: Math.round(stats.moyenne * 100) / 100 as any,
        [t('Décision')]: '',
        [t('Statut')]: '',
        [t('Date de soumission')]: '',
      });
    }

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'NotesMatiere');
    XLSX.writeFile(wb, `notes_${selectedNames.subject.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  const getStatusBadge = (status: string) => {
    if (status === 'corrige') return <Badge className="bg-green-500/15 text-green-600 dark:text-green-400 border-0">{t('Validée')}</Badge>;
    if (status === 'corrige_auto') return <Badge className="bg-blue-500/15 text-blue-600 dark:text-blue-400 border-0">{t('Provisoire')}</Badge>;
    if (status === 'soumis') return <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-0">{t('Soumis')}</Badge>;
    return <Badge className="bg-muted text-muted-foreground border-0">{t('Non composé')}</Badge>;
  };

  const getScoreDisplay = (score: number | null, total: number | null) => {
    if (score === null) return <span className="text-muted-foreground">-</span>;
    const pct = total ? (score / total) * 100 : 0;
    const colorClass = pct >= 70 ? 'text-green-600 dark:text-green-400 font-semibold' : pct >= 50 ? 'text-amber-600 dark:text-amber-400 font-medium' : 'text-red-600 dark:text-red-400 font-medium';
    return <span className={colorClass}>{score}/{total ?? '-'}</span>;
  };

  let tableContent = (
    <div className="flex flex-col items-center justify-center py-12 gap-3">
      <FileSpreadsheet className="w-12 h-12 text-muted-foreground/40" />
      <p className="text-sm text-muted-foreground">{t("Sélectionnez un niveau, une filière et une matière, puis cliquez sur « Afficher les notes ».")}</p>
    </div>
  );

  if (loaded && filteredRows.length === 0) {
    tableContent = (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Users className="w-12 h-12 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">{t('Aucune copie trouvée pour ces critères.')}</p>
      </div>
    );
  }

  if (loaded && filteredRows.length > 0) {
    tableContent = (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>#</TableHead>
            <TableHead>{t('Matricule')}</TableHead>
            <TableHead>{t('Étudiant')}</TableHead>
            <TableHead>{t('Email')}</TableHead>
            <TableHead>{t('Épreuve')}</TableHead>
            <TableHead>{t('Note')}</TableHead>
            <TableHead>{t('Décision')}</TableHead>
            <TableHead>{t('Statut')}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {filteredRows.map((r, idx) => {
            const note20 = r.score !== null && r.total_points ? (r.score / r.total_points) * 20 : null;
            return (
            <TableRow key={`${r.student_id}-${idx}`}>
              <TableCell>{idx + 1}</TableCell>
              <TableCell className="text-muted-foreground text-xs">{r.student_number || '-'}</TableCell>
              <TableCell className="font-medium">{r.full_name}</TableCell>
              <TableCell>{r.email}</TableCell>
              <TableCell>{r.exam_title}</TableCell>
              <TableCell>{getScoreDisplay(r.score, r.total_points)}</TableCell>
              <TableCell>
                {note20 !== null ? (
                  note20 >= 10
                    ? <Badge className="bg-green-500/15 text-green-600 dark:text-green-400 border-0">{t('Validé')}</Badge>
                    : <Badge className="bg-red-500/15 text-red-600 dark:text-red-400 border-0">{t('Non validé')}</Badge>
                ) : <span className="text-muted-foreground">-</span>}
              </TableCell>
              <TableCell>{getStatusBadge(r.submission_status)}</TableCell>
            </TableRow>
            );
          })}
        </TableBody>
      </Table>
    );
  }

  return (
    <AppLayout title={t("Notes par matière")}>
      <div className="space-y-6 animate-fade-in pb-20 md:pb-0">
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-primary" />
              {t("Consulter les notes d'une matière")}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">{t('Sélectionnez le niveau, la filière et la matière pour afficher les notes de tous les étudiants, classées par ordre alphabétique.')}</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>{t('Niveau')}</Label>
                <Select value={filters.level_id} onValueChange={(v) => setFilters((p) => ({ ...p, level_id: v }))}>
                  <SelectTrigger><SelectValue placeholder={t("Sélectionnez")} /></SelectTrigger>
                  <SelectContent>
                    {levels.map((item) => (
                      <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('Filière')}</Label>
                <Select value={filters.specialty_id} onValueChange={(v) => setFilters((p) => ({ ...p, specialty_id: v }))}>
                  <SelectTrigger><SelectValue placeholder={t("Sélectionnez")} /></SelectTrigger>
                  <SelectContent>
                    {specialties.map((item) => (
                      <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>{t('Matière')}</Label>
                <Select value={filters.subject_id} onValueChange={(v) => setFilters((p) => ({ ...p, subject_id: v }))}>
                  <SelectTrigger><SelectValue placeholder={t("Sélectionnez")} /></SelectTrigger>
                  <SelectContent>
                    {subjects.map((item) => (
                      <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>{t('Recherche étudiant')}</Label>
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t("Nom ou email")}
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={fetchGrades} disabled={loading}>
                <Search className="w-4 h-4 mr-2" />
                {loading ? t('Chargement...') : t('Afficher les notes')}
              </Button>
              <Button variant="outline" onClick={exportExcel} disabled={filteredRows.length === 0}>
                <Download className="w-4 h-4 mr-2" />
                {t('Exporter en Excel')}
              </Button>
            </div>
          </CardContent>
        </Card>

        {loaded && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{t('Étudiants listés')}</p>
                <p className="text-2xl font-semibold">{stats.total}</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{t('Copies composées')}</p>
                <p className="text-2xl font-semibold">{stats.composed}</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{t('Notes provisoires')}</p>
                <p className="text-2xl font-semibold">{stats.provisoires}</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">{t('Notes validées')}</p>
                <p className="text-2xl font-semibold text-green-600 dark:text-green-400">{stats.validees}</p>
              </CardContent>
            </Card>
          </div>
        )}

        {loaded && stats.moyenne !== null && (
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">{t('Moyenne de classe (sur 20)')}</p>
                <p className={`text-3xl font-bold ${
                  stats.moyenne >= 14 ? 'text-green-600 dark:text-green-400' :
                  stats.moyenne >= 10 ? 'text-amber-600 dark:text-amber-400' :
                  'text-red-600 dark:text-red-400'
                }`}>{Math.round(stats.moyenne * 100) / 100}</p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p>{t('Basée sur')} {rows.filter(r => r.score !== null && r.total_points).length} {t('copie(s) notée(s)')}</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>{t('Liste alphabétique')} — {selectedNames.subject} ({selectedNames.level} / {selectedNames.specialty})</span>
              {loaded && <Badge variant="outline" className="ml-2 font-normal">{filteredRows.length} {t('résultat(s)')}</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>{tableContent}</CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default GradesBySubject;
