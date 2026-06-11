import { useState } from 'react';
import AdminLayout from '@/components/layout/AdminLayout';
import { useAdminOwnInstances, AdminWhatsAppInstance } from '@/hooks/useAdminOwnInstances';
import AdminInstanceCard from '@/components/admin-instances/AdminInstanceCard';
import AdminAddInstanceDialog from '@/components/admin-instances/AdminAddInstanceDialog';
import AdminConnectQRDialog from '@/components/admin-instances/AdminConnectQRDialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Plus, Smartphone, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function AdminWhatsAppInstances() {
  const { instances, loading, deleteInstance, setDefaultInstance, refetch } = useAdminOwnInstances();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [connectingInstance, setConnectingInstance] = useState<AdminWhatsAppInstance | null>(null);

  const handleConnect = (instance: AdminWhatsAppInstance) => {
    setConnectingInstance(instance);
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteInstance(id);
    } catch (error) {
      console.error('Failed to delete instance:', error);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultInstance(id);
    } catch (error) {
      console.error('Failed to set default:', error);
    }
  };

  const connectedCount = instances.filter(i => i.status === 'active').length;
  const disconnectedCount = instances.filter(i => i.status !== 'active').length;

  return (
    <AdminLayout>
      <div className="container py-6 max-w-5xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">WhatsApp Instances</h1>
            <p className="text-muted-foreground">
              Manage WhatsApp connections for admin communication
            </p>
          </div>
          <Button onClick={() => setShowAddDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Instance
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Smartphone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{instances.length}</p>
                  <p className="text-sm text-muted-foreground">Total Instances</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
                  <Smartphone className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{connectedCount}</p>
                  <p className="text-sm text-muted-foreground">Connected</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                  <Smartphone className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{disconnectedCount}</p>
                  <p className="text-sm text-muted-foreground">Disconnected</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Instances List */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1, 2].map((i) => (
              <Card key={i}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <Skeleton className="h-12 w-12 rounded-xl" />
                    <div className="flex-1">
                      <Skeleton className="h-5 w-32 mb-2" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : instances.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Smartphone className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-1">No WhatsApp Instances</h3>
              <p className="text-muted-foreground text-center mb-4 max-w-md">
                Add a WhatsApp instance to start sending and receiving messages from the admin panel.
              </p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Instance
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {instances.map((instance) => (
              <AdminInstanceCard
                key={instance.id}
                instance={instance}
                onConnect={handleConnect}
                onDelete={handleDelete}
                onSetDefault={handleSetDefault}
              />
            ))}
          </div>
        )}

        {/* Quick Actions */}
        {instances.length > 0 && connectedCount > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base">Quick Actions</CardTitle>
              <CardDescription>Use your connected instances</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button asChild variant="outline">
                <Link to="/admin/inbox">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Open Admin Inbox
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Dialogs */}
      <AdminAddInstanceDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
      />

      {connectingInstance && (
        <AdminConnectQRDialog
          open={!!connectingInstance}
          onOpenChange={(open) => !open && setConnectingInstance(null)}
          instance={connectingInstance}
          onConnected={refetch}
        />
      )}
    </AdminLayout>
  );
}
