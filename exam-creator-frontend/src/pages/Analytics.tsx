import { useEffect, useMemo, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Download,
  TrendingUp,
  TrendingDown,
  Users,
  Award,
  BarChart3,
  Target,
  BookOpen,
  CheckCircle2,
  XCircle,
  Clock,
  Loader2,
} from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { supabase } from '@/lib/backendClient';
import { toast } from 'sonner';
import { useLanguage } from '@/hooks/useLanguage';

/* ---------- types ---------- */
interface Subject {
  id: string;
  name: string;
  color: string;
}

interface RawSubmission {
  id: string;
  exam_id: string;
  student_id: string;
  score: number | null;
  status: string;
  submitted_at: string | null;
  exam?: {
    id?: string;
    title?: string;
    total_points?: number;
    subject_id?: string;
    subject?: { id?: string; name?: string; color?: string } | null;
  } | null;
  student?: { full_name?: string | null; email?: string } | null;
}

interface ExamStat {
  examId: string;
  title: string;
  subjectName: string;
  subjectColor: string;
  totalPoints: number;
  submissions: number;
  graded: number;
  average: number;
  avg20: number;
  min: number;
  max: number;
  passRate: number;
}

interface StudentRank {
  studentId: string;
  name: string;
  email: string;
  studentNumber: string;
  count: number;
  average20: number;
}

interface DistBucket {
  label: string;
  min: number;
  max: number;
  count: number;
  pct: number;
}

/* ---------- helpers ---------- */
const DIST_RANGES = [
  { label: '0–4', min: 0, max: 4.99 },
  { label: '5–8', min: 5, max: 8.99 },
  { label: '9–11', min: 9, max: 11.99 },
  { label: '12–14', min: 12, max: 14.99 },
  { label: '15–17', min: 15, max: 17.99 },
  { label: '18–20', min: 18, max: 20 },
];

const barColor = (label: string) => {
  if (label.startsWith('18')) return 'bg-emerald-500';
  if (label.startsWith('15')) return 'bg-green-500';
  if (label.startsWith('12')) return 'bg-primary';
  if (label.startsWith('9')) return 'bg-amber-500';
  if (label.startsWith('5')) return 'bg-orange-500';
  return 'bg-red-500';
};

const round = (v: number, d = 1) => Math.round(v * 10 ** d) / 10 ** d;

/* ========== component ========== */
const Analytics = () => {
  const { t } = useLanguage();
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [rawSubs, setRawSubs] = useState<RawSubmission[]>([]);
  const [matriculeMap, setMatriculeMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  /* --- fetch data once --- */
  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [{ data: subData }, { data: submsData }] = await Promise.all([
          supabase.from('subjects').select('id, name, color').order('name', { ascending: true }),
          supabase
            .from('submissions')
            .select(
              'id, exam_id, student_id, score, status, submitted_at, exam:exams(id, title, total_points, subject_id, subject:subjects(id, name, color)), student:profiles(full_name, email)',
            )
            .order('submitted_at', { ascending: false }),
        ]);
        if (subData) setSubjects(subData as unknown as Subject[]);
        if (submsData) {
          setRawSubs(submsData as unknown as RawSubmission[]);
          // fetch student_profiles for matricule
          const studentIds = [...new Set((submsData as any[]).map((s: any) => s.student_id).filter(Boolean))];
          if (studentIds.length) {
            const { data: spData } = await supabase
              .from('student_profiles')
              .select('user_id, student_number')
              .in('user_id', studentIds);
            if (spData) {
              const m: Record<string, string> = {};
              for (const sp of spData as any[]) {
                if (sp.user_id && sp.student_number) m[sp.user_id] = sp.student_number;
              }
              setMatriculeMap(m);
            }
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  /* --- filtered data --- */
  const filtered = useMemo(
    () =>
      subjectFilter === 'all'
        ? rawSubs
        : rawSubs.filter(
            (s) =>
              s.exam?.subject_id === subjectFilter ||
              s.exam?.subject?.id === subjectFilter,
          ),
    [rawSubs, subjectFilter],
  );

  /* --- global stats --- */
  const globalStats = useMemo(() => {
    const graded = filtered.filter(
      (s) => s.score !== null && s.score !== undefined,
    );
    const scores20 = graded.map((s) => {
      const tp = s.exam?.total_points || 20;
      return (s.score! / tp) * 20;
    });
    const total = filtered.length;
    const gradedCount = graded.length;
    const pending = filtered.filter((s) =>
      ['soumis', 'corrige_auto'].includes(s.status),
    ).length;
    const uniqueStudents = new Set(filtered.map((s) => s.student_id)).size;
    const avg = scores20.length
      ? scores20.reduce((a, b) => a + b, 0) / scores20.length
      : 0;
    const passCount = scores20.filter((s) => s >= 10).length;
    const passRate = scores20.length
      ? Math.round((passCount / scores20.length) * 100)
      : 0;
    const best = scores20.length ? Math.max(...scores20) : 0;
    const worst = scores20.length ? Math.min(...scores20) : 0;

    return {
      total,
      gradedCount,
      pending,
      uniqueStudents,
      avg: round(avg),
      passRate,
      best: round(best),
      worst: round(worst),
      scores20,
    };
  }, [filtered]);

  /* --- distribution --- */
  const distribution: DistBucket[] = useMemo(() => {
    const { scores20 } = globalStats;
    if (!scores20.length)
      return DIST_RANGES.map((r) => ({ ...r, count: 0, pct: 0 }));
    return DIST_RANGES.map((r) => {
      const count = scores20.filter((s) => s >= r.min && s <= r.max).length;
      return { ...r, count, pct: round((count / scores20.length) * 100, 0) };
    });
  }, [globalStats]);

  /* --- per-exam stats --- */
  const examStats: ExamStat[] = useMemo(() => {
    const grouped: Record<string, RawSubmission[]> = {};
    for (const s of filtered) {
      const eid = s.exam_id;
      if (!grouped[eid]) grouped[eid] = [];
      grouped[eid].push(s);
    }
    return Object.entries(grouped)
      .map(([examId, subs]) => {
        const exam = subs[0]?.exam;
        const tp = exam?.total_points || 20;
        const graded = subs.filter((s) => s.score !== null && s.score !== undefined);
        const scores20 = graded.map((s) => ((s.score ?? 0) / tp) * 20);
        const avg = scores20.length
          ? scores20.reduce((a, b) => a + b, 0) / scores20.length
          : 0;
        const passCount = scores20.filter((s) => s >= 10).length;
        return {
          examId,
          title: exam?.title || examId,
          subjectName: exam?.subject?.name || '—',
          subjectColor: exam?.subject?.color || '#888',
          totalPoints: tp,
          submissions: subs.length,
          graded: graded.length,
          average: scores20.length
            ? round(
                graded.reduce((a, s) => a + (s.score ?? 0), 0) / graded.length,
              )
            : 0,
          avg20: round(avg),
          min: scores20.length ? round(Math.min(...scores20)) : 0,
          max: scores20.length ? round(Math.max(...scores20)) : 0,
          passRate: scores20.length
            ? Math.round((passCount / scores20.length) * 100)
            : 0,
        } as ExamStat;
      })
      .sort((a, b) => b.submissions - a.submissions);
  }, [filtered]);

  /* --- student ranking (top 10) --- */
  const studentRanking: StudentRank[] = useMemo(() => {
    const map: Record<
      string,
      { name: string; email: string; scores: number[] }
    > = {};
    for (const s of filtered) {
      if (s.score === null || s.score === undefined) continue;
      const tp = s.exam?.total_points || 20;
      const s20 = (s.score / tp) * 20;
      const sid = s.student_id;
      if (!map[sid])
        map[sid] = {
          name: s.student?.full_name || '',
          email: s.student?.email || '',
          scores: [],
        };
      map[sid].scores.push(s20);
    }
    return Object.entries(map)
      .map(([studentId, v]) => ({
        studentId,
        name: v.name || v.email,
        email: v.email,
        studentNumber: matriculeMap[studentId] || '',
        count: v.scores.length,
        average20: round(
          v.scores.reduce((a, b) => a + b, 0) / v.scores.length,
        ),
      }))
      .sort((a, b) => b.average20 - a.average20)
      .slice(0, 10);
  }, [filtered, matriculeMap]);

  /* --- export xlsx --- */
  const exportExcel = () => {
    const graded = filtered.filter(
      (s) => s.score !== null && s.score !== undefined,
    );
    if (!graded.length) {
      toast.error(t('Aucune donnée à exporter'));
      return;
    }

    const rows = graded.map((s, i) => {
      const tp = s.exam?.total_points || 20;
      return {
        'N°': i + 1,
        [t('Étudiant')]: s.student?.full_name || s.student?.email || s.student_id,
        [t('Matricule')]: matriculeMap[s.student_id] || '',
        'Email': s.student?.email || '',
        [t('Épreuve')]: s.exam?.title || '',
        [t('Matière')]: s.exam?.subject?.name || '',
        [t('Note')]: s.score,
        [t('Barème')]: tp,
        [t('Note /20')]: round((s.score! / tp) * 20, 2),
        [t('Statut')]: s.status,
        [t('Date')]: s.submitted_at
          ? new Date(s.submitted_at).toLocaleString('fr-FR')
          : '',
      };
    });

    // summary row
    rows.push({
      'N°': '' as any,
      [t('Étudiant')]: t('RÉSUMÉ'),
      [t('Matricule')]: '',
      'Email': '',
      [t('Épreuve')]: `${examStats.length} ${t('épreuves')}`,
      [t('Matière')]: '',
      [t('Note')]: '' as any,
      [t('Barème')]: '' as any,
      [t('Note /20')]: globalStats.avg,
      [t('Statut')]: `${globalStats.passRate}% ${t('réussite')}`,
      [t('Date')]: '',
    });

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, t('Rapport'));
    XLSX.writeFile(
      wb,
      `rapport_analytique_${new Date().toISOString().slice(0, 10)}.xlsx`,
    );
    toast.success(t('Export réussi'));
  };

  /* ---------- render ---------- */
  if (loading) {
    return (
      <AppLayout title={t('Rapports et Analyses')}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title={t('Rapports et Analyses')}>
      <div className="space-y-6 animate-fade-in">
        {/* ---- toolbar ---- */}
        <div className="flex flex-wrap items-center gap-3">
          <Select value={subjectFilter} onValueChange={setSubjectFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder={t('Filtrer par matière')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('Toutes les matières')}</SelectItem>
              {subjects.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button variant="outline" onClick={exportExcel} className="ml-auto">
            <Download className="w-4 h-4 mr-2" />
            {t('Export Excel')}
          </Button>
        </div>

        {/* ---- KPI cards ---- */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('Moyenne générale')}</p>
                <p className="text-2xl font-bold">{globalStats.avg}/20</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <Target className="w-5 h-5 text-green-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('Taux de réussite')}</p>
                <p className="text-2xl font-bold">{globalStats.passRate}%</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Users className="w-5 h-5 text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('Étudiants')}</p>
                <p className="text-2xl font-bold">{globalStats.uniqueStudents}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2 rounded-lg bg-amber-500/10">
                <Clock className="w-5 h-5 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">{t('Corrections en attente')}</p>
                <p className="text-2xl font-bold">{globalStats.pending}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* secondary KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">{t('Meilleure note')}</p>
              <p className="text-xl font-semibold text-green-600">{globalStats.best}/20</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">{t('Plus basse note')}</p>
              <p className="text-xl font-semibold text-red-500">{globalStats.worst}/20</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">{t('Copies notées')}</p>
              <p className="text-xl font-semibold">{globalStats.gradedCount}/{globalStats.total}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <p className="text-xs text-muted-foreground">{t('Épreuves')}</p>
              <p className="text-xl font-semibold">{examStats.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* ---- distribution chart ---- */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              {t('Répartition des Notes')} ({t('sur 20')})
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              {globalStats.gradedCount} {t('copies notées')}
            </p>
          </CardHeader>
          <CardContent>
            {globalStats.gradedCount === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">
                {t('Aucune donnée disponible')}
              </p>
            ) : (
              <div className="flex items-end gap-3 h-48 mt-2">
                {distribution.map((d) => {
                  const maxPct = Math.max(...distribution.map((x) => x.pct), 1);
                  const h = (d.pct / maxPct) * 100;
                  return (
                    <div
                      key={d.label}
                      className="flex-1 flex flex-col items-center gap-1"
                    >
                      <span className="text-xs font-medium">
                        {d.count}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {d.pct}%
                      </span>
                      <div
                        className={`w-full rounded-t-md transition-all ${barColor(d.label)}`}
                        style={{ height: `${Math.max(h, 4)}%` }}
                      />
                      <span className="text-xs text-muted-foreground font-medium">
                        {d.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ---- per-exam table ---- */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <BookOpen className="w-4 h-4" />
              {t('Détail par épreuve')}
            </CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {examStats.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                {t('Aucune épreuve trouvée')}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('Épreuve')}</TableHead>
                    <TableHead>{t('Matière')}</TableHead>
                    <TableHead className="text-center">{t('Copies')}</TableHead>
                    <TableHead className="text-center">{t('Moyenne')}</TableHead>
                    <TableHead className="text-center">{t('Min')}</TableHead>
                    <TableHead className="text-center">{t('Max')}</TableHead>
                    <TableHead className="text-center">{t('Taux de réussite')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {examStats.map((e) => (
                    <TableRow key={e.examId}>
                      <TableCell className="font-medium max-w-[200px] truncate">
                        {e.title}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          style={{
                            borderColor: e.subjectColor,
                            color: e.subjectColor,
                          }}
                        >
                          {e.subjectName}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {e.graded}/{e.submissions}
                      </TableCell>
                      <TableCell className="text-center font-semibold">
                        {e.avg20}/20
                      </TableCell>
                      <TableCell className="text-center text-red-500">
                        {e.min}
                      </TableCell>
                      <TableCell className="text-center text-green-600">
                        {e.max}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Progress
                            value={e.passRate}
                            className="h-2 w-16"
                          />
                          <span
                            className={`text-sm font-medium ${
                              e.passRate >= 50
                                ? 'text-green-600'
                                : 'text-red-500'
                            }`}
                          >
                            {e.passRate}%
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* ---- top students ---- */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Award className="w-4 h-4" />
              {t('Classement des meilleurs étudiants')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {studentRanking.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                {t('Aucune donnée disponible')}
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>{t('Matricule')}</TableHead>
                    <TableHead>{t('Étudiant')}</TableHead>
                    <TableHead className="text-center">{t('Épreuves passées')}</TableHead>
                    <TableHead className="text-center">{t('Moyenne /20')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {studentRanking.map((s, i) => (
                    <TableRow key={s.studentId}>
                      <TableCell>
                        {i < 3 ? (
                          <span
                            className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold text-white ${
                              i === 0
                                ? 'bg-yellow-500'
                                : i === 1
                                ? 'bg-gray-400'
                                : 'bg-amber-700'
                            }`}
                          >
                            {i + 1}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">{i + 1}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {s.studentNumber && (
                          <Badge variant="outline" className="font-mono text-xs">
                            {s.studentNumber}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{s.name}</p>
                          <p className="text-xs text-muted-foreground">{s.email}</p>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">{s.count}</TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`font-semibold ${
                            s.average20 >= 14
                              ? 'text-green-600'
                              : s.average20 >= 10
                              ? 'text-primary'
                              : 'text-red-500'
                          }`}
                        >
                          {s.average20}/20
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Analytics;
