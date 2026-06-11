import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Headphones, Plus, Loader2, Search, Clock, User, MessageSquare, Send, ArrowLeft, Bot, AlertTriangle } from 'lucide-react';
import { useSupportTickets, useTicketMessages, SupportTicket } from '@/hooks/useSupportTickets';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';

const priorityColors: Record<string, string> = {
  low: 'bg-gray-500',
  medium: 'bg-yellow-500',
  high: 'bg-orange-500',
  urgent: 'bg-red-500',
};

const statusColors: Record<string, string> = {
  open: 'bg-blue-500',
  in_progress: 'bg-yellow-500',
  waiting: 'bg-purple-500',
  resolved: 'bg-green-500',
  closed: 'bg-gray-500',
};

export default function Support() {
  const { tickets, loading, createTicket, updateTicket, assignTicket, resolveTicket } = useSupportTickets();
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [admins, setAdmins] = useState<{ id: string; full_name: string }[]>([]);
  const [mobileView, setMobileView] = useState<'list' | 'detail'>('list');
  const isMobile = useIsMobile();
  const [newTicket, setNewTicket] = useState({
    subject: '',
    description: '',
    category: 'general',
    priority: 'medium',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const fetchAdmins = async () => {
      const { data } = await supabase
        .from('system_roles')
        .select('user_id')
        .eq('role', 'admin');
      
      if (data && data.length > 0) {
        const userIds = data.map(d => d.user_id);
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);
        
        setAdmins(profiles || []);
      }
    };
    fetchAdmins();
  }, []);

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          ticket.ticket_number.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || ticket.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || ticket.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const handleCreateTicket = async () => {
    if (!newTicket.subject.trim()) return;
    setIsSubmitting(true);
    await createTicket(newTicket);
    setNewTicket({ subject: '', description: '', category: 'general', priority: 'medium' });
    setCreateDialogOpen(false);
    setIsSubmitting(false);
  };

  const handleSelectTicket = (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    if (isMobile) {
      setMobileView('detail');
    }
  };

  const handleBackToList = () => {
    setMobileView('list');
  };

  // Mobile List View
  const TicketListPanel = () => (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-border space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">Support Tickets</h1>
          <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" />
                New
              </Button>
            </DialogTrigger>
            <DialogContent className="w-[95vw] max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Support Ticket</DialogTitle>
                <DialogDescription>
                  Create a ticket on behalf of a tenant
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    placeholder="Brief description of the issue"
                    value={newTicket.subject}
                    onChange={(e) => setNewTicket({ ...newTicket, subject: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Detailed description..."
                    value={newTicket.description}
                    onChange={(e) => setNewTicket({ ...newTicket, description: e.target.value })}
                    rows={4}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Category</Label>
                    <Select
                      value={newTicket.category}
                      onValueChange={(value) => setNewTicket({ ...newTicket, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General</SelectItem>
                        <SelectItem value="billing">Billing</SelectItem>
                        <SelectItem value="technical">Technical</SelectItem>
                        <SelectItem value="feature_request">Feature Request</SelectItem>
                        <SelectItem value="error_report">Error Report</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Priority</Label>
                    <Select
                      value={newTicket.priority}
                      onValueChange={(value) => setNewTicket({ ...newTicket, priority: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="urgent">Urgent</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setCreateDialogOpen(false)} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button onClick={handleCreateTicket} disabled={isSubmitting || !newTicket.subject.trim()} className="w-full sm:w-auto">
                  {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Create Ticket
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tickets..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="waiting">Waiting</SelectItem>
            <SelectItem value="resolved">Resolved</SelectItem>
            <SelectItem value="closed">Closed</SelectItem>
          </SelectContent>
        </Select>

        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger>
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="general">General</SelectItem>
            <SelectItem value="billing">Billing</SelectItem>
            <SelectItem value="technical">Technical</SelectItem>
            <SelectItem value="feature_request">Feature Request</SelectItem>
            <SelectItem value="error_report">🤖 Error Reports</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="flex-1">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4">
            <Headphones className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">No tickets found</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filteredTickets.map((ticket) => (
              <div
                key={ticket.id}
                className={`p-4 cursor-pointer hover:bg-accent/50 transition-colors ${
                  selectedTicket?.id === ticket.id ? 'bg-accent' : ''
                }`}
                onClick={() => handleSelectTicket(ticket)}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-muted-foreground">
                      {ticket.ticket_number}
                    </span>
                    {ticket.category === 'error_report' && (
                      <Badge variant="secondary" className="flex items-center gap-1 text-xs bg-orange-500/20 text-orange-400 border-orange-500/30">
                        <Bot className="h-3 w-3" />
                        Auto
                      </Badge>
                    )}
                  </div>
                  <Badge variant="outline" className="flex items-center gap-1 text-xs">
                    <span className={`h-1.5 w-1.5 rounded-full ${statusColors[ticket.status]}`} />
                    {ticket.status}
                  </Badge>
                </div>
                <h3 className="font-medium text-sm mb-1 line-clamp-1">{ticket.subject}</h3>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <span className={`h-1.5 w-1.5 rounded-full ${priorityColors[ticket.priority]}`} />
                    {ticket.priority}
                  </span>
                  <span>{format(new Date(ticket.created_at), 'MMM d, HH:mm')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );

  // Mobile Detail View with Back Button
  const TicketDetailPanel = () => (
    <div className="flex flex-col h-full">
      {selectedTicket ? (
        <TicketDetail
          ticket={selectedTicket}
          admins={admins}
          onAssign={assignTicket}
          onResolve={resolveTicket}
          onStatusChange={(status) => updateTicket(selectedTicket.id, { status })}
          onBack={handleBackToList}
          showBackButton={isMobile}
        />
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
          <Headphones className="h-16 w-16 mb-4" />
          <h2 className="text-xl font-semibold mb-2">Select a ticket</h2>
          <p>Choose a ticket from the list to view details</p>
        </div>
      )}
    </div>
  );

  return (
    <AdminLayout>
      {isMobile ? (
        // Mobile: Panel-based navigation
        <div className="h-[calc(100vh-56px)]">
          {mobileView === 'list' ? <TicketListPanel /> : <TicketDetailPanel />}
        </div>
      ) : (
        // Desktop: Side-by-side layout
        <div className="flex h-[calc(100vh-0px)]">
          <div className="w-1/3 border-r border-border flex flex-col">
            <TicketListPanel />
          </div>
          <div className="flex-1 flex flex-col">
            <TicketDetailPanel />
          </div>
        </div>
      )}
    </AdminLayout>
  );
}

function TicketDetail({
  ticket,
  admins,
  onAssign,
  onResolve,
  onStatusChange,
  onBack,
  showBackButton,
}: {
  ticket: SupportTicket;
  admins: { id: string; full_name: string }[];
  onAssign: (ticketId: string, adminId: string) => void;
  onResolve: (ticketId: string) => void;
  onStatusChange: (status: string) => void;
  onBack?: () => void;
  showBackButton?: boolean;
}) {
  const { messages, loading, sendMessage } = useTicketMessages(ticket.id);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);

  const handleSendMessage = async () => {
    if (!newMessage.trim()) return;
    setIsSending(true);
    await sendMessage(newMessage);
    setNewMessage('');
    setIsSending(false);
  };

  return (
    <>
      {/* Header */}
      <div className="p-4 border-b border-border">
        {showBackButton && (
          <Button variant="ghost" size="sm" onClick={onBack} className="mb-3 -ml-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to List
          </Button>
        )}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <span className="text-sm font-mono text-muted-foreground">{ticket.ticket_number}</span>
              <Badge variant="outline" className="flex items-center gap-1">
                <span className={`h-1.5 w-1.5 rounded-full ${priorityColors[ticket.priority]}`} />
                {ticket.priority}
              </Badge>
            </div>
            <h2 className="text-lg sm:text-xl font-bold break-words">{ticket.subject}</h2>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Select value={ticket.status} onValueChange={onStatusChange}>
              <SelectTrigger className="w-[130px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="waiting">Waiting</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
            {ticket.status !== 'resolved' && ticket.status !== 'closed' && (
              <Button variant="outline" size="sm" onClick={() => onResolve(ticket.id)}>
                Resolve
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Tenant:</span>
            <p className="font-medium">{ticket.tenant_name || 'N/A'}</p>
          </div>
          <div>
            <span className="text-muted-foreground">Assigned to:</span>
            <Select
              value={ticket.assigned_to || ''}
              onValueChange={(value) => onAssign(ticket.id, value)}
            >
              <SelectTrigger className="h-8 mt-1">
                <SelectValue placeholder="Unassigned" />
              </SelectTrigger>
              <SelectContent>
                {admins.map((admin) => (
                  <SelectItem key={admin.id} value={admin.id}>
                    {admin.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <span className="text-muted-foreground">Created:</span>
            <p className="font-medium">{format(new Date(ticket.created_at), 'MMM d, yyyy HH:mm')}</p>
          </div>
        </div>

        {ticket.description && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <p className="text-sm">{ticket.description}</p>
          </div>
        )}
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mb-4" />
            <p>No messages yet</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[70%] rounded-lg p-3 ${
                    message.sender_type === 'admin'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  } ${message.is_internal_note ? 'border-2 border-dashed border-yellow-500' : ''}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <User className="h-3 w-3" />
                    <span className="text-xs font-medium">
                      {message.sender_name || 'Unknown'}
                    </span>
                    {message.is_internal_note && (
                      <Badge variant="outline" className="text-xs">Internal</Badge>
                    )}
                  </div>
                  <p className="text-sm">{message.message}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {format(new Date(message.created_at), 'MMM d, HH:mm')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>

      {/* Message Input */}
      <div className="p-4 border-t border-border">
        <div className="flex gap-2">
          <Textarea
            placeholder="Type your reply..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="min-h-[80px]"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
          />
          <Button
            size="icon"
            className="h-[80px] w-[50px] shrink-0"
            onClick={handleSendMessage}
            disabled={isSending || !newMessage.trim()}
          >
            {isSending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
          </Button>
        </div>
      </div>
    </>
  );
}
