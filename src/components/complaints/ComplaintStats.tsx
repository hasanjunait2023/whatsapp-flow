import { AlertCircle, Clock, CheckCircle, AlertTriangle } from 'lucide-react';
import { StatCard } from '@/components/ui/stat-card';
import { ComplaintStats as Stats } from '@/hooks/useComplaints';

interface ComplaintStatsProps {
  stats: Stats;
}

export function ComplaintStats({ stats }: ComplaintStatsProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        title="Open"
        value={stats.open}
        icon={AlertCircle}
        iconColor="text-amber-500"
      />
      <StatCard
        title="In Progress"
        value={stats.in_progress}
        icon={Clock}
        iconColor="text-blue-500"
      />
      <StatCard
        title="Resolved"
        value={stats.resolved}
        icon={CheckCircle}
        iconColor="text-green-500"
      />
      <StatCard
        title="Critical"
        value={stats.critical}
        icon={AlertTriangle}
        iconColor="text-destructive"
      />
    </div>
  );
}
