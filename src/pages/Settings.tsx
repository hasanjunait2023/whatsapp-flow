import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '@/components/layout/DashboardLayout';
import QuickRepliesManager from '@/components/inbox/QuickRepliesManager';
import WorkspaceSettings from '@/components/settings/WorkspaceSettings';
import AppearanceSettings from '@/components/settings/AppearanceSettings';
import ProfileSettings from '@/components/settings/ProfileSettings';
import { WooCommerceSettings } from '@/components/settings/WooCommerceSettings';
import { InvoiceSettings } from '@/components/settings/InvoiceSettings';
import { CourierSettings } from '@/components/settings/CourierSettings';
import { FacebookPagesSettings } from '@/components/settings/FacebookPagesSettings';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { FeedbackSettings } from '@/components/settings/FeedbackSettings';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Zap, Shield, Palette, Building2, User, ShoppingBag, FileText, Truck, Facebook, Send, Star } from 'lucide-react';

export default function Settings() {
  const { tab } = useParams();
  const navigate = useNavigate();
  
  // Map URL param to valid tab value, default to 'profile'
  const validTabs = ['profile', 'workspace', 'quick-replies', 'feedback', 'invoice', 'courier', 'facebook', 'integrations', 'appearance', 'notifications', 'security'];
  const activeTab = tab && validTabs.includes(tab) ? tab : 'profile';
  
  const handleTabChange = (value: string) => {
    navigate(`/settings/${value}`, { replace: true });
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground">Manage your workspace and profile settings</p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <div className="overflow-x-auto pb-2 -mx-2 px-2">
            <TabsList className="flex-wrap h-auto p-2 gap-2">
              <TabsTrigger value="profile" className="gap-2">
                <User className="h-4 w-4" />
                <span className="hidden sm:inline">Profile</span>
              </TabsTrigger>
              <TabsTrigger value="workspace" className="gap-2">
                <Building2 className="h-4 w-4" />
                <span className="hidden sm:inline">Workspace</span>
              </TabsTrigger>
              <TabsTrigger value="quick-replies" className="gap-2">
                <Zap className="h-4 w-4" />
                <span className="hidden sm:inline">Quick Replies</span>
              </TabsTrigger>
              <TabsTrigger value="feedback" className="gap-2">
                <Star className="h-4 w-4" />
                <span className="hidden sm:inline">Feedback</span>
              </TabsTrigger>
              <TabsTrigger value="invoice" className="gap-2">
                <FileText className="h-4 w-4" />
                <span className="hidden sm:inline">Invoice</span>
              </TabsTrigger>
              <TabsTrigger value="courier" className="gap-2">
                <Truck className="h-4 w-4" />
                <span className="hidden sm:inline">Courier</span>
              </TabsTrigger>
              <TabsTrigger value="facebook" className="gap-2">
                <Facebook className="h-4 w-4" />
                <span className="hidden sm:inline">Facebook</span>
              </TabsTrigger>
              <TabsTrigger value="integrations" className="gap-2">
                <ShoppingBag className="h-4 w-4" />
                <span className="hidden sm:inline">Integrations</span>
              </TabsTrigger>
              <TabsTrigger value="appearance" className="gap-2">
                <Palette className="h-4 w-4" />
                <span className="hidden sm:inline">Appearance</span>
              </TabsTrigger>
              <TabsTrigger value="notifications" className="gap-2">
                <Send className="h-4 w-4" />
                <span className="hidden sm:inline">Telegram</span>
              </TabsTrigger>
              <TabsTrigger value="security" className="gap-2">
                <Shield className="h-4 w-4" />
                <span className="hidden sm:inline">Security</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="profile">
            <ProfileSettings />
          </TabsContent>

          <TabsContent value="workspace">
            <WorkspaceSettings />
          </TabsContent>

          <TabsContent value="quick-replies">
            <QuickRepliesManager />
          </TabsContent>

          <TabsContent value="feedback">
            <FeedbackSettings />
          </TabsContent>

          <TabsContent value="invoice">
            <InvoiceSettings />
          </TabsContent>

          <TabsContent value="courier">
            <CourierSettings />
          </TabsContent>

          <TabsContent value="facebook">
            <FacebookPagesSettings />
          </TabsContent>

          <TabsContent value="integrations">
            <WooCommerceSettings />
          </TabsContent>

          <TabsContent value="appearance">
            <AppearanceSettings />
          </TabsContent>

          <TabsContent value="notifications">
            <NotificationSettings />
          </TabsContent>

          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Security
                </CardTitle>
                <CardDescription>
                  Manage your security settings
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Security settings coming soon...
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
