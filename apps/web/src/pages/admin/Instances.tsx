import { useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { useAdminInstances } from '@/hooks/useAdminInstances';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { RefreshCw, Search, Smartphone, MessageSquare } from 'lucide-react';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileDataCard } from '@/components/admin/MobileDataCard';

const statusColors: Record<string, string> = {
  active: 'bg-green-500/10 text-green-500 border-green-500/20',
  disconnected: 'bg-muted text-muted-foreground',
  pending: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  error: 'bg-red-500/10 text-red-500 border-red-500/20',
};

export default function AdminInstances() {
  const { instances, loading, refetch } = useAdminInstances();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const isMobile = useIsMobile();

  const filteredInstances = instances.filter(instance => {
    const matchesSearch = 
      instance.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      instance.phone_number?.includes(searchQuery) ||
      instance.tenant_name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || instance.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const statuses = [...new Set(instances.map(i => i.status))];

  // Mobile instance card renderer
  const renderInstanceCard = (instance: typeof instances[0]) => (
    <MobileDataCard
      key={instance.id}
      data={instance}
      header={
        <div className="space-y-1">
          <p className="font-medium">{instance.name}</p>
          <p className="text-xs text-muted-foreground">
            {instance.phone_number || 'No phone connected'}
          </p>
        </div>
      }
      fields={[
        {
          key: 'tenant_name',
          label: 'Tenant',
          render: (data) => data.tenant_name,
        },
        {
          key: 'status',
          label: 'Status',
          render: (data) => (
            <Badge 
              variant="outline" 
              className={`capitalize ${statusColors[data.status] || statusColors.disconnected}`}
            >
              {data.status}
            </Badge>
          ),
        },
        {
          key: 'message_count',
          label: 'Messages',
          render: (data) => (
            <div className="flex items-center gap-1">
              <MessageSquare className="h-3 w-3 text-muted-foreground" />
              <span>{data.message_count.toLocaleString()}</span>
            </div>
          ),
        },
      ]}
    />
  );

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-xl md:text-2xl font-bold text-foreground">WhatsApp</h1>
            <p className="text-muted-foreground text-sm">Monitor all WhatsApp connections across tenants</p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-3 md:gap-4 grid-cols-2 md:grid-cols-4">
          <Card>
            <CardContent className="pt-4 md:pt-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Smartphone className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xl md:text-2xl font-bold">{instances.length}</p>
                  <p className="text-xs md:text-sm text-muted-foreground">Total WhatsApp</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 md:pt-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="p-2 rounded-lg bg-green-500/10">
                  <Smartphone className="h-4 w-4 md:h-5 md:w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-xl md:text-2xl font-bold">
                    {instances.filter(i => i.status === 'active').length}
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 md:pt-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="p-2 rounded-lg bg-yellow-500/10">
                  <Smartphone className="h-4 w-4 md:h-5 md:w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-xl md:text-2xl font-bold">
                    {instances.filter(i => i.status === 'pending').length}
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 md:pt-6">
              <div className="flex items-center gap-3 md:gap-4">
                <div className="p-2 rounded-lg bg-muted">
                  <Smartphone className="h-4 w-4 md:h-5 md:w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xl md:text-2xl font-bold">
                    {instances.filter(i => i.status === 'disconnected').length}
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground">Disconnected</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, phone, or tenant..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  {statuses.map(status => (
                    <SelectItem key={status} value={status} className="capitalize">
                      {status}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredInstances.length === 0 ? (
              <div className="text-center py-12">
                <Smartphone className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg">No WhatsApp found</h3>
                <p className="text-muted-foreground">
                  {searchQuery || statusFilter !== 'all'
                    ? 'Try adjusting your filters'
                    : 'No WhatsApp connections in the system'}
                </p>
              </div>
            ) : isMobile ? (
              // Mobile: Card-based list
              <div className="space-y-3">
                {filteredInstances.map(renderInstanceCard)}
              </div>
            ) : (
              // Desktop: Table
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left p-4 font-medium">WhatsApp</th>
                      <th className="text-left p-4 font-medium">Tenant</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-right p-4 font-medium">Messages</th>
                      <th className="text-left p-4 font-medium">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredInstances.map((instance) => (
                      <tr key={instance.id} className="border-b">
                        <td className="p-4">
                          <div>
                            <p className="font-medium">{instance.name}</p>
                            <p className="text-sm text-muted-foreground">
                              {instance.phone_number || 'No phone connected'}
                            </p>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className="font-medium">{instance.tenant_name}</span>
                        </td>
                        <td className="p-4">
                          <Badge 
                            variant="outline" 
                            className={`capitalize ${statusColors[instance.status] || statusColors.disconnected}`}
                          >
                            {instance.status}
                          </Badge>
                        </td>
                        <td className="p-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <MessageSquare className="h-3 w-3 text-muted-foreground" />
                            <span>{instance.message_count.toLocaleString()}</span>
                          </div>
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {format(new Date(instance.created_at), 'MMM d, yyyy')}
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
