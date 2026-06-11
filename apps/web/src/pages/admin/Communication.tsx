import { useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageSquare, Phone, RefreshCw, Loader2, ExternalLink, Inbox, Users, Workflow, Zap, Link2, Plus, Trash2 } from 'lucide-react';
import { useAdminCommunication } from '@/hooks/useAdminCommunication';
import { Link } from 'react-router-dom';
import AdminConnectQRDialog from '@/components/admin/AdminConnectQRDialog';
import AdminAddInstanceDialog from '@/components/admin/AdminAddInstanceDialog';
import AdminDeleteInstanceDialog from '@/components/admin/AdminDeleteInstanceDialog';

interface AdminInstance {
  id: string;
  name: string;
  status: string;
  phone_number?: string | null;
}

export default function Communication() {
  const [connectingInstance, setConnectingInstance] = useState<AdminInstance | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deletingInstance, setDeletingInstance] = useState<AdminInstance | null>(null);
  
  const {
    systemTenant,
    instances, 
    loading,
    creating,
    deleting,
    fetchAll,
    createInstance,
    deleteInstance,
  } = useAdminCommunication();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
      case 'active':
        return 'bg-green-500';
      case 'connecting': return 'bg-yellow-500';
      default: return 'bg-red-500';
    }
  };

  const webhookUrl = (instanceId: string) => 
    `https://cdkrvztqeuflxilrtnws.supabase.co/functions/v1/wasender-webhook/${instanceId}`;

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Admin Communication</h1>
            <p className="text-muted-foreground">
              Manage Ecomex business WhatsApp for lead communication
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowAddDialog(true)} disabled={loading}>
              <Plus className="mr-2 h-4 w-4" />
              Add Instance
            </Button>
            <Button variant="outline" onClick={fetchAll} disabled={loading}>
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Quick Access Cards */}
        {systemTenant && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <Link to="/admin/inbox">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Inbox className="h-5 w-5 text-primary" />
                    Admin Inbox
                  </CardTitle>
                  <CardDescription>
                    View and respond to messages
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" size="sm" className="w-full">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Inbox
                  </Button>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <Link to="/admin/whatsapp-functions">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Zap className="h-5 w-5 text-primary" />
                    WA Functions
                  </CardTitle>
                  <CardDescription>
                    Quick replies & auto messages
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" size="sm" className="w-full">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Functions
                  </Button>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <Link to="/contacts">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5 text-primary" />
                    Admin Contacts
                  </CardTitle>
                  <CardDescription>
                    Manage leads and contacts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" size="sm" className="w-full">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Contacts
                  </Button>
                </CardContent>
              </Link>
            </Card>

            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <Link to="/workflows">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Workflow className="h-5 w-5 text-primary" />
                    Automation
                  </CardTitle>
                  <CardDescription>
                    Set up auto-replies and workflows
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="outline" size="sm" className="w-full">
                    <ExternalLink className="mr-2 h-4 w-4" />
                    Open Workflows
                  </Button>
                </CardContent>
              </Link>
            </Card>
          </div>
        )}

        {/* WhatsApp Instances */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold">WhatsApp Instances</h2>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !systemTenant ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No System Tenant Found</h3>
                <p className="text-muted-foreground text-center">
                  System tenant is not configured. Please contact support.
                </p>
              </CardContent>
            </Card>
          ) : instances.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No WhatsApp Instances</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Add your first WhatsApp instance to start communicating
                </p>
                <Button onClick={() => setShowAddDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Instance
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
              {instances.map((instance) => (
                <Card key={instance.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{instance.name}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="flex items-center gap-1">
                          <span className={`h-2 w-2 rounded-full ${getStatusColor(instance.status)}`} />
                          {instance.status}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => setDeletingInstance(instance)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {instance.phone_number && (
                      <CardDescription className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {instance.phone_number}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-xs text-muted-foreground">
                      <p className="font-medium mb-1">Webhook URL:</p>
                      <code className="bg-muted px-2 py-1 rounded text-xs break-all block">
                        {webhookUrl(instance.id)}
                      </code>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {instance.status !== 'active' && (
                        <Button 
                          variant="default" 
                          size="sm"
                          onClick={() => setConnectingInstance(instance)}
                        >
                          <Link2 className="mr-2 h-4 w-4" />
                          Connect
                        </Button>
                      )}
                      {instance.status === 'active' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => setConnectingInstance(instance)}
                        >
                          <RefreshCw className="mr-2 h-4 w-4" />
                          Reconnect
                        </Button>
                      )}
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/admin/inbox">
                          <Inbox className="mr-2 h-4 w-4" />
                          Inbox
                        </Link>
                      </Button>
                      <Button variant="outline" size="sm" asChild>
                        <Link to="/admin/inbox">
                          <Users className="mr-2 h-4 w-4" />
                          Contacts
                        </Link>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* System Tenant Info */}
        {systemTenant && (
          <Card className="bg-muted/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                System Tenant
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                <span className="font-medium">Name:</span> {systemTenant.name}
              </p>
              <p className="text-sm">
                <span className="font-medium">ID:</span>{' '}
                <code className="text-xs bg-background px-1 py-0.5 rounded">{systemTenant.id}</code>
              </p>
            </CardContent>
          </Card>
        )}

        {/* Connect QR Dialog */}
        {connectingInstance && (
          <AdminConnectQRDialog
            open={!!connectingInstance}
            onOpenChange={(open) => !open && setConnectingInstance(null)}
            instance={connectingInstance}
            onConnected={() => {
              setConnectingInstance(null);
              fetchAll();
            }}
          />
        )}

        {/* Add Instance Dialog */}
        <AdminAddInstanceDialog
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          onCreateInstance={createInstance}
          creating={creating}
          onSuccess={fetchAll}
        />

        {/* Delete Instance Dialog */}
        <AdminDeleteInstanceDialog
          open={!!deletingInstance}
          onOpenChange={(open) => !open && setDeletingInstance(null)}
          instance={deletingInstance}
          onConfirm={deleteInstance}
          deleting={deleting}
        />
      </div>
    </AdminLayout>
  );
}