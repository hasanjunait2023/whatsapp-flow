import { useState, useEffect } from 'react';
import { useTeamMemberAccess } from '@/hooks/useTeamMemberAccess';
import { supabase } from '@/integrations/supabase/client';
import { useTenant } from '@/hooks/useTenant';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2, Smartphone, Facebook, Save } from 'lucide-react';
import { toast } from 'sonner';

interface ResourceAccessManagerProps {
  userId: string;
  userName: string;
}

interface WhatsAppInstance {
  id: string;
  name: string;
  phone_number: string | null;
}

interface FacebookPage {
  id: string;
  page_name: string;
  page_id: string;
}

export function ResourceAccessManager({ userId, userName }: ResourceAccessManagerProps) {
  const { currentTenant } = useTenant();
  const { getUserAccess, setUserAccess, loading: accessLoading } = useTeamMemberAccess();

  const [instances, setInstances] = useState<WhatsAppInstance[]>([]);
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [loadingResources, setLoadingResources] = useState(true);

  const [instanceMode, setInstanceMode] = useState<'all' | 'specific'>('all');
  const [pageMode, setPageMode] = useState<'all' | 'specific'>('all');
  const [selectedInstances, setSelectedInstances] = useState<string[]>([]);
  const [selectedPages, setSelectedPages] = useState<string[]>([]);

  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [initialState, setInitialState] = useState({
    instanceMode: 'all' as 'all' | 'specific',
    pageMode: 'all' as 'all' | 'specific',
    instances: [] as string[],
    pages: [] as string[],
  });

  // Fetch all resources and user's current access
  useEffect(() => {
    const fetchData = async () => {
      if (!currentTenant?.id) return;

      setLoadingResources(true);
      try {
        // Fetch all instances for tenant
        const { data: instanceData } = await supabase
          .from('whatsapp_instances')
          .select('id, name, phone_number')
          .eq('tenant_id', currentTenant.id)
          .order('name');
        setInstances((instanceData || []) as WhatsAppInstance[]);

        // Fetch all pages for tenant
        const { data: pageData } = await supabase
          .from('facebook_pages')
          .select('id, page_name, page_id')
          .eq('tenant_id', currentTenant.id)
          .order('page_name');
        setPages((pageData || []) as FacebookPage[]);

        // Fetch user's current access
        const access = await getUserAccess(userId);
        
        const instanceAccess = access
          .filter(a => a.resource_type === 'whatsapp_instance')
          .map(a => a.resource_id);
        const pageAccess = access
          .filter(a => a.resource_type === 'facebook_page')
          .map(a => a.resource_id);

        // Set modes based on whether restrictions exist
        const instMode = instanceAccess.length > 0 ? 'specific' : 'all';
        const pgMode = pageAccess.length > 0 ? 'specific' : 'all';

        setInstanceMode(instMode);
        setPageMode(pgMode);
        setSelectedInstances(instanceAccess);
        setSelectedPages(pageAccess);

        // Store initial state for change detection
        setInitialState({
          instanceMode: instMode,
          pageMode: pgMode,
          instances: instanceAccess,
          pages: pageAccess,
        });
        setHasChanges(false);
      } catch (error) {
        console.error('Error loading resources:', error);
        toast.error('Failed to load resources');
      } finally {
        setLoadingResources(false);
      }
    };

    fetchData();
  }, [currentTenant?.id, userId, getUserAccess]);

  // Detect changes
  useEffect(() => {
    const instancesChanged = 
      instanceMode !== initialState.instanceMode ||
      (instanceMode === 'specific' && 
        JSON.stringify([...selectedInstances].sort()) !== JSON.stringify([...initialState.instances].sort()));
    
    const pagesChanged = 
      pageMode !== initialState.pageMode ||
      (pageMode === 'specific' && 
        JSON.stringify([...selectedPages].sort()) !== JSON.stringify([...initialState.pages].sort()));

    setHasChanges(instancesChanged || pagesChanged);
  }, [instanceMode, pageMode, selectedInstances, selectedPages, initialState]);

  const toggleInstance = (instanceId: string) => {
    setSelectedInstances(prev =>
      prev.includes(instanceId)
        ? prev.filter(id => id !== instanceId)
        : [...prev, instanceId]
    );
  };

  const togglePage = (pageId: string) => {
    setSelectedPages(prev =>
      prev.includes(pageId)
        ? prev.filter(id => id !== pageId)
        : [...prev, pageId]
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save instance access
      const instanceIds = instanceMode === 'all' ? [] : selectedInstances;
      const instanceSuccess = await setUserAccess(userId, 'whatsapp_instance', instanceIds);
      if (!instanceSuccess) throw new Error('Failed to save instance access');

      // Save page access
      const pageIds = pageMode === 'all' ? [] : selectedPages;
      const pageSuccess = await setUserAccess(userId, 'facebook_page', pageIds);
      if (!pageSuccess) throw new Error('Failed to save page access');

      // Update initial state
      setInitialState({
        instanceMode,
        pageMode,
        instances: instanceIds,
        pages: pageIds,
      });
      setHasChanges(false);

      toast.success('Resource access saved successfully');
    } catch (error) {
      console.error('Error saving access:', error);
      toast.error('Failed to save resource access');
    } finally {
      setSaving(false);
    }
  };

  if (loadingResources) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* WhatsApp Instances */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            WhatsApp Instances
          </CardTitle>
          <CardDescription className="text-xs">
            Which instances can {userName} access
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {instances.length === 0 ? (
            <p className="text-sm text-muted-foreground">No instances configured</p>
          ) : (
            <>
              <RadioGroup
                value={instanceMode}
                onValueChange={(v) => setInstanceMode(v as 'all' | 'specific')}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="inst-all" />
                  <Label htmlFor="inst-all" className="text-sm cursor-pointer">
                    All Instances ({instances.length})
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="specific" id="inst-specific" />
                  <Label htmlFor="inst-specific" className="text-sm cursor-pointer">
                    Specific Instances
                  </Label>
                </div>
              </RadioGroup>

              {instanceMode === 'specific' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t">
                  {instances.map(instance => (
                    <label
                      key={instance.id}
                      className="flex items-center gap-2 p-2 rounded-md border cursor-pointer hover:bg-accent/50"
                    >
                      <Checkbox
                        checked={selectedInstances.includes(instance.id)}
                        onCheckedChange={() => toggleInstance(instance.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{instance.name}</p>
                        {instance.phone_number && (
                          <p className="text-xs text-muted-foreground">{instance.phone_number}</p>
                        )}
                      </div>
                    </label>
                  ))}
                  {selectedInstances.length === 0 && instanceMode === 'specific' && (
                    <p className="text-xs text-destructive col-span-full">
                      Select at least one instance or choose "All Instances"
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Facebook Pages */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Facebook className="h-4 w-4" />
            Facebook Pages
          </CardTitle>
          <CardDescription className="text-xs">
            Which pages can {userName} access
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {pages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No pages connected</p>
          ) : (
            <>
              <RadioGroup
                value={pageMode}
                onValueChange={(v) => setPageMode(v as 'all' | 'specific')}
                className="flex gap-4"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="page-all" />
                  <Label htmlFor="page-all" className="text-sm cursor-pointer">
                    All Pages ({pages.length})
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="specific" id="page-specific" />
                  <Label htmlFor="page-specific" className="text-sm cursor-pointer">
                    Specific Pages
                  </Label>
                </div>
              </RadioGroup>

              {pageMode === 'specific' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t">
                  {pages.map(page => (
                    <label
                      key={page.id}
                      className="flex items-center gap-2 p-2 rounded-md border cursor-pointer hover:bg-accent/50"
                    >
                      <Checkbox
                        checked={selectedPages.includes(page.id)}
                        onCheckedChange={() => togglePage(page.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{page.page_name}</p>
                        <p className="text-xs text-muted-foreground">ID: {page.page_id}</p>
                      </div>
                    </label>
                  ))}
                  {selectedPages.length === 0 && pageMode === 'specific' && (
                    <p className="text-xs text-destructive col-span-full">
                      Select at least one page or choose "All Pages"
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      {hasChanges && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving || accessLoading}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Resource Access
          </Button>
        </div>
      )}
    </div>
  );
}
