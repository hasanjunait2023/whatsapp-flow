import DashboardLayout from '@/components/layout/DashboardLayout';
import { TelegramLinkCard } from '@/components/ceo/TelegramLinkCard';
import { CeoScheduleCard } from '@/components/ceo/CeoScheduleCard';
import { CeoReportsCard } from '@/components/ceo/CeoReportsCard';
import { Briefcase } from 'lucide-react';

// TODO i18n: hardcoded English strings

export default function CeoAgent() {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" />
            CEO Agent
          </h1>
          <p className="text-muted-foreground">
            Automated business reports and marketing ideas, delivered in-app and to Telegram
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <TelegramLinkCard />
          <CeoScheduleCard />
        </div>

        <CeoReportsCard />
      </div>
    </DashboardLayout>
  );
}
