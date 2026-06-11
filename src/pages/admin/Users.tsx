import { useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { useAdminUsers } from '@/hooks/useAdminUsers';
import { useAdminCustomers, type AdminCustomer } from '@/hooks/useAdminCustomers';
import { useAdminPermissions } from '@/hooks/useAdminPermissions';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AdminRequestDialog } from '@/components/admin/AdminRequestDialog';
import { ResponsivePageHeader } from '@/components/admin/ResponsivePageHeader';
import { MobileDataCard } from '@/components/admin/MobileDataCard';
import { CustomerDetailSheet } from '@/components/admin/CustomerDetailSheet';
import { RefreshCw, Search, Users, MoreHorizontal, Shield, Eye, MessageSquare, Phone, CheckCircle2, XCircle } from 'lucide-react';
import { format } from 'date-fns';
import { useIsMobile } from '@/hooks/use-mobile';

export default function AdminUsers() {
  const { users, loading, refetch } = useAdminUsers();
  const { customers, loading: customersLoading, refetch: refetchCustomers } = useAdminCustomers();
  const { isSuperAdmin } = useAdminPermissions();
  const [searchQuery, setSearchQuery] = useState('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<typeof users[0] | null>(null);
  const [requestDialogUser, setRequestDialogUser] = useState<typeof users[0] | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<AdminCustomer | null>(null);
  const [activeTab, setActiveTab] = useState('admins');
  const isMobile = useIsMobile();

  const filteredUsers = users.filter(user => 
    user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredCustomers = customers.filter(customer => 
    customer.email?.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
    customer.full_name?.toLowerCase().includes(customerSearchQuery.toLowerCase()) ||
    customer.phone_number?.includes(customerSearchQuery) ||
    customer.tenant_name.toLowerCase().includes(customerSearchQuery.toLowerCase())
  );

  const UserCard = ({ user }: { user: typeof users[0] }) => (
    <MobileDataCard
      data={user}
      onClick={() => setSelectedUser(user)}
      header={
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.avatar_url || ''} />
            <AvatarFallback>
              {user.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-medium truncate">{user.full_name || 'Unknown'}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>
        </div>
      }
      fields={[
        {
          key: 'role',
          label: 'Role',
          render: () => user.is_admin ? (
            <Badge className="bg-destructive/10 text-destructive border-destructive/20">
              <Shield className="h-3 w-3 mr-1" />
              Admin
            </Badge>
          ) : (
            <Badge variant="outline">User</Badge>
          ),
        },
        {
          key: 'workspaces',
          label: 'Workspaces',
          render: () => <span>{user.tenant_count}</span>,
        },
        {
          key: 'joined',
          label: 'Joined',
          render: () => (
            <span className="text-muted-foreground text-xs">
              {format(new Date(user.created_at), 'MMM d, yyyy')}
            </span>
          ),
        },
      ]}
      actions={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSelectedUser(user)}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      }
    />
  );

  // Customer card for mobile view
  const CustomerCard = ({ customer }: { customer: AdminCustomer }) => (
    <MobileDataCard
      data={customer}
      onClick={() => setSelectedCustomer(customer)}
      header={
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={customer.avatar_url || ''} />
            <AvatarFallback>
              {customer.full_name?.charAt(0) || customer.email?.charAt(0) || 'C'}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <p className="font-medium truncate">{customer.full_name || 'Unknown'}</p>
            <p className="text-xs text-muted-foreground truncate">{customer.tenant_name}</p>
          </div>
        </div>
      }
      fields={[
        {
          key: 'phone',
          label: 'Phone',
          render: () => <span className="text-sm">{customer.phone_number || '-'}</span>,
        },
        {
          key: 'plan',
          label: 'Plan',
          render: () => <Badge variant="outline">{customer.plan_name || 'No Plan'}</Badge>,
        },
        {
          key: 'status',
          label: 'Status',
          render: () => customer.is_activated ? (
            <Badge className="bg-success/10 text-success border-success/20">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Active
            </Badge>
          ) : (
            <Badge variant="secondary">
              <XCircle className="h-3 w-3 mr-1" />
              Inactive
            </Badge>
          ),
        },
      ]}
      actions={
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setSelectedCustomer(customer)}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            {customer.phone_number && (
              <DropdownMenuItem onClick={() => window.location.href = `/admin/inbox?phone=${encodeURIComponent(customer.phone_number!)}`}>
                <MessageSquare className="h-4 w-4 mr-2" />
                Message on WhatsApp
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      }
    />
  );

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <ResponsivePageHeader
          title="Users"
          description="Manage admins and WhatsApp customers"
          actions={
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => activeTab === 'admins' ? refetch() : refetchCustomers()}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          }
        />

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="admins" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Admin Users
            </TabsTrigger>
            <TabsTrigger value="customers" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              WhatsApp Customers
            </TabsTrigger>
          </TabsList>

          {/* Admin Users Tab */}
          <TabsContent value="admins">
            <Card>
              <CardHeader className="pb-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-20 md:h-16 w-full" />
                    ))}
                  </div>
                ) : filteredUsers.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-medium text-lg">No users found</h3>
                    <p className="text-muted-foreground">
                      {searchQuery ? 'Try a different search term' : 'No users in the system yet'}
                    </p>
                  </div>
                ) : isMobile ? (
                  <div className="space-y-3">
                    {filteredUsers.map((user) => (
                      <UserCard key={user.id} user={user} />
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Workspaces</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <TableRow key={user.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarImage src={user.avatar_url || ''} />
                                <AvatarFallback>
                                  {user.full_name?.charAt(0) || user.email?.charAt(0) || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{user.full_name || 'Unknown'}</p>
                                <p className="text-sm text-muted-foreground">{user.email}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {user.is_admin ? (
                              <Badge className="bg-destructive/10 text-destructive border-destructive/20">
                                <Shield className="h-3 w-3 mr-1" />
                                Admin
                              </Badge>
                            ) : (
                              <Badge variant="outline">User</Badge>
                            )}
                          </TableCell>
                          <TableCell>{user.tenant_count}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(user.created_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setSelectedUser(user)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* WhatsApp Customers Tab */}
          <TabsContent value="customers">
            <Card>
              <CardHeader className="pb-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, phone, or workspace..."
                    value={customerSearchQuery}
                    onChange={(e) => setCustomerSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </CardHeader>
              <CardContent>
                {customersLoading ? (
                  <div className="space-y-3">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-20 md:h-16 w-full" />
                    ))}
                  </div>
                ) : filteredCustomers.length === 0 ? (
                  <div className="text-center py-12">
                    <MessageSquare className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-medium text-lg">No customers found</h3>
                    <p className="text-muted-foreground">
                      {customerSearchQuery ? 'Try a different search term' : 'No WhatsApp customers yet'}
                    </p>
                  </div>
                ) : isMobile ? (
                  <div className="space-y-3">
                    {filteredCustomers.map((customer) => (
                      <CustomerCard key={customer.id} customer={customer} />
                    ))}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Plan</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Paid</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCustomers.map((customer) => (
                        <TableRow key={customer.id} className="cursor-pointer" onClick={() => setSelectedCustomer(customer)}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarImage src={customer.avatar_url || ''} />
                                <AvatarFallback>
                                  {customer.full_name?.charAt(0) || customer.email?.charAt(0) || 'C'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{customer.full_name || 'Unknown'}</p>
                                <p className="text-sm text-muted-foreground">{customer.tenant_name}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            {customer.phone_number ? (
                              <span className="flex items-center gap-1.5">
                                <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                {customer.phone_number}
                              </span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{customer.plan_name || 'No Plan'}</Badge>
                          </TableCell>
                          <TableCell>
                            {customer.is_activated ? (
                              <Badge className="bg-success/10 text-success border-success/20">
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="secondary">
                                <XCircle className="h-3 w-3 mr-1" />
                                Inactive
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="font-medium">
                            ৳{customer.total_paid.toLocaleString()}
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {format(new Date(customer.created_at), 'MMM d, yyyy')}
                          </TableCell>
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setSelectedCustomer(customer)}>
                                  <Eye className="h-4 w-4 mr-2" />
                                  View Details
                                </DropdownMenuItem>
                                {customer.phone_number && (
                                  <DropdownMenuItem onClick={() => window.location.href = `/admin/inbox?phone=${encodeURIComponent(customer.phone_number!)}`}>
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                    Message on WhatsApp
                                  </DropdownMenuItem>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* User Detail Dialog */}
        <Dialog open={!!selectedUser} onOpenChange={() => setSelectedUser(null)}>
          <DialogContent className="mx-4 max-w-[calc(100vw-2rem)] sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>User Details</DialogTitle>
              <DialogDescription>View user information and memberships</DialogDescription>
            </DialogHeader>
            {selectedUser && (
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <Avatar className="h-14 w-14 md:h-16 md:w-16">
                    <AvatarImage src={selectedUser.avatar_url || ''} />
                    <AvatarFallback className="text-lg">
                      {selectedUser.full_name?.charAt(0) || selectedUser.email?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-base md:text-lg truncate">{selectedUser.full_name || 'Unknown'}</h3>
                    <p className="text-muted-foreground text-sm truncate">{selectedUser.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Joined {format(new Date(selectedUser.created_at), 'MMMM d, yyyy')}
                    </p>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2 text-sm">System Role</h4>
                  {selectedUser.is_admin ? (
                    <Badge className="bg-destructive/10 text-destructive border-destructive/20">
                      <Shield className="h-3 w-3 mr-1" />
                      System Admin
                    </Badge>
                  ) : (
                    <Badge variant="outline">Regular User</Badge>
                  )}
                </div>

                <div>
                  <h4 className="font-medium mb-2 text-sm">Workspace Memberships ({selectedUser.tenants.length})</h4>
                  {selectedUser.tenants.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No workspace memberships</p>
                  ) : (
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {selectedUser.tenants.map((t) => (
                        <div key={t.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                          <span className="font-medium text-sm truncate">{t.name}</span>
                          <Badge variant="outline" className="capitalize shrink-0">{t.role}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Customer Detail Sheet */}
        <CustomerDetailSheet
          customer={selectedCustomer}
          open={!!selectedCustomer}
          onOpenChange={(open) => !open && setSelectedCustomer(null)}
        />

        {/* Admin Request Dialog */}
        {requestDialogUser && (
          <AdminRequestDialog
            open={!!requestDialogUser}
            onOpenChange={(open) => !open && setRequestDialogUser(null)}
            userId={requestDialogUser.id}
            userEmail={requestDialogUser.email}
            userName={requestDialogUser.full_name}
          />
        )}
      </div>
    </AdminLayout>
  );
}
