import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/layout/AdminLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Zap, Bot, FileText, Radio, Calendar } from 'lucide-react';
import AdminQuickRepliesManager from '@/components/admin/AdminQuickRepliesManager';
import AdminWhatsAppAutoMessagesManager from '@/components/admin/AdminWhatsAppAutoMessagesManager';

const TABS = [
  { id: 'quick-replies', label: 'Quick Replies', icon: Zap },
  { id: 'auto-messages', label: 'Auto Messages', icon: Bot },
  { id: 'templates', label: 'Templates', icon: FileText, placeholder: true },
  { id: 'broadcasts', label: 'Broadcasts', icon: Radio, placeholder: true },
  { id: 'scheduled', label: 'Scheduled', icon: Calendar, placeholder: true },
];

export default function AdminWhatsAppFunctions() {
  const { tab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();
  
  const activeTab = tab || 'quick-replies';

  const handleTabChange = (value: string) => {
    navigate(`/admin/whatsapp-functions/${value}`, { replace: true });
  };

  return (
    <AdminLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Zap className="h-8 w-8 text-primary" />
            WA Functions
          </h1>
          <p className="text-muted-foreground mt-1">
            WhatsApp tools and automation for admin business communication
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
          <TabsList className="flex flex-wrap gap-1 h-auto p-1.5">
            {TABS.map((t) => {
              const Icon = t.icon;
              return (
                <TabsTrigger
                  key={t.id}
                  value={t.id}
                  className="flex items-center gap-2 px-4 py-2"
                  disabled={t.placeholder}
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{t.label}</span>
                  {t.placeholder && (
                    <span className="text-xs text-muted-foreground ml-1">(Soon)</span>
                  )}
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value="quick-replies" className="mt-6">
            <AdminQuickRepliesManager />
          </TabsContent>

          <TabsContent value="auto-messages" className="mt-6">
            <AdminWhatsAppAutoMessagesManager />
          </TabsContent>

          <TabsContent value="templates" className="mt-6">
            <div className="flex items-center justify-center py-16 text-center">
              <div>
                <FileText className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">Templates</h3>
                <p className="text-muted-foreground mt-2">
                  WhatsApp message templates coming soon
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="broadcasts" className="mt-6">
            <div className="flex items-center justify-center py-16 text-center">
              <div>
                <Radio className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">Broadcasts</h3>
                <p className="text-muted-foreground mt-2">
                  Broadcast messaging coming soon
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="scheduled" className="mt-6">
            <div className="flex items-center justify-center py-16 text-center">
              <div>
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <h3 className="mt-4 text-lg font-semibold">Scheduled Messages</h3>
                <p className="text-muted-foreground mt-2">
                  Schedule messages to send later
                </p>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
