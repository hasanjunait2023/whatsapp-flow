import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, MessageSquare, Smartphone } from 'lucide-react';

interface TopTenant {
  id: string;
  name: string;
  owner_email: string;
  subscription_status: string;
  message_count: number;
  instance_count: number;
}

interface TopTenantsTableProps {
  tenants: TopTenant[];
}

const statusColors: Record<string, string> = {
  active: 'bg-green-500/10 text-green-500 border-green-500/20',
  trialing: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  suspended: 'bg-red-500/10 text-red-500 border-red-500/20',
  cancelled: 'bg-muted text-muted-foreground',
};

export function TopTenantsTable({ tenants }: TopTenantsTableProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Top Tenants by Activity</CardTitle>
            <CardDescription>Highest usage workspaces this month</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {tenants.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No tenant data available</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Workspace</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Messages</TableHead>
                <TableHead className="text-right">Instances</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.slice(0, 5).map((tenant) => (
                <TableRow key={tenant.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{tenant.name}</p>
                      <p className="text-xs text-muted-foreground">{tenant.owner_email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="outline" 
                      className={statusColors[tenant.subscription_status] || statusColors.cancelled}
                    >
                      {tenant.subscription_status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <MessageSquare className="h-3 w-3 text-muted-foreground" />
                      <span>{tenant.message_count.toLocaleString()}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Smartphone className="h-3 w-3 text-muted-foreground" />
                      <span>{tenant.instance_count}</span>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
