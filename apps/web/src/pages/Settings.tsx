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
import { m, pageEnter } from '@/lib/motion';
import { Zap, Shield, Palette, Building2, User, ShoppingBag, FileText, Truck, Facebook, Send, Star } from 'lucide-react';

const SETTINGS_TABS = [
  { value: 'profile', label: 'Profile', icon: User },
  { value: 'workspace', label: 'Workspace', icon: Building2 },
  { value: 'quick-replies', label: 'Quick Replies', icon: Zap },
  { value: 'feedback', label: 'Feedback', icon: Star },
  { value: 'invoice', label: 'Invoice', icon: FileText },
  { value: 'courier', label: 'Courier', icon: Truck },
  { value: 'facebook', label: 'Facebook', icon: Facebook },
  { value: 'integrations', label: 'Integrations', icon: ShoppingBag },
  { value: 'appearance', label: 'Appearance', icon: Palette },
  { value: 'notifications', label: 'Telegram', icon: Send },
  { value: 'security', label: 'Security', icon: Shield },
] as const;

export default function Settings() {
  const { tab } = useParams();
  const navigate = useNavigate();

  // Map URL param to valid tab value, default to 'profile'
  const validTabs = SETTINGS_TABS.map((t) => t.value) as string[];
  const activeTab = tab && validTabs.includes(tab) ? tab : 'profile';

  const handleTabChange = (value: string) => {
    navigate(`/settings/${value}`, { replace: true });
  };

  return (
    <DashboardLayout>
      <m.div
        variants={pageEnter}
        initial="hidden"
        animate="show"
        className="mx-auto w-full max-w-[1440px] space-y-6 p-4 md:p-6"
      >
        {/* Header */}
        <header className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your workspace and profile settings</p>
        </header>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          {/* Pill tab-track — scrolls horizontally on small screens, no wrap, no page overflow. */}
          <div className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
            <TabsList className="w-max">
              {SETTINGS_TABS.map(({ value, label, icon: Icon }) => (
                <TabsTrigger
                  key={value}
                  value={value}
                  className="h-11 gap-2 sm:h-9"
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{label}</span>
                </TabsTrigger>
              ))}
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
      </m.div>
    </DashboardLayout>
  );
}
