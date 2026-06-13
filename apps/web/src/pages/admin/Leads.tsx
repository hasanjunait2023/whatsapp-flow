import { useState } from 'react';
import { format } from 'date-fns';
import { Search, MessageCircle, Mail, Trash2, RefreshCw, Download, Eye, Users, Flame, PhoneCall } from 'lucide-react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminLeads, MarketingLead } from '@/hooks/useAdminLeads';
import { exportToCSV } from '@/lib/csv-export';
import { useIsMobile } from '@/hooks/use-mobile';
import { MobileDataCard } from '@/components/admin/MobileDataCard';
import { LeadDetailsDialog } from '@/components/admin/LeadDetailsDialog';
import { KpiCard } from '@/components/dashboard/bento/KpiCard';
import { LeadsHighlightTile } from '@/components/admin/leads/LeadsHighlightTile';
import { LeadStatusBadge, LeadAvatar } from '@/components/admin/leads/leadStatus';
import { m, pageEnter, staggerContainer, staggerItem } from '@/lib/motion';

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

  // Conversion rate — presentation only, derived from existing stats.
  const conversionRate = stats.total > 0 ? Math.round((stats.converted / stats.total) * 100) : 0;

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
        <div className="flex items-center gap-3">
          <LeadAvatar name={lead.full_name} />
          <div className="space-y-0.5">
            <p className="font-medium text-foreground">{lead.full_name}</p>
            <p className="text-xs text-muted-foreground">{lead.business_name}</p>
          </div>
        </div>
      }
      fields={[
        {
          key: 'phone',
          label: 'Phone',
          render: (data) => <span className="text-xs tabular-nums">{data.whatsapp_number}</span>,
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
              <SelectTrigger className="h-9 w-auto gap-2 border-0 bg-transparent px-1 shadow-none focus:ring-0">
                <LeadStatusBadge status={data.status} />
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
              <MessageCircle className="h-4 w-4 text-whatsapp" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => handleEmail(lead.email)}
            >
              <Mail className="h-4 w-4 text-info" />
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
      <m.div
        variants={pageEnter}
        initial="hidden"
        animate="show"
        className="mx-auto w-full max-w-[1440px] space-y-6 p-4 md:p-6"
      >
        <header className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">Marketing Leads</h1>
          <p className="text-sm text-muted-foreground">Manage demo requests and potential customers</p>
        </header>

        {/* KPI strip — 3 stat cards + the ONE orange conversion tile */}
        <m.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4"
        >
          <KpiCard
            title="Total leads"
            value={stats.total}
            icon={Users}
            tone="info"
            loading={isLoading}
          />
          <KpiCard
            title="Hot"
            value={stats.hot}
            icon={Flame}
            tone="warning"
            trendLabel={`${stats.warm} warm`}
            loading={isLoading}
          />
          <KpiCard
            title="Contacted"
            value={stats.contacted}
            icon={PhoneCall}
            tone="primary"
            trendLabel={`${stats.lost} lost`}
            loading={isLoading}
          />
          <m.div variants={staggerItem}>
            <LeadsHighlightTile
              conversionRate={conversionRate}
              converted={stats.converted}
              loading={isLoading}
            />
          </m.div>
        </m.div>

        {/* Filters */}
        <Card className="rounded-card shadow-elevation-1">
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
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="icon" onClick={refetch} className="min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0" aria-label="Refresh leads">
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button variant="outline" onClick={handleExport} className="min-h-[44px] gap-2 sm:min-h-0">
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
                  [...Array(4)].map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-card" />)
                ) : filteredLeads.length === 0 ? (
                  <EmptyState
                    icon={Users}
                    title="No leads found"
                    description="No leads match your current search or filter."
                    className="py-12"
                  />
                ) : (
                  filteredLeads.map(renderLeadCard)
                )}
              </div>
            ) : isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : filteredLeads.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No leads found"
                description="No leads match your current search or filter."
                className="py-12"
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Business</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLeads.map((lead) => (
                    <TableRow key={lead.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <LeadAvatar name={lead.full_name} />
                          <div className="min-w-0">
                            <p className="font-medium text-foreground">{lead.full_name}</p>
                            <p className="truncate text-xs text-muted-foreground">{lead.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm tabular-nums">{lead.whatsapp_number}</TableCell>
                      <TableCell className="text-sm">{lead.business_name}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleWhatsApp(lead.whatsapp_number)}
                            aria-label={`WhatsApp ${lead.full_name}`}
                          >
                            <MessageCircle className="h-4 w-4 text-whatsapp" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleEmail(lead.email)}
                            aria-label={`Email ${lead.full_name}`}
                          >
                            <Mail className="h-4 w-4 text-info" />
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Select
                          value={lead.status}
                          onValueChange={(value) => updateLeadStatus(lead.id, value as MarketingLead['status'])}
                        >
                          <SelectTrigger className="h-9 w-auto gap-2 border-0 bg-transparent px-1 shadow-none focus:ring-0">
                            <LeadStatusBadge status={lead.status} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="warm">Warm</SelectItem>
                            <SelectItem value="hot">Hot</SelectItem>
                            <SelectItem value="contacted">Contacted</SelectItem>
                            <SelectItem value="converted">Converted</SelectItem>
                            <SelectItem value="lost">Lost</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground tabular-nums">
                        {format(new Date(lead.created_at), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openDetailsDialog(lead)}
                            aria-label={`View details for ${lead.full_name}`}
                          >
                            <Eye className="h-4 w-4 text-primary" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" aria-label={`Delete ${lead.full_name}`}>
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
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
      </m.div>
    </AdminLayout>
  );
}
