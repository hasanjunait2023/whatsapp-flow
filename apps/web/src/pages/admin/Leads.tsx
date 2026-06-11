import { useState } from 'react';
import { format } from 'date-fns';
import { Search, MessageCircle, Mail, Trash2, StickyNote, RefreshCw, Download, Eye, Phone } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { PageHeader } from '@/components/ui/page-header';
import { StatCard } from '@/components/ui/stat-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useAdminLeads, MarketingLead } from '@/hooks/useAdminLeads';
import { exportToCSV } from '@/lib/csv-export';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileDataCard } from '@/components/admin/MobileDataCard';
import { LeadDetailsDialog } from '@/components/admin/LeadDetailsDialog';
const statusColors: Record<string, string> = {
  warm: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  hot: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  contacted: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  converted: 'bg-green-500/10 text-green-600 border-green-500/20',
  lost: 'bg-red-500/10 text-red-600 border-red-500/20',
};

export default function AdminLeads() {
  const { leads, isLoading, stats, refetch, updateLeadStatus, updateLeadNotes, deleteLead } = useAdminLeads();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [notesDialogOpen, setNotesDialogOpen] = useState(false);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<MarketingLead | null>(null);
  const [notes, setNotes] = useState('');
  const isMobile = useIsMobile();

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.full_name.toLowerCase().includes(search.toLowerCase()) ||
      lead.business_name.toLowerCase().includes(search.toLowerCase()) ||
      lead.email.toLowerCase().includes(search.toLowerCase()) ||
      lead.whatsapp_number.includes(search);
    
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const handleWhatsApp = (number: string) => {
    const formatted = number.replace(/\D/g, '');
    const withCountry = formatted.startsWith('0') ? `88${formatted}` : formatted;
    window.open(`https://wa.me/${withCountry}`, '_blank');
  };

  const handleEmail = (email: string) => {
    window.open(`mailto:${email}`, '_blank');
  };

  const handleExport = () => {
    const columns = [
      { key: 'full_name', header: 'Name' },
      { key: 'whatsapp_number', header: 'WhatsApp' },
      { key: 'email', header: 'Email' },
      { key: 'business_name', header: 'Business' },
      { key: 'status', header: 'Status' },
      { key: 'notes', header: 'Notes' },
      { key: 'created_at', header: 'Created At', formatter: (val: unknown) => val ? format(new Date(val as string), 'yyyy-MM-dd HH:mm') : '' },
    ];
    exportToCSV(filteredLeads, columns, `marketing-leads-${format(new Date(), 'yyyy-MM-dd')}`);
  };

  const openNotesDialog = (lead: MarketingLead) => {
    setSelectedLead(lead);
    setNotes(lead.notes || '');
    setNotesDialogOpen(true);
  };

  const openDetailsDialog = (lead: MarketingLead) => {
    setSelectedLead(lead);
    setDetailsDialogOpen(true);
  };

  const saveNotes = async () => {
    if (selectedLead) {
      await updateLeadNotes(selectedLead.id, notes);
      setNotesDialogOpen(false);
    }
  };

  // Mobile lead card renderer
  const renderLeadCard = (lead: MarketingLead) => (
    <MobileDataCard
      key={lead.id}
      data={lead}
      header={
        <div className="space-y-1">
          <p className="font-medium">{lead.full_name}</p>
          <p className="text-xs text-muted-foreground">{lead.business_name}</p>
        </div>
      }
      fields={[
        {
          key: 'phone',
          label: 'Phone',
          render: (data) => <span className="text-xs">{data.whatsapp_number}</span>,
        },
        {
          key: 'email',
          label: 'Email',
          render: (data) => <span className="text-xs truncate max-w-[150px] block">{data.email}</span>,
        },
        {
          key: 'status',
          label: 'Status',
          render: (data) => (
            <Select
              value={data.status}
              onValueChange={(value) => updateLeadStatus(data.id, value as MarketingLead['status'])}
            >
              <SelectTrigger className="h-7 w-[100px]">
                <Badge variant="outline" className={`${statusColors[data.status]} text-xs`}>
                  {data.status}
                </Badge>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="warm">Warm</SelectItem>
                <SelectItem value="hot">Hot</SelectItem>
                <SelectItem value="contacted">Contacted</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
                <SelectItem value="lost">Lost</SelectItem>
              </SelectContent>
            </Select>
          ),
        },
      ]}
      footer={
        <div className="flex items-center justify-between">
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => openDetailsDialog(lead)}
            >
              <Eye className="h-4 w-4 text-primary" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleWhatsApp(lead.whatsapp_number)}
            >
              <MessageCircle className="h-4 w-4 text-green-600" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleEmail(lead.email)}
            >
              <Mail className="h-4 w-4 text-blue-600" />
            </Button>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                <Trash2 className="h-4 w-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent className="w-[95vw] max-w-md">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Lead?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete {lead.full_name}'s lead data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-col sm:flex-row gap-2">
                <AlertDialogCancel className="w-full sm:w-auto">Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteLead(lead.id)} className="w-full sm:w-auto">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      }
    />
  );

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6">
        <PageHeader
          title="Marketing Leads"
          description="Manage demo requests and potential customers"
        />

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3 md:gap-4">
          <StatCard title="Total Leads" value={stats.total} />
          <StatCard title="Warm" value={stats.warm} className="border-l-4 border-l-yellow-500" />
          <StatCard title="Hot" value={stats.hot} className="border-l-4 border-l-orange-500" />
          <StatCard title="Contacted" value={stats.contacted} className="border-l-4 border-l-blue-500" />
          <StatCard title="Converted" value={stats.converted} className="border-l-4 border-l-green-500" />
          <StatCard title="Lost" value={stats.lost} className="border-l-4 border-l-red-500" />
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search leads..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[140px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="warm">Warm</SelectItem>
                    <SelectItem value="hot">Hot</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="icon" onClick={refetch}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={handleExport} className="gap-2">
                  <Download className="h-4 w-4" />
                  <span className="hidden sm:inline">Export</span>
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isMobile ? (
              // Mobile: Card-based list
              <div className="space-y-3">
                {isLoading ? (
                  <p className="text-center py-8 text-muted-foreground">Loading...</p>
                ) : filteredLeads.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">No leads found</p>
                ) : (
                  filteredLeads.map(renderLeadCard)
                )}
              </div>
            ) : (
              // Desktop: Table
              <div className="rounded-md border">
                <table className="w-full">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left p-4 font-medium">Name</th>
                      <th className="text-left p-4 font-medium">Phone</th>
                      <th className="text-left p-4 font-medium">Business</th>
                      <th className="text-left p-4 font-medium">Contact</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-left p-4 font-medium">Date</th>
                      <th className="text-right p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-muted-foreground">
                          Loading...
                        </td>
                      </tr>
                    ) : filteredLeads.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-8 text-muted-foreground">
                          No leads found
                        </td>
                      </tr>
                    ) : (
                      filteredLeads.map((lead) => (
                        <tr key={lead.id} className="border-b">
                          <td className="p-4">
                            <div>
                              <p className="font-medium">{lead.full_name}</p>
                              <p className="text-xs text-muted-foreground">{lead.email}</p>
                            </div>
                          </td>
                          <td className="p-4 text-sm">{lead.whatsapp_number}</td>
                          <td className="p-4">{lead.business_name}</td>
                          <td className="p-4">
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleWhatsApp(lead.whatsapp_number)}
                              >
                                <MessageCircle className="h-4 w-4 text-green-600" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEmail(lead.email)}
                              >
                                <Mail className="h-4 w-4 text-blue-600" />
                              </Button>
                            </div>
                          </td>
                          <td className="p-4">
                            <Select
                              value={lead.status}
                              onValueChange={(value) => updateLeadStatus(lead.id, value as MarketingLead['status'])}
                            >
                              <SelectTrigger className="w-[120px] h-8">
                                <Badge variant="outline" className={statusColors[lead.status]}>
                                  {lead.status}
                                </Badge>
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="warm">Warm</SelectItem>
                                <SelectItem value="hot">Hot</SelectItem>
                                <SelectItem value="contacted">Contacted</SelectItem>
                                <SelectItem value="converted">Converted</SelectItem>
                                <SelectItem value="lost">Lost</SelectItem>
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-4 text-muted-foreground text-sm">
                            {format(new Date(lead.created_at), 'dd MMM yyyy')}
                          </td>
                          <td className="p-4 text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => openDetailsDialog(lead)}
                                title="View Details"
                              >
                                <Eye className="h-4 w-4 text-primary" />
                              </Button>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Delete Lead?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This will permanently delete {lead.full_name}'s lead data.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => deleteLead(lead.id)}>
                                      Delete
                                    </AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notes Dialog */}
        <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
          <DialogContent className="w-[95vw] max-w-md">
            <DialogHeader>
              <DialogTitle>Notes for {selectedLead?.full_name}</DialogTitle>
            </DialogHeader>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add notes about this lead..."
              rows={4}
            />
            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button variant="outline" onClick={() => setNotesDialogOpen(false)} className="w-full sm:w-auto">Cancel</Button>
              <Button onClick={saveNotes} className="w-full sm:w-auto">Save Notes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Lead Details Dialog */}
        <LeadDetailsDialog
          lead={selectedLead}
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
          onWhatsApp={handleWhatsApp}
          onEmail={handleEmail}
        />
      </div>
    </AdminLayout>
  );
}
