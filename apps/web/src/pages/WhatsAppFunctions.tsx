import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import DashboardLayout from '@/components/layout/DashboardLayout';
import QuickRepliesManager from '@/components/inbox/QuickRepliesManager';
import WhatsAppAutoMessagesManager from '@/components/whatsapp/WhatsAppAutoMessagesManager';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { m, pageEnter, staggerContainer, staggerItem } from '@/lib/motion';
import { Zap, MessageSquare, Radio, Clock, Bot } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type WaTab = {
  value: string;
  label: string;
  icon: LucideIcon;
};

const WA_TABS: WaTab[] = [
  { value: 'quick-replies', label: 'Quick Replies', icon: Zap },
  { value: 'auto-messages', label: 'Auto Messages', icon: Bot },
  { value: 'templates', label: 'Templates', icon: MessageSquare },
  { value: 'broadcasts', label: 'Broadcasts', icon: Radio },
  { value: 'scheduled', label: 'Scheduled', icon: Clock },
];

/**
 * "Coming soon" placeholder rendered as a calm, tokenised feature card.
 * status pill = `neutral-soft` (disabled/not-yet-live), whatsapp-tinted icon chip.
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
    <Card className="shadow-elevation-1">
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

export default function WhatsAppFunctions() {
  const { tab } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation('nav');

  const validTabs = WA_TABS.map((tab) => tab.value);
  const activeTab = tab && validTabs.includes(tab) ? tab : 'quick-replies';

  const handleTabChange = (value: string) => {
    navigate(`/whatsapp-functions/${value}`, { replace: true });
  };

  return (
    <DashboardLayout>
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
                {t('main.waFunctions')}
              </h1>
              <p className="text-sm text-muted-foreground">
                Manage your WhatsApp messaging tools and templates
              </p>
            </div>
          </div>
        </header>

        <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
          {/* Pill tab-track — horizontal scroll on small screens, no wrap, no page overflow. */}
          <div className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
            <TabsList className="w-max">
              {WA_TABS.map(({ value, label, icon: Icon }) => (
                <TabsTrigger key={value} value={value} className="h-11 gap-2 sm:h-9">
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          <TabsContent value="quick-replies">
            <QuickRepliesManager />
          </TabsContent>

          <TabsContent value="auto-messages">
            <WhatsAppAutoMessagesManager />
          </TabsContent>

          <TabsContent value="templates">
            <m.div variants={staggerContainer} initial="hidden" animate="show">
              <m.div variants={staggerItem}>
                <ComingSoonCard
                  icon={MessageSquare}
                  title="Message Templates"
                  description="WhatsApp Business API message templates"
                />
              </m.div>
            </m.div>
          </TabsContent>

          <TabsContent value="broadcasts">
            <m.div variants={staggerContainer} initial="hidden" animate="show">
              <m.div variants={staggerItem}>
                <ComingSoonCard
                  icon={Radio}
                  title="Broadcast Lists"
                  description="Send bulk messages to multiple contacts"
                />
              </m.div>
            </m.div>
          </TabsContent>

          <TabsContent value="scheduled">
            <m.div variants={staggerContainer} initial="hidden" animate="show">
              <m.div variants={staggerItem}>
                <ComingSoonCard
                  icon={Clock}
                  title="Scheduled Messages"
                  description="Schedule messages to be sent at specific times"
                />
              </m.div>
            </m.div>
          </TabsContent>
        </Tabs>
      </m.div>
    </DashboardLayout>
  );
}
