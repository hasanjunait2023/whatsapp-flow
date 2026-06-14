import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Loader2, Truck, CheckCircle2, XCircle } from 'lucide-react';
import { useCourier, CourierIntegration } from '@/hooks/useCourier';

export function CourierSettings() {
  const { steadfastIntegration, pathaoIntegration, integrationsLoading, upsertIntegration } = useCourier();
  
  const [steadfastForm, setSteadfastForm] = useState({
    api_key: '',
    api_secret: '',
    is_active: false,
    default_pickup_address: {
      name: '',
      phone: '',
      address: '',
      city: '',
    },
  });

  const [pathaoForm, setPathaoForm] = useState({
    api_key: '',
    api_secret: '',
    store_id: '',
    username: '',
    password: '',
    is_active: false,
    default_pickup_address: {
      name: '',
      phone: '',
      address: '',
      city: '',
      zone: '',
      area: '',
    },
  });

  useEffect(() => {
    if (steadfastIntegration) {
      setSteadfastForm({
        api_key: steadfastIntegration.api_key || '',
        api_secret: steadfastIntegration.api_secret || '',
        is_active: steadfastIntegration.is_active,
        default_pickup_address: {
          name: steadfastIntegration.default_pickup_address?.name || '',
          phone: steadfastIntegration.default_pickup_address?.phone || '',
          address: steadfastIntegration.default_pickup_address?.address || '',
          city: steadfastIntegration.default_pickup_address?.city || '',
        },
      });
    }
    if (pathaoIntegration) {
      setPathaoForm({
        api_key: pathaoIntegration.api_key || '',
        api_secret: pathaoIntegration.api_secret || '',
        store_id: pathaoIntegration.store_id || '',
        username: '',
        password: '',
        is_active: pathaoIntegration.is_active,
        default_pickup_address: {
          name: pathaoIntegration.default_pickup_address?.name || '',
          phone: pathaoIntegration.default_pickup_address?.phone || '',
          address: pathaoIntegration.default_pickup_address?.address || '',
          city: pathaoIntegration.default_pickup_address?.city || '',
          zone: pathaoIntegration.default_pickup_address?.zone || '',
          area: pathaoIntegration.default_pickup_address?.area || '',
        },
      });
    }
  }, [steadfastIntegration, pathaoIntegration]);

  const handleSaveSteadfast = async () => {
    await upsertIntegration.mutateAsync({
      provider: 'steadfast',
      api_key: steadfastForm.api_key,
      api_secret: steadfastForm.api_secret,
      is_active: steadfastForm.is_active,
      default_pickup_address: steadfastForm.default_pickup_address,
    });
  };

  const handleSavePathao = async () => {
    await upsertIntegration.mutateAsync({
      provider: 'pathao',
      api_key: pathaoForm.api_key,
      api_secret: pathaoForm.api_secret,
      store_id: pathaoForm.store_id,
      is_active: pathaoForm.is_active,
      default_pickup_address: pathaoForm.default_pickup_address,
      // Pathao OAuth needs the merchant panel login; password is encrypted +
      // redacted server-side, so it is re-entered on each edit.
      settings: { username: pathaoForm.username, password: pathaoForm.password },
    } as Parameters<typeof upsertIntegration.mutateAsync>[0]);
  };

  if (integrationsLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5" />
            Courier Integrations
          </CardTitle>
          <CardDescription>
            Connect with courier services for automated parcel booking
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="steadfast">
            <TabsList className="mb-4">
              <TabsTrigger value="steadfast" className="gap-2">
                Steadfast
                {steadfastIntegration?.is_active && (
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                )}
              </TabsTrigger>
              <TabsTrigger value="pathao" className="gap-2">
                Pathao
                {pathaoIntegration?.is_active && (
                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                )}
              </TabsTrigger>
            </TabsList>

            {/* Steadfast Tab */}
            <TabsContent value="steadfast" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Steadfast Courier</h3>
                  <p className="text-sm text-muted-foreground">
                    Bangladesh's leading logistics provider
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={steadfastForm.is_active}
                    onCheckedChange={(checked) => setSteadfastForm({ ...steadfastForm, is_active: checked })}
                  />
                  <Badge variant={steadfastForm.is_active ? 'default' : 'secondary'}>
                    {steadfastForm.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="steadfast-api-key">API Key</Label>
                    <Input
                      id="steadfast-api-key"
                      type="password"
                      value={steadfastForm.api_key}
                      onChange={(e) => setSteadfastForm({ ...steadfastForm, api_key: e.target.value })}
                      placeholder="Your Steadfast API key"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="steadfast-api-secret">Secret Key</Label>
                    <Input
                      id="steadfast-api-secret"
                      type="password"
                      value={steadfastForm.api_secret}
                      onChange={(e) => setSteadfastForm({ ...steadfastForm, api_secret: e.target.value })}
                      placeholder="Your Steadfast Secret key"
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Default Pickup Address</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Sender Name</Label>
                      <Input
                        value={steadfastForm.default_pickup_address.name}
                        onChange={(e) => setSteadfastForm({
                          ...steadfastForm,
                          default_pickup_address: { ...steadfastForm.default_pickup_address, name: e.target.value }
                        })}
                        placeholder="Business Name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        value={steadfastForm.default_pickup_address.phone}
                        onChange={(e) => setSteadfastForm({
                          ...steadfastForm,
                          default_pickup_address: { ...steadfastForm.default_pickup_address, phone: e.target.value }
                        })}
                        placeholder="+880 1XXXXXXXXX"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Address</Label>
                      <Textarea
                        value={steadfastForm.default_pickup_address.address}
                        onChange={(e) => setSteadfastForm({
                          ...steadfastForm,
                          default_pickup_address: { ...steadfastForm.default_pickup_address, address: e.target.value }
                        })}
                        placeholder="Full pickup address"
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input
                        value={steadfastForm.default_pickup_address.city}
                        onChange={(e) => setSteadfastForm({
                          ...steadfastForm,
                          default_pickup_address: { ...steadfastForm.default_pickup_address, city: e.target.value }
                        })}
                        placeholder="Dhaka"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Button onClick={handleSaveSteadfast} disabled={upsertIntegration.isPending}>
                {upsertIntegration.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Steadfast Settings
              </Button>
            </TabsContent>

            {/* Pathao Tab */}
            <TabsContent value="pathao" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium">Pathao Courier</h3>
                  <p className="text-sm text-muted-foreground">
                    On-demand delivery in Bangladesh
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={pathaoForm.is_active}
                    onCheckedChange={(checked) => setPathaoForm({ ...pathaoForm, is_active: checked })}
                  />
                  <Badge variant={pathaoForm.is_active ? 'default' : 'secondary'}>
                    {pathaoForm.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="pathao-api-key">Client ID</Label>
                    <Input
                      id="pathao-api-key"
                      value={pathaoForm.api_key}
                      onChange={(e) => setPathaoForm({ ...pathaoForm, api_key: e.target.value })}
                      placeholder="Your Pathao Client ID"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pathao-api-secret">Client Secret</Label>
                    <Input
                      id="pathao-api-secret"
                      type="password"
                      value={pathaoForm.api_secret}
                      onChange={(e) => setPathaoForm({ ...pathaoForm, api_secret: e.target.value })}
                      placeholder="Your Pathao Client Secret"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pathao-store-id">Store ID</Label>
                  <Input
                    id="pathao-store-id"
                    value={pathaoForm.store_id}
                    onChange={(e) => setPathaoForm({ ...pathaoForm, store_id: e.target.value })}
                    placeholder="Your Pathao Store ID"
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="pathao-username">Merchant Username (email)</Label>
                    <Input
                      id="pathao-username"
                      value={pathaoForm.username}
                      onChange={(e) => setPathaoForm({ ...pathaoForm, username: e.target.value })}
                      placeholder="Pathao panel login email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pathao-password">Merchant Password</Label>
                    <Input
                      id="pathao-password"
                      type="password"
                      value={pathaoForm.password}
                      onChange={(e) => setPathaoForm({ ...pathaoForm, password: e.target.value })}
                      placeholder="Pathao panel password"
                    />
                  </div>
                </div>

                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">Default Pickup Address</h4>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Sender Name</Label>
                      <Input
                        value={pathaoForm.default_pickup_address.name}
                        onChange={(e) => setPathaoForm({
                          ...pathaoForm,
                          default_pickup_address: { ...pathaoForm.default_pickup_address, name: e.target.value }
                        })}
                        placeholder="Business Name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Phone</Label>
                      <Input
                        value={pathaoForm.default_pickup_address.phone}
                        onChange={(e) => setPathaoForm({
                          ...pathaoForm,
                          default_pickup_address: { ...pathaoForm.default_pickup_address, phone: e.target.value }
                        })}
                        placeholder="+880 1XXXXXXXXX"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label>Address</Label>
                      <Textarea
                        value={pathaoForm.default_pickup_address.address}
                        onChange={(e) => setPathaoForm({
                          ...pathaoForm,
                          default_pickup_address: { ...pathaoForm.default_pickup_address, address: e.target.value }
                        })}
                        placeholder="Full pickup address"
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input
                        value={pathaoForm.default_pickup_address.city}
                        onChange={(e) => setPathaoForm({
                          ...pathaoForm,
                          default_pickup_address: { ...pathaoForm.default_pickup_address, city: e.target.value }
                        })}
                        placeholder="Dhaka"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Zone</Label>
                      <Input
                        value={pathaoForm.default_pickup_address.zone}
                        onChange={(e) => setPathaoForm({
                          ...pathaoForm,
                          default_pickup_address: { ...pathaoForm.default_pickup_address, zone: e.target.value }
                        })}
                        placeholder="Zone ID"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Area</Label>
                      <Input
                        value={pathaoForm.default_pickup_address.area}
                        onChange={(e) => setPathaoForm({
                          ...pathaoForm,
                          default_pickup_address: { ...pathaoForm.default_pickup_address, area: e.target.value }
                        })}
                        placeholder="Area ID"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <Button onClick={handleSavePathao} disabled={upsertIntegration.isPending}>
                {upsertIntegration.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Pathao Settings
              </Button>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
