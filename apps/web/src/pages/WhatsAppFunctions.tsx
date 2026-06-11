import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '@/components/layout/DashboardLayout';
import QuickRepliesManager from '@/components/inbox/QuickRepliesManager';
import WhatsAppAutoMessagesManager from '@/components/whatsapp/WhatsAppAutoMessagesManager';
import { PageHeader } from '@/components/ui/page-header';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Zap, MessageSquare, Radio, Clock, Bot } from 'lucide-react';

export default function WhatsAppFunctions() {
  const { tab } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation('nav');

  const validTabs = ['quick-replies', 'auto-messages', 'templates', 'broadcasts', 'scheduled'];
  const activeTab = tab && validTabs.includes(tab) ? tab : 'quick-replies';

  const handleTabChange = (value: string) => {
    navigate(`/whatsapp-functions/${value}`, { replace: true });
  };

  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <PageHeader
          title={t('main.waFunctions')}
          description="Manage your WhatsApp messaging tools and templates"
        />

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          <div className="overflow-x-auto pb-2 -mx-2 px-2">
            <TabsList className="flex-wrap h-auto p-2 gap-2">
              <TabsTrigger value="quick-replies" className="gap-2">
                <Zap className="h-4 w-4" />
                <span className="hidden sm:inline">Quick Replies</span>
              </TabsTrigger>
              <TabsTrigger value="auto-messages" className="gap-2">
                <Bot className="h-4 w-4" />
                <span className="hidden sm:inline">Auto Messages</span>
              </TabsTrigger>
              <TabsTrigger value="templates" className="gap-2">
                <MessageSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Templates</span>
              </TabsTrigger>
              <TabsTrigger value="broadcasts" className="gap-2">
                <Radio className="h-4 w-4" />
                <span className="hidden sm:inline">Broadcasts</span>
              </TabsTrigger>
              <TabsTrigger value="scheduled" className="gap-2">
                <Clock className="h-4 w-4" />
                <span className="hidden sm:inline">Scheduled</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="quick-replies">
            <QuickRepliesManager />
          </TabsContent>

          <TabsContent value="auto-messages">
            <WhatsAppAutoMessagesManager />
          </TabsContent>

          <TabsContent value="templates">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5" />
                  Message Templates
                </CardTitle>
                <CardDescription>
                  WhatsApp Business API message templates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Message templates coming soon...
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="broadcasts">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Radio className="h-5 w-5" />
                  Broadcast Lists
                </CardTitle>
                <CardDescription>
                  Send bulk messages to multiple contacts
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Broadcast feature coming soon...
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scheduled">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Scheduled Messages
                </CardTitle>
                <CardDescription>
                  Schedule messages to be sent at specific times
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Scheduled messages coming soon...
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
