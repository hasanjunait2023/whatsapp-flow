import { useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { useAdminAuditLogs } from '@/hooks/useAdminAuditLogs';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Search, FileText, Download } from 'lucide-react';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileDataCard } from '@/components/admin/MobileDataCard';

const ACTION_COLORS: Record<string, string> = {
  create: 'bg-green-500/10 text-green-500 border-green-500/20',
  update: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  delete: 'bg-red-500/10 text-red-500 border-red-500/20',
  verify: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
  reject: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
  grant: 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20',
  revoke: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
};

export default function AdminAuditLogs() {
  const { logs, loading, refetch } = useAdminAuditLogs();
  const [searchQuery, setSearchQuery] = useState('');
  const [entityFilter, setEntityFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const isMobile = useIsMobile();

  const entityTypes = [...new Set(logs.map(l => l.entity_type))];
  const actionTypes = [...new Set(logs.map(l => l.action))];

  const filteredLogs = logs.filter(log => {
    const matchesSearch = 
      log.admin_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.admin_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.entity_type.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesEntity = entityFilter === 'all' || log.entity_type === entityFilter;
    const matchesAction = actionFilter === 'all' || log.action === actionFilter;
    
    return matchesSearch && matchesEntity && matchesAction;
  });

  const getActionColor = (action: string) => {
    const lowerAction = action.toLowerCase();
    for (const [key, value] of Object.entries(ACTION_COLORS)) {
      if (lowerAction.includes(key)) return value;
    }
    return 'bg-muted text-muted-foreground';
  };

  const exportToCSV = () => {
    const headers = ['Date', 'Admin', 'Action', 'Entity Type', 'Entity ID', 'Details'];
    const rows = filteredLogs.map(log => [
      format(new Date(log.created_at), 'yyyy-MM-dd HH:mm:ss'),
      log.admin_email || 'Unknown',
      log.action,
      log.entity_type,
      log.entity_id || '',
      JSON.stringify(log.details),
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  // Mobile log card renderer
  const renderLogCard = (log: typeof logs[0]) => (
    <MobileDataCard
      key={log.id}
      data={log}
      header={
        <div className="space-y-1">
          <p className="font-medium text-sm">{log.admin_name || 'Unknown'}</p>
          <p className="text-xs text-muted-foreground">{log.admin_email}</p>
        </div>
      }
      fields={[
        {
          key: 'action',
          label: 'Action',
          render: (data) => (
            <Badge variant="outline" className={getActionColor(data.action)}>
              {data.action}
            </Badge>
          ),
        },
        {
          key: 'entity_type',
          label: 'Entity',
          render: (data) => data.entity_type,
        },
        {
          key: 'created_at',
          label: 'Time',
          render: (data) => format(new Date(data.created_at), 'MMM d, HH:mm'),
        },
      ]}
    />
  );

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">Audit Logs</h1>
            <p className="text-muted-foreground text-sm">Track all administrative actions</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportToCSV} disabled={filteredLogs.length === 0} className="flex-1 sm:flex-none">
              <Download className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Export CSV</span>
            </Button>
            <Button variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by admin, action, or entity..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={entityFilter} onValueChange={setEntityFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Entity Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Entities</SelectItem>
                    {entityTypes.map(type => (
                      <SelectItem key={type} value={type}>{type}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    {actionTypes.map(action => (
                      <SelectItem key={action} value={action}>{action}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg">No audit logs found</h3>
                <p className="text-muted-foreground">
                  {searchQuery || entityFilter !== 'all' || actionFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'Admin actions will appear here'}
                </p>
              </div>
            ) : isMobile ? (
              // Mobile: Card-based list
              <div className="space-y-3">
                {filteredLogs.map(renderLogCard)}
              </div>
            ) : (
              // Desktop: Table
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left p-4 font-medium">Timestamp</th>
                      <th className="text-left p-4 font-medium">Admin</th>
                      <th className="text-left p-4 font-medium">Action</th>
                      <th className="text-left p-4 font-medium">Entity</th>
                      <th className="text-left p-4 font-medium">Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((log) => (
                      <tr key={log.id} className="border-b">
                        <td className="p-4 text-sm text-muted-foreground whitespace-nowrap">
                          {format(new Date(log.created_at), 'MMM d, yyyy HH:mm')}
                        </td>
                        <td className="p-4">
                          <div>
                            <p className="font-medium text-sm">
                              {log.admin_name || 'Unknown'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {log.admin_email}
                            </p>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge 
                            variant="outline" 
                            className={getActionColor(log.action)}
                          >
                            {log.action}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <div>
                            <p className="text-sm font-medium">{log.entity_type}</p>
                            {log.entity_id && (
                              <p className="text-xs text-muted-foreground font-mono">
                                {log.entity_id.slice(0, 8)}...
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="p-4 max-w-[200px]">
                          {Object.keys(log.details).length > 0 ? (
                            <pre className="text-xs text-muted-foreground overflow-hidden text-ellipsis">
                              {JSON.stringify(log.details, null, 0).slice(0, 50)}
                              {JSON.stringify(log.details).length > 50 ? '...' : ''}
                            </pre>
                          ) : (
                            <span className="text-muted-foreground text-sm">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
