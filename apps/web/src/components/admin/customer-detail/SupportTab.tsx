import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { HelpCircle, CheckCircle2, Clock, AlertTriangle, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import type { CustomerTicket } from '@/hooks/useCustomerDetails';

interface SupportTabProps {
  tickets: CustomerTicket[];
  tenantId: string;
}

const getStatusBadge = (status: string) => {
  switch (status) {
    case 'open':
      return <Badge variant="outline" className="text-blue-600 border-blue-600">Open</Badge>;
    case 'in_progress':
      return <Badge variant="outline" className="text-yellow-600 border-yellow-600">In Progress</Badge>;
    case 'resolved':
      return <Badge className="bg-success">Resolved</Badge>;
    case 'closed':
      return <Badge variant="secondary">Closed</Badge>;
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
};

const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return <Badge variant="destructive">Urgent</Badge>;
    case 'high':
      return <Badge className="bg-orange-500">High</Badge>;
    case 'medium':
      return <Badge variant="outline">Medium</Badge>;
    case 'low':
      return <Badge variant="secondary">Low</Badge>;
    default:
      return <Badge variant="secondary">{priority}</Badge>;
  }
};

export function SupportTab({ tickets, tenantId }: SupportTabProps) {
  const navigate = useNavigate();

  const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'in_progress');
  const resolvedTickets = tickets.filter(t => t.status === 'resolved' || t.status === 'closed');

  if (tickets.length === 0) {
    return (
      <div className="text-center py-12">
        <HelpCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="font-medium text-lg">No Support Tickets</h3>
        <p className="text-muted-foreground mb-4">This customer hasn't submitted any support tickets yet.</p>
        <Button onClick={() => navigate('/admin/support')}>
          <Plus className="h-4 w-4 mr-2" />
          Create Ticket
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Support Overview */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Clock className="h-8 w-8 mx-auto text-blue-500 mb-2" />
              <p className="text-2xl font-bold text-blue-600">{openTickets.length}</p>
              <p className="text-sm text-muted-foreground">Open</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <CheckCircle2 className="h-8 w-8 mx-auto text-green-500 mb-2" />
              <p className="text-2xl font-bold text-green-600">{resolvedTickets.length}</p>
              <p className="text-sm text-muted-foreground">Resolved</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <AlertTriangle className="h-8 w-8 mx-auto text-yellow-500 mb-2" />
              <p className="text-2xl font-bold">{tickets.filter(t => t.priority === 'urgent' || t.priority === 'high').length}</p>
              <p className="text-sm text-muted-foreground">High Priority</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tickets Table */}
      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Tickets</CardTitle>
          <Button variant="outline" size="sm" onClick={() => navigate('/admin/support')}>
            View All
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tickets.slice(0, 10).map((ticket) => (
                <TableRow 
                  key={ticket.id} 
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => navigate(`/admin/support?ticket=${ticket.id}`)}
                >
                  <TableCell className="font-medium">{ticket.ticket_number}</TableCell>
                  <TableCell className="max-w-[200px] truncate">{ticket.subject}</TableCell>
                  <TableCell>{getPriorityBadge(ticket.priority)}</TableCell>
                  <TableCell>{getStatusBadge(ticket.status)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {format(new Date(ticket.created_at), 'MMM d, yyyy')}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
