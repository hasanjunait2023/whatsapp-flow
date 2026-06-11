import { useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { useAdminRequests } from '@/hooks/useAdminRequests';
import { useAdminPermissions, AdminPermissions, PERMISSION_LABELS, DEFAULT_PERMISSIONS } from '@/hooks/useAdminPermissions';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { PendingRequestsCard } from '@/components/admin/PendingRequestsCard';
import { AdminPermissionEditor } from '@/components/admin/AdminPermissionEditor';
import { CreateAdminUserDialog } from '@/components/admin/CreateAdminUserDialog';
import { RefreshCw, Shield, Crown, MoreHorizontal, Settings, ShieldOff, Users, UserPlus } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { useEffect, useCallback } from 'react';

interface AdminUser {
  id: string;
  user_id: string;
  email: string | null;
  full_name: string | null;
  avatar_url: string | null;
  is_super_admin: boolean;
  permissions: AdminPermissions;
  granted_by: string | null;
  granted_at: string | null;
  granter_name: string | null;
}

export default function AdminManagement() {
  const { isSuperAdmin } = useAdminPermissions();
  const { pendingRequests, loading: requestsLoading, approveRequest, rejectRequest, refetch: refetchRequests } = useAdminRequests();
  
  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [userToRevoke, setUserToRevoke] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  const fetchAdmins = useCallback(async () => {
    try {
      setLoading(true);

      const { data: roles, error: rolesError } = await supabase
        .from('system_roles')
        .select('*')
        .eq('role', 'admin');

      if (rolesError) throw rolesError;

      // Get user IDs
      const userIds = new Set<string>();
      roles?.forEach(r => {
        userIds.add(r.user_id);
        if (r.granted_by) userIds.add(r.granted_by);
      });

      // Fetch profiles
      let profilesMap: Record<string, { email: string | null; full_name: string | null; avatar_url: string | null }> = {};
      if (userIds.size > 0) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, email, full_name, avatar_url')
          .in('id', Array.from(userIds));

        profilesMap = (profiles || []).reduce((acc, p) => {
          acc[p.id] = { email: p.email, full_name: p.full_name, avatar_url: p.avatar_url };
          return acc;
        }, {} as Record<string, { email: string | null; full_name: string | null; avatar_url: string | null }>);
      }

      const enrichedAdmins: AdminUser[] = (roles || []).map((r: any) => ({
        id: r.id,
        user_id: r.user_id,
        email: profilesMap[r.user_id]?.email || null,
        full_name: profilesMap[r.user_id]?.full_name || null,
        avatar_url: profilesMap[r.user_id]?.avatar_url || null,
        is_super_admin: r.is_super_admin || false,
        permissions: (r.permissions as unknown as AdminPermissions) || DEFAULT_PERMISSIONS,
        granted_by: r.granted_by,
        granted_at: r.granted_at,
        granter_name: r.granted_by ? profilesMap[r.granted_by]?.full_name || profilesMap[r.granted_by]?.email || null : null,
      }));

      // Sort super admins first
      enrichedAdmins.sort((a, b) => {
        if (a.is_super_admin && !b.is_super_admin) return -1;
        if (!a.is_super_admin && b.is_super_admin) return 1;
        return 0;
      });

      setAdmins(enrichedAdmins);
    } catch (err) {
      console.error('Error fetching admins:', err);
      toast.error('Failed to fetch administrators');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdmins();
  }, [fetchAdmins]);

  const handleRevokeAdmin = async () => {
    if (!userToRevoke) return;
    try {
      const { error } = await supabase
        .from('system_roles')
        .delete()
        .eq('user_id', userToRevoke)
        .eq('role', 'admin');

      if (error) throw error;

      // Log to audit
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('admin_audit_logs').insert({
          admin_id: user.id,
          action: 'admin_revoked',
          entity_type: 'system_role',
          entity_id: userToRevoke,
        });
      }

      toast.success('Admin access revoked');
      setRevokeDialogOpen(false);
      setUserToRevoke(null);
      await fetchAdmins();
    } catch {
      toast.error('Failed to revoke admin access');
    }
  };

  const getPermissionCount = (perms: AdminPermissions) => {
    return Object.values(perms).filter(Boolean).length;
  };

  const refresh = () => {
    fetchAdmins();
    refetchRequests();
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Admin Management</h1>
            <p className="text-muted-foreground">Manage administrators and access requests</p>
          </div>
          <div className="flex gap-2">
            {isSuperAdmin && (
              <Button onClick={() => setCreateDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Create Admin
              </Button>
            )}
            <Button variant="outline" onClick={refresh}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Pending Requests */}
        {isSuperAdmin && (
          <PendingRequestsCard
            requests={pendingRequests}
            loading={requestsLoading}
            onApprove={async (id, notes) => {
              await approveRequest(id, notes);
              await fetchAdmins();
            }}
            onReject={rejectRequest}
          />
        )}

        {/* Current Admins */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Current Administrators
              <Badge variant="secondary">{admins.length}</Badge>
            </CardTitle>
            <CardDescription>
              Users with access to the admin panel
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : admins.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-medium text-lg">No administrators</h3>
                <p className="text-muted-foreground">No admin accounts configured yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Administrator</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Permissions</TableHead>
                    <TableHead>Granted By</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admins.map((admin) => (
                    <TableRow key={admin.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={admin.avatar_url || ''} />
                            <AvatarFallback>
                              {admin.full_name?.charAt(0) || admin.email?.charAt(0) || 'A'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{admin.full_name || 'Unknown'}</p>
                            <p className="text-sm text-muted-foreground">{admin.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {admin.is_super_admin ? (
                          <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20">
                            <Crown className="h-3 w-3 mr-1" />
                            Super Admin
                          </Badge>
                        ) : (
                          <Badge variant="outline">
                            <Shield className="h-3 w-3 mr-1" />
                            Admin
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {admin.is_super_admin ? (
                          <span className="text-muted-foreground">All ({Object.keys(PERMISSION_LABELS).length})</span>
                        ) : (
                          <span className="text-muted-foreground">
                            {getPermissionCount(admin.permissions)} / {Object.keys(PERMISSION_LABELS).length}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {admin.granter_name ? (
                          <div>
                            <p className="text-sm">{admin.granter_name}</p>
                            {admin.granted_at && (
                              <p className="text-xs">{format(new Date(admin.granted_at), 'MMM d, yyyy')}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs">System</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {isSuperAdmin && (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => setSelectedAdmin(admin)}>
                                <Settings className="h-4 w-4 mr-2" />
                                Edit Permissions
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setUserToRevoke(admin.user_id);
                                  setRevokeDialogOpen(true);
                                }}
                              >
                                <ShieldOff className="h-4 w-4 mr-2" />
                                Revoke Access
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Permission Editor Dialog */}
        {selectedAdmin && (
          <AdminPermissionEditor
            open={!!selectedAdmin}
            onOpenChange={(open) => !open && setSelectedAdmin(null)}
            userId={selectedAdmin.user_id}
            userEmail={selectedAdmin.email}
            userName={selectedAdmin.full_name}
            currentPermissions={selectedAdmin.permissions}
            isSuperAdmin={selectedAdmin.is_super_admin}
            onSaved={fetchAdmins}
          />
        )}

        {/* Revoke Confirmation Dialog */}
        <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Revoke Admin Access?</AlertDialogTitle>
              <AlertDialogDescription>
                This will remove system admin privileges from this user. They will no longer
                be able to access the admin panel.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleRevokeAdmin} className="bg-destructive text-destructive-foreground">
                Revoke Access
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Create Admin Dialog */}
        <CreateAdminUserDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onCreated={fetchAdmins}
        />
      </div>
    </AdminLayout>
  );
}
