import { useParams, useNavigate } from 'react-router-dom';
import AdminLayout from '@/components/layout/AdminLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { m, pageEnter, staggerContainer, staggerItem } from '@/lib/motion';
import { Zap, Bot, FileText, Radio, Calendar, MessageSquare } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import AdminQuickRepliesManager from '@/components/admin/AdminQuickRepliesManager';
import AdminWhatsAppAutoMessagesManager from '@/components/admin/AdminWhatsAppAutoMessagesManager';

type WaTab = {
  id: string;
  label: string;
  icon: LucideIcon;
  placeholder?: boolean;
};

const TABS: WaTab[] = [
  { id: 'quick-replies', label: 'Quick Replies', icon: Zap },
  { id: 'auto-messages', label: 'Auto Messages', icon: Bot },
  { id: 'templates', label: 'Templates', icon: FileText, placeholder: true },
  { id: 'broadcasts', label: 'Broadcasts', icon: Radio, placeholder: true },
  { id: 'scheduled', label: 'Scheduled', icon: Calendar, placeholder: true },
];

/**
 * "Coming soon" placeholder rendered as a calm, tokenised feature card.
 * status pill = `neutral-soft` (not-yet-live), whatsapp-tinted icon chip — no orange focal.
 */
function ComingSoonCard({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <Card className="rounded-card shadow-elevation-1">
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-whatsapp-light text-whatsapp">
              <Icon className="h-5 w-5" aria-hidden />
            </span>
            <div className="space-y-1">
              <CardTitle className="text-base">{title}</CardTitle>
              <p className="text-sm text-muted-foreground">{description}</p>
            </div>
          </div>
          <Badge variant="neutral-soft" className="shrink-0 gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/60" aria-hidden />
            Coming soon
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          This tool is on the roadmap and will appear here once it ships.
        </p>
      </CardContent>
    </Card>
  );
}

export default function AdminWhatsAppFunctions() {
  const { tab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();

  const activeTab = tab || 'quick-replies';

  const handleTabChange = (value: string) => {
    navigate(`/admin/whatsapp-functions/${value}`, { replace: true });
  };

  return (
    <AdminLayout>
      <m.div
        variants={pageEnter}
        initial="hidden"
        animate="show"
        className="mx-auto w-full max-w-[1440px] space-y-6 p-4 md:p-6"
      >
        {/* Header — whatsapp channel chip keeps the accent on-brand, no orange focal. */}
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-card bg-whatsapp-light text-whatsapp">
              <MessageSquare className="h-5 w-5" aria-hidden />
            </span>
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                WA Functions
              </h1>
              <p className="text-sm text-muted-foreground">
                WhatsApp tools and automation for admin business communication
              </p>
            </div>
          </div>
        </header>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          {/* Pill tab-track — horizontal scroll on small screens, no wrap, no page overflow. */}
          <div className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
            <TabsList className="w-max">
              {TABS.map((t) => {
                const Icon = t.icon;
                return (
                  <TabsTrigger
                    key={t.id}
                    value={t.id}
                    className="h-11 gap-2 sm:h-9"
                    disabled={t.placeholder}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{t.label}</span>
                    {t.placeholder && (
                      <span className="hidden text-xs text-muted-foreground sm:inline">Soon</span>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

          <TabsContent value="quick-replies">
            <AdminQuickRepliesManager />
          </TabsContent>

          <TabsContent value="auto-messages">
            <AdminWhatsAppAutoMessagesManager />
          </TabsContent>

          <TabsContent value="templates">
            <m.div variants={staggerContainer} initial="hidden" animate="show">
              <m.div variants={staggerItem}>
                <ComingSoonCard
                  icon={FileText}
                  title="Message Templates"
                  description="WhatsApp message templates coming soon"
                />
              </m.div>
            </m.div>
          </TabsContent>

          <TabsContent value="broadcasts">
            <m.div variants={staggerContainer} initial="hidden" animate="show">
              <m.div variants={staggerItem}>
                <ComingSoonCard
                  icon={Radio}
                  title="Broadcasts"
                  description="Broadcast messaging coming soon"
                />
              </m.div>
            </m.div>
          </TabsContent>

          <TabsContent value="scheduled">
            <m.div variants={staggerContainer} initial="hidden" animate="show">
              <m.div variants={staggerItem}>
                <ComingSoonCard
                  icon={Calendar}
                  title="Scheduled Messages"
                  description="Schedule messages to send later"
                />
              </m.div>
            </m.div>
          </TabsContent>
        </Tabs>
      </m.div>
    </AdminLayout>
  );
}
