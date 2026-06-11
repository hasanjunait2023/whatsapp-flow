import { useState, useRef, useEffect } from 'react';
import { useTenant } from '@/hooks/useTenant';
import { useBusinessTypes } from '@/hooks/useBusinessTypes';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Building2, Trash2, Loader2, Save, Upload, X, ImageIcon, Store, Briefcase, ShoppingCart, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function WorkspaceSettings() {
  const { currentTenant, isOwner, refetch, tenants, switchTenant } = useTenant();
  const { businessTypes, loading: businessTypesLoading } = useBusinessTypes();
  const { toast } = useToast();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [workspaceName, setWorkspaceName] = useState(currentTenant?.name || '');
  const [isRenaming, setIsRenaming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isUpdatingBusinessType, setIsUpdatingBusinessType] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');

  // Sync workspaceName when currentTenant changes
  useEffect(() => {
    if (currentTenant?.name) {
      setWorkspaceName(currentTenant.name);
    }
  }, [currentTenant?.name]);

  const handleRename = async () => {
    if (!currentTenant || !workspaceName.trim()) return;
    
    setIsRenaming(true);
    try {
      const { error } = await supabase
        .from('tenants')
        .update({ name: workspaceName.trim() })
        .eq('id', currentTenant.id);

      if (error) throw error;

      await refetch();
      toast({
        title: 'Workspace renamed',
        description: 'Your workspace name has been updated.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to rename workspace',
        variant: 'destructive',
      });
    } finally {
      setIsRenaming(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentTenant) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please upload an image file (PNG, JPG, etc.)',
        variant: 'destructive',
      });
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please upload an image smaller than 2MB',
        variant: 'destructive',
      });
      return;
    }

    setIsUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${currentTenant.id}/logo.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('workspace-logos')
        .upload(fileName, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('workspace-logos')
        .getPublicUrl(fileName);

      // Update tenant with logo URL (add cache buster)
      const logoUrl = `${urlData.publicUrl}?t=${Date.now()}`;
      const { error: updateError } = await supabase
        .from('tenants')
        .update({ logo_url: logoUrl })
        .eq('id', currentTenant.id);

      if (updateError) throw updateError;

      await refetch();
      toast({
        title: 'Logo updated',
        description: 'Your workspace logo has been updated.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to upload logo',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingLogo(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUpdateBusinessType = async (businessTypeId: string) => {
    if (!currentTenant) return;
    
    setIsUpdatingBusinessType(true);
    try {
      const { error } = await supabase
        .from('tenants')
        .update({ business_type_id: businessTypeId })
        .eq('id', currentTenant.id);

      if (error) throw error;

      await refetch();
      toast({
        title: 'Business type updated',
        description: 'Your business type has been updated. You can now see relevant plans.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update business type',
        variant: 'destructive',
      });
    } finally {
      setIsUpdatingBusinessType(false);
    }
  };

  const getBusinessTypeIcon = (slug: string) => {
    switch (slug) {
      case 'wholesale':
        return <Store className="h-6 w-6" />;
      case 'retail':
        return <ShoppingCart className="h-6 w-6" />;
      case 'service':
        return <Briefcase className="h-6 w-6" />;
      default:
        return <Building2 className="h-6 w-6" />;
    }
  };

  const currentBusinessType = businessTypes.find(bt => bt.id === currentTenant?.business_type_id);

  const handleRemoveLogo = async () => {
    if (!currentTenant) return;

    setIsUploadingLogo(true);
    try {
      // Update tenant to remove logo URL
      const { error: updateError } = await supabase
        .from('tenants')
        .update({ logo_url: null })
        .eq('id', currentTenant.id);

      if (updateError) throw updateError;

      await refetch();
      toast({
        title: 'Logo removed',
        description: 'Your workspace logo has been removed.',
      });
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to remove logo',
        variant: 'destructive',
      });
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleDelete = async () => {
    if (!currentTenant || deleteConfirmation !== currentTenant.name) return;
    
    setIsDeleting(true);
    try {
      const { error } = await supabase
        .from('tenants')
        .delete()
        .eq('id', currentTenant.id);

      if (error) throw error;

      toast({
        title: 'Workspace deleted',
        description: 'Your workspace has been permanently deleted.',
      });

      // Switch to another workspace or redirect to onboarding
      const remainingTenants = tenants.filter(t => t.tenant_id !== currentTenant.id);
      if (remainingTenants.length > 0) {
        switchTenant(remainingTenants[0].tenant_id);
        navigate('/dashboard');
      } else {
        navigate('/onboarding');
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to delete workspace',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setDeleteConfirmation('');
    }
  };

  if (!isOwner) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Workspace
          </CardTitle>
          <CardDescription>
            Manage your workspace settings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Only workspace owners can manage these settings.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Business Type Selector */}
      <Card className={!currentTenant?.business_type_id ? 'border-primary ring-2 ring-primary/20' : ''}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" />
                Business Type
              </CardTitle>
              <CardDescription>
                Select your business vertical to see tailored plans and features
              </CardDescription>
            </div>
            {currentBusinessType && (
              <Badge variant="secondary" className="text-sm">
                {currentBusinessType.name}
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {businessTypesLoading ? (
            <div className="grid gap-4 sm:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              {businessTypes.map((bt) => {
                const isSelected = currentTenant?.business_type_id === bt.id;
                return (
                  <button
                    key={bt.id}
                    onClick={() => handleUpdateBusinessType(bt.id)}
                    disabled={isUpdatingBusinessType || isSelected}
                    className={cn(
                      'relative flex flex-col items-center gap-3 rounded-lg border-2 p-6 text-center transition-all',
                      isSelected
                        ? 'border-primary bg-primary/5 cursor-default'
                        : 'border-border hover:border-primary/50 hover:bg-accent cursor-pointer',
                      isUpdatingBusinessType && 'opacity-50 cursor-wait'
                    )}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2">
                        <div className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                          <Check className="h-3 w-3" />
                        </div>
                      </div>
                    )}
                    <div className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-full',
                      isSelected ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground'
                    )}>
                      {getBusinessTypeIcon(bt.slug)}
                    </div>
                    <div>
                      <p className={cn(
                        'font-semibold',
                        isSelected && 'text-primary'
                      )}>
                        {bt.name}
                      </p>
                      {bt.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {bt.description}
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          {!currentTenant?.business_type_id && !businessTypesLoading && (
            <p className="mt-4 text-sm text-muted-foreground text-center">
              ⚠️ Please select a business type to see relevant subscription plans
            </p>
          )}
        </CardContent>
      </Card>

      {/* Workspace Logo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Workspace Logo
          </CardTitle>
          <CardDescription>
            Upload a logo for your workspace (max 2MB)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="h-20 w-20 rounded-lg">
              <AvatarImage src={currentTenant?.logo_url || undefined} alt={currentTenant?.name} />
              <AvatarFallback className="rounded-lg bg-primary/10 text-primary text-xl">
                {currentTenant?.name?.charAt(0)?.toUpperCase() || 'W'}
              </AvatarFallback>
            </Avatar>
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingLogo}
              >
                {isUploadingLogo ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Logo
                  </>
                )}
              </Button>
              {currentTenant?.logo_url && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveLogo}
                  disabled={isUploadingLogo}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <X className="mr-2 h-4 w-4" />
                  Remove Logo
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Rename Workspace */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Workspace Name
          </CardTitle>
          <CardDescription>
            Update your workspace name
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="workspace-name">Name</Label>
            <Input
              id="workspace-name"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              placeholder="Enter workspace name"
            />
          </div>
          <Button 
            onClick={handleRename} 
            disabled={isRenaming || !workspaceName.trim() || workspaceName === currentTenant?.name}
          >
            {isRenaming ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Delete Workspace */}
      <Card className="border-destructive/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            Danger Zone
          </CardTitle>
          <CardDescription>
            Permanently delete this workspace and all its data
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Workspace
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription className="space-y-3">
                  <p>
                    This action cannot be undone. This will permanently delete the workspace
                    <strong className="text-foreground"> "{currentTenant?.name}"</strong> and all associated data including:
                  </p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    <li>All contacts and messages</li>
                    <li>WhatsApp instances</li>
                    <li>Team members and invitations</li>
                    <li>Automation rules</li>
                    <li>Quick replies and settings</li>
                  </ul>
                  <div className="pt-2">
                    <Label htmlFor="delete-confirm" className="text-foreground">
                      Type <strong>"{currentTenant?.name}"</strong> to confirm:
                    </Label>
                    <Input
                      id="delete-confirm"
                      value={deleteConfirmation}
                      onChange={(e) => setDeleteConfirmation(e.target.value)}
                      placeholder="Enter workspace name"
                      className="mt-2"
                    />
                  </div>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeleteConfirmation('')}>
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={isDeleting || deleteConfirmation !== currentTenant?.name}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    'Delete Workspace'
                  )}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>
    </div>
  );
}
