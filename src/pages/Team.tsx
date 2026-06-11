import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useTeam } from '@/hooks/useTeam';
import { useTeamPresence } from '@/hooks/useTeamPresence';
import { useTenant } from '@/hooks/useTenant';
import { useAuth } from '@/hooks/useAuth';
import { usePlanLimits } from '@/hooks/usePlanLimits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PresenceIndicator } from '@/components/ui/presence-indicator';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
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
import { useToast } from '@/hooks/use-toast';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { LimitReachedCard, UsageBadge } from '@/components/billing/LimitReachedCard';
import {
  Users,
  MoreVertical,
  Mail,
  Clock,
  Crown,
  Shield,
  User,
  Trash2,
  Loader2,
  UserPlus,
  Key,
  Lock,
  ClipboardList,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { CreateTeamMemberDialog } from '@/components/team/CreateTeamMemberDialog';
import { ResetPasswordDialog } from '@/components/team/ResetPasswordDialog';
import { PermissionManager } from '@/components/team/PermissionManager';
import { TenantAuditLogViewer } from '@/components/team/TenantAuditLogViewer';

const roleConfig = {
  owner: { label: 'Owner', icon: Crown, className: 'bg-warning/10 text-warning border-warning/20' },
  manager: { label: 'Manager', icon: Shield, className: 'bg-primary/10 text-primary border-primary/20' },
  agent: { label: 'Agent', icon: User, className: 'bg-muted text-muted-foreground' },
};

export default function Team() {
  const { members, invitations, loading, canManageTeam, inviteMember, cancelInvitation, removeMember, refetch } = useTeam();
  const { getMemberPresence } = useTeamPresence();
  const { isOwner } = useTenant();
  const { user } = useAuth();
  const { toast } = useToast();
  const { agents: agentLimits, planName } = usePlanLimits();
  const canAddAgent = agentLimits.canAdd;
  const [inviteDialogOpen, setInviteDialogOpen] = useState(false);
  const [createMemberDialogOpen, setCreateMemberDialogOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'manager' | 'agent'>('agent');
  const [isInviting, setIsInviting] = useState(false);
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [memberToReset, setMemberToReset] = useState<typeof members[0] | null>(null);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail.trim()) return;

    setIsInviting(true);
    try {
      await inviteMember(inviteEmail, inviteRole);
      setInviteEmail('');
      setInviteDialogOpen(false);
    } catch (error: any) {
      toast({
        title: 'Failed to send invitation',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsInviting(false);
    }
  };

  const handleCancelInvitation = async (id: string) => {
    try {
      await cancelInvitation(id);
      toast({ title: 'Invitation cancelled' });
    } catch (error: any) {
      toast({
        title: 'Failed to cancel invitation',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleRemoveMember = async () => {
    if (!memberToRemove) return;
    try {
      await removeMember(memberToRemove);
      toast({ title: 'Team member removed' });
    } catch (error: any) {
      toast({
        title: 'Failed to remove member',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setRemoveDialogOpen(false);
      setMemberToRemove(null);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Team</h1>
            <p className="text-muted-foreground">
              Manage your team members, invitations, and permissions
            </p>
          </div>
          <div className="flex items-center gap-3">
            <UsageBadge 
              current={agentLimits.current} 
              max={agentLimits.max} 
              resourceType="agent" 
            />
            {canManageTeam && (
              <div className="flex gap-2">
                {isOwner && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span>
                        <Button 
                          onClick={() => setCreateMemberDialogOpen(true)}
                          disabled={!canAddAgent}
                        >
                          <UserPlus className="h-4 w-4 mr-2" />
                          Add Member
                        </Button>
                      </span>
                    </TooltipTrigger>
                    {!canAddAgent && (
                      <TooltipContent>
                        <p>Team member limit reached. Upgrade your plan to add more.</p>
                      </TooltipContent>
                    )}
                  </Tooltip>
                )}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span>
                      <Button 
                        variant="outline" 
                        onClick={() => setInviteDialogOpen(true)}
                        disabled={!canAddAgent}
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        Invite Member
                      </Button>
                    </span>
                  </TooltipTrigger>
                  {!canAddAgent && (
                    <TooltipContent>
                      <p>Team member limit reached. Upgrade your plan to add more.</p>
                    </TooltipContent>
                  )}
                </Tooltip>
              </div>
            )}
          </div>
        </div>

        {/* Limit Reached Warning */}
        {agentLimits.isAtLimit && !loading && members.length > 0 && (
          <LimitReachedCard
            resourceType="agent"
            current={agentLimits.current}
            max={agentLimits.max}
            currentPlanName={planName || undefined}
          />
        )}

        {/* Tabs */}
        <Tabs defaultValue="members" className="w-full">
          <TabsList className={`grid w-full max-w-lg ${isOwner ? 'grid-cols-4' : 'grid-cols-2'}`}>
            <TabsTrigger value="members" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Members
            </TabsTrigger>
            <TabsTrigger value="invitations" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Invitations
              {invitations.length > 0 && (
                <Badge variant="secondary" className="ml-1">{invitations.length}</Badge>
              )}
            </TabsTrigger>
            {isOwner && (
              <>
                <TabsTrigger value="permissions" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Permissions
                </TabsTrigger>
                <TabsTrigger value="audit-log" className="flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" />
                  Activity Log
                </TabsTrigger>
              </>
            )}
          </TabsList>

          {/* Members Tab */}
          <TabsContent value="members" className="mt-6">
            <Card data-tour="team-list" className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Team Members
                </CardTitle>
                <CardDescription>
                  {members.length} member{members.length !== 1 ? 's' : ''} in your workspace
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-4">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-48" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {members.map((member) => {
                      const role = roleConfig[member.role];
                      const RoleIcon = role.icon;
                      const isCurrentUser = member.user_id === user?.id;
                      const canRemove = isOwner && !isCurrentUser && member.role !== 'owner';
                      const presence = getMemberPresence(member.user_id);

                      return (
                        <div key={member.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={member.profile?.avatar_url || ''} />
                                <AvatarFallback className="bg-primary/10 text-primary">
                                  {(member.profile?.full_name || member.profile?.email || 'U')
                                    .charAt(0)
                                    .toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                              <PresenceIndicator 
                                status={presence?.status || 'offline'} 
                                size="md"
                                className="absolute -bottom-0.5 -right-0.5"
                              />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {member.profile?.full_name || 'Unknown User'}
                                </span>
                                {isCurrentUser && (
                                  <Badge variant="outline" className="text-xs">You</Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {presence?.status === 'online' && presence?.current_page 
                                  ? `${presence.last_seen_text} • ${presence.current_page}`
                                  : presence?.last_seen_text || member.profile?.email
                                }
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className={role.className}>
                              <RoleIcon className="h-3 w-3 mr-1" />
                              {role.label}
                            </Badge>
                            {canRemove && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setMemberToReset(member);
                                      setResetPasswordDialogOpen(true);
                                    }}
                                  >
                                    <Key className="mr-2 h-4 w-4" />
                                    Reset Password
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setMemberToRemove(member.id);
                                      setRemoveDialogOpen(true);
                                    }}
                                    className="text-destructive"
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" />
                                    Remove Member
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invitations Tab */}
          <TabsContent value="invitations" className="mt-6">
            {invitations.length === 0 ? (
              <Card className="border-border/50">
                <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                  <Mail className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No Pending Invitations</h3>
                  <p className="text-muted-foreground text-sm mt-1">
                    Invite team members to join your workspace
                  </p>
                  {canManageTeam && (
                    <Button 
                      className="mt-4" 
                      onClick={() => setInviteDialogOpen(true)}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      Send Invitation
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="border-border/50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Mail className="h-5 w-5" />
                    Pending Invitations
                  </CardTitle>
                  <CardDescription>
                    {invitations.length} pending invitation{invitations.length !== 1 ? 's' : ''}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="divide-y divide-border">
                    {invitations.map((invitation) => {
                      const role = roleConfig[invitation.role];
                      const RoleIcon = role.icon;

                      return (
                        <div key={invitation.id} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                              <Mail className="h-5 w-5 text-muted-foreground" />
                            </div>
                            <div>
                              <span className="font-medium">{invitation.email}</span>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Clock className="h-3 w-3" />
                                Expires {formatDistanceToNow(new Date(invitation.expires_at), { addSuffix: true })}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className={role.className}>
                              <RoleIcon className="h-3 w-3 mr-1" />
                              {role.label}
                            </Badge>
                            {canManageTeam && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCancelInvitation(invitation.id)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Permissions Tab */}
          {isOwner && (
            <TabsContent value="permissions" className="mt-6">
              <PermissionManager />
            </TabsContent>
          )}

          {/* Audit Log Tab */}
          {isOwner && (
            <TabsContent value="audit-log" className="mt-6">
              <TenantAuditLogViewer />
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Invite Dialog */}
      <Dialog open={inviteDialogOpen} onOpenChange={setInviteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              Send an invitation to join your workspace.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleInvite}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  disabled={isInviting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as 'manager' | 'agent')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manager">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Manager
                      </div>
                    </SelectItem>
                    <SelectItem value="agent">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Agent
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setInviteDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isInviting || !inviteEmail.trim()}>
                {isInviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Send Invitation
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Remove Member Confirmation */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this team member? They will lose access to your workspace immediately.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveMember}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create Team Member Dialog (Owner only) */}
      <CreateTeamMemberDialog
        open={createMemberDialogOpen}
        onOpenChange={setCreateMemberDialogOpen}
        onSuccess={refetch}
      />

      {/* Reset Password Dialog (Owner only) */}
      <ResetPasswordDialog
        open={resetPasswordDialogOpen}
        onOpenChange={setResetPasswordDialogOpen}
        member={memberToReset}
      />
    </DashboardLayout>
  );
}
