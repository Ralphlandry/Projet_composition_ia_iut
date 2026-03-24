import { useEffect, useState } from 'react';
import { Shield, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AuditLogEntry, supabase } from '@/lib/backendClient';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from 'sonner';

const PAGE_SIZE = 50;

const ACTION_COLORS: Record<string, string> = {
  insert: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  update: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  delete: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
};

const AdminAuditLogs = () => {
  const { t } = useLanguage();
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [tableFilter, setTableFilter] = useState('');
  const [search, setSearch] = useState('');

  const load = async (currentPage = page, tbl = tableFilter) => {
    setLoading(true);
    const { data, error } = await supabase.auth.adminGetAuditLogs({
      limit: PAGE_SIZE,
      offset: currentPage * PAGE_SIZE,
      table_name: tbl || undefined,
    });
    setLoading(false);
    if (error || !data) {
      toast.error('Erreur lors du chargement des logs');
      return;
    }
    setLogs(data.logs);
    setTotal(data.total);
  };

  useEffect(() => {
    load(0, tableFilter);
    setPage(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableFilter]);

  useEffect(() => {
    load(page, tableFilter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const filteredLogs = search
    ? logs.filter(
        (l) =>
          l.user_email?.toLowerCase().includes(search.toLowerCase()) ||
          l.table_name.toLowerCase().includes(search.toLowerCase()) ||
          l.action.toLowerCase().includes(search.toLowerCase()) ||
          l.ip_address?.includes(search)
      )
    : logs;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <AppLayout title="Journal d'audit">
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">{t('Journal d\'audit')}</h1>
              <p className="text-sm text-muted-foreground">{total} {t('entrées')}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => load(page, tableFilter)} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            {t('Actualiser')}
          </Button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder={t('Rechercher par email, IP, table…')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="sm:max-w-xs"
          />
          <Select value={tableFilter || 'all'} onValueChange={(v) => setTableFilter(v === 'all' ? '' : v)}>
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="Toutes les tables" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('Toutes les tables')}</SelectItem>
              {['exams', 'submissions', 'answers', 'exam_questions', 'profiles', 'user_roles', 'notifications', 'classes'].map((t) => (
                <SelectItem key={t} value={t}>{t}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Table */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{t('Événements récents')}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t('Date')}</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t('Action')}</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t('Table')}</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t('Utilisateur')}</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t('IP')}</th>
                    <th className="text-left px-4 py-3 font-medium text-muted-foreground">{t('Détails')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    if (loading) {
                      return (
                        <tr>
                          <td colSpan={6} className="text-center py-10 text-muted-foreground">{t('Chargement...')}</td>
                        </tr>
                      );
                    }
                    if (filteredLogs.length === 0) {
                      return (
                        <tr>
                          <td colSpan={6} className="text-center py-10 text-muted-foreground">{t('Aucun événement trouvé')}</td>
                        </tr>
                      );
                    }
                    return filteredLogs.map((log) => (
                      <tr key={log.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                        <td className="px-4 py-3 whitespace-nowrap text-muted-foreground font-mono text-xs">
                          {log.created_at ? new Date(log.created_at).toLocaleString('fr-FR') : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${ACTION_COLORS[log.action] ?? ''}`}>
                            {log.action.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="font-mono text-xs">{log.table_name}</Badge>
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {log.user_email ?? <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                          {log.ip_address ?? '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground max-w-xs truncate" title={log.changes ?? ''}>
                          {log.changes ?? '—'}
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">
              Page {page + 1} / {totalPages}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>
                <ChevronLeft className="h-4 w-4" />
                {t('Précédent')}
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>
                {t('Suivant')}
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default AdminAuditLogs;
