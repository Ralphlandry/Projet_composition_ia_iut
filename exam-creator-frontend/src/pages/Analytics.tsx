import { useEffect, useState } from 'react';
import { Download, TrendingUp } from 'lucide-react';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { supabase } from '@/lib/backendClient';
import { toast } from 'sonner';

interface GradeDistribution {
  range: string;
  count: number;
  percentage: number;
}

const Analytics = () => {
  const [stats, setStats] = useState({
    averageScore: 0,
    participation: 95,
    bestScore: 0,
    bestStudent: '',
    totalStudents: 0,
  });
  const [gradeDistribution, setGradeDistribution] = useState<GradeDistribution[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const { data: submissions } = await supabase
        .from('submissions')
        .select('score, student_id')
        .not('score', 'is', null);

      if (submissions && submissions.length > 0) {
        const scores = submissions.map(s => s.score || 0);
        const total = scores.reduce((a, b) => a + b, 0);
        const avg = total / scores.length;
        const best = Math.max(...scores);

        setStats({
          averageScore: Math.round(avg * 10) / 10,
          participation: 95,
          bestScore: best,
          bestStudent: 'Meilleur étudiant',
          totalStudents: submissions.length,
        });

        const ranges = [
          { range: '0-4', min: 0, max: 4 },
          { range: '5-8', min: 5, max: 8 },
          { range: '9-12', min: 9, max: 12 },
          { range: '13-16', min: 13, max: 16 },
          { range: '17-20', min: 17, max: 20 },
        ];

        const distribution = ranges.map(r => {
          const count = scores.filter(s => s >= r.min && s <= r.max).length;
          return {
            range: r.range,
            count,
            percentage: Math.round((count / scores.length) * 100),
          };
        });
        setGradeDistribution(distribution);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = async () => {
    try {
      const { data: submissions } = await supabase
        .from('submissions')
        .select('score, submitted_at, exam_id, student_id')
        .not('score', 'is', null);

      if (!submissions || submissions.length === 0) {
        toast.error('Aucune donnée à exporter');
        return;
      }

      let csv = 'Étudiant ID,Épreuve ID,Note,Date\n';
      submissions.forEach(s => {
        csv += `"${s.student_id}","${s.exam_id}",${s.score},${s.submitted_at || ''}\n`;
      });

      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `rapport_notes_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      
      toast.success('Export réussi');
    } catch (error) {
      toast.error('Erreur lors de l\'export');
    }
  };

  const getBarColor = (range: string) => {
    if (range === '17-20') return 'bg-success';
    if (range === '13-16') return 'bg-primary';
    return 'bg-primary/70';
  };

  return (
    <AppLayout title="Rapports et Analyses">
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-wrap gap-2">
          <Select defaultValue="all">
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Classe" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportToExcel} className="ml-auto">
            <Download className="w-4 h-4 mr-2" />
            Export Excel
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Score Moyen</p>
              <p className="text-4xl font-bold text-foreground">{stats.averageScore}/20</p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">Participation</p>
              <p className="text-4xl font-bold text-foreground">{stats.participation}%</p>
            </CardContent>
          </Card>
        </div>

        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-base font-semibold">Répartition des Notes</CardTitle>
            <p className="text-sm text-muted-foreground">{stats.totalStudents} Étudiants</p>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-32 mt-4">
              {gradeDistribution.map((dist) => (
                <div key={dist.range} className="flex-1 flex flex-col items-center gap-1">
                  <div 
                    className={`w-full rounded-t transition-all ${getBarColor(dist.range)}`}
                    style={{ height: `${Math.max(dist.percentage, 10)}%` }}
                  />
                  <span className="text-xs text-muted-foreground">{dist.range}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Analytics;
