import { Bot, MessageSquare, Zap, BookOpen, Sparkles } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { KpiCard } from '@/components/dashboard/bento/KpiCard';
import { m, staggerContainer, staggerItem } from '@/lib/motion';

interface AiAgentOverviewProps {
  isEnabled: boolean;
  saving: boolean;
  knowledgeCount: number;
  onToggle: () => void;
}

/**
 * AiAgent header + KPI strip — the calm config-page top (DESIGN.md §6).
 * The single full-orange surface on this page is the enable hero: the AI's on/off
 * state is the page's focal action, so it owns `bg-primary`. Every other stat uses a
 * soft KpiCard. Presentation only — receives state + a toggle callback from the page.
 */
export function AiAgentOverview({ isEnabled, saving, knowledgeCount, onToggle }: AiAgentOverviewProps) {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent text-primary">
            <Bot className="h-5 w-5" aria-hidden />
          </span>
          AI Agent
        </h1>
        <p className="text-sm text-muted-foreground">
          Configure your AI assistant for automated customer responses
        </p>
      </header>

      <m.div
        variants={staggerContainer}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4"
      >
        {/* The ONE orange surface: enable hero. */}
        <m.div
          variants={staggerItem}
          whileHover={{ y: -2 }}
          transition={{ duration: 0.15 }}
          className="col-span-2 h-full lg:col-span-1"
        >
          <div className="relative flex h-full min-h-[140px] flex-col overflow-hidden rounded-card bg-primary p-5 text-primary-foreground shadow-elevation-2">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-black/10"
            />
            <div className="relative z-10 flex h-full flex-col">
              <div className="flex items-center justify-between">
                <span className="inline-flex items-center gap-2 text-sm font-medium text-primary-foreground/85">
                  <Sparkles className="h-4 w-4" aria-hidden />
                  Assistant
                </span>
                <Badge
                  variant="outline"
                  className="border-white/30 bg-white/15 text-primary-foreground"
                >
                  {isEnabled ? 'Active' : 'Inactive'}
                </Badge>
              </div>

              <p className="mt-2 text-2xl font-bold leading-none tracking-tight md:text-3xl">
                {isEnabled ? 'Enabled' : 'Disabled'}
              </p>

              <div className="mt-auto flex items-center gap-2">
                <Switch
                  id="ai-enabled"
                  checked={isEnabled}
                  onCheckedChange={onToggle}
                  disabled={saving}
                  className="data-[state=checked]:bg-white/90 data-[state=unchecked]:bg-white/25"
                />
                <Label htmlFor="ai-enabled" className="cursor-pointer text-xs font-medium text-primary-foreground/85">
                  {isEnabled ? 'Responding to customers' : 'Turn on to start'}
                </Label>
              </div>
            </div>
          </div>
        </m.div>

        <m.div variants={staggerItem}>
          <KpiCard title="AI Responses Today" value={0} icon={MessageSquare} tone="info" />
        </m.div>
        <m.div variants={staggerItem}>
          <KpiCard title="Avg Response Time" value={2} format={(v) => `~${Math.round(v)}s`} icon={Zap} tone="success" />
        </m.div>
        <m.div variants={staggerItem}>
          <KpiCard title="Knowledge Items" value={knowledgeCount} icon={BookOpen} tone="primary" />
        </m.div>
      </m.div>
    </div>
  );
}
