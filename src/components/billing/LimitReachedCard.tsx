import { AlertTriangle, Smartphone, Users, MessageSquare, ArrowUpRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

interface LimitReachedCardProps {
  resourceType: 'instance' | 'agent' | 'message';
  current: number;
  max: number;
  currentPlanName?: string;
  onUpgrade?: () => void;
  compact?: boolean;
}

const resourceConfig = {
  instance: {
    icon: Smartphone,
    title: 'WhatsApp Limit Reached',
    description: (max: number, planName?: string) => 
      `Your ${planName || 'current'} plan allows ${max} WhatsApp account${max !== 1 ? 's' : ''}.`,
    upgradeText: 'Upgrade to add more WhatsApp accounts.',
  },
  agent: {
    icon: Users,
    title: 'Team Member Limit Reached',
    description: (max: number, planName?: string) => 
      `Your ${planName || 'current'} plan allows ${max} team member${max !== 1 ? 's' : ''}.`,
    upgradeText: 'Upgrade to add more team members.',
  },
  message: {
    icon: MessageSquare,
    title: 'Message Limit Reached',
    description: (max: number, planName?: string) => 
      `Your ${planName || 'current'} plan allows ${max.toLocaleString()} messages per month.`,
    upgradeText: 'Upgrade to send more messages.',
  },
};

export function LimitReachedCard({
  resourceType,
  current,
  max,
  currentPlanName,
  onUpgrade,
  compact = false,
}: LimitReachedCardProps) {
  const navigate = useNavigate();
  const config = resourceConfig[resourceType];
  const Icon = config.icon;

  const handleUpgrade = () => {
    if (onUpgrade) {
      onUpgrade();
    } else {
      navigate('/billing');
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
        <AlertTriangle className="h-4 w-4 text-destructive shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-destructive">{config.title}</p>
          <p className="text-xs text-muted-foreground truncate">
            {current}/{max} used • {config.upgradeText}
          </p>
        </div>
        <Button size="sm" variant="destructive" onClick={handleUpgrade}>
          Upgrade
        </Button>
      </div>
    );
  }

  return (
    <Card className="border-destructive/20 bg-destructive/5">
      <CardContent className="flex flex-col sm:flex-row sm:items-center gap-4 py-4">
        <div className="h-12 w-12 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
          <Icon className="h-6 w-6 text-destructive" />
        </div>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-destructive" />
            <h3 className="font-semibold text-destructive">{config.title}</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            {config.description(max, currentPlanName)} {config.upgradeText}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => navigate('/billing')}>
            Compare Plans
          </Button>
          <Button size="sm" onClick={handleUpgrade}>
            Upgrade Now
            <ArrowUpRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// Badge component to show current usage
export function UsageBadge({ 
  current, 
  max, 
  resourceType 
}: { 
  current: number; 
  max: number; 
  resourceType: 'instance' | 'agent' | 'message';
}) {
  const isAtLimit = current >= max;
  const isNearLimit = (current / max) >= 0.8;

  const labels = {
    instance: 'WhatsApp',
    agent: 'Members',
    message: 'Messages',
  };

  return (
    <span 
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium
        ${isAtLimit 
          ? 'bg-destructive/10 text-destructive border border-destructive/20' 
          : isNearLimit 
            ? 'bg-yellow-500/10 text-yellow-600 border border-yellow-500/20' 
            : 'bg-muted text-muted-foreground'
        }
      `}
    >
      {resourceType === 'message' 
        ? `${current.toLocaleString()}/${max.toLocaleString()}`
        : `${current}/${max}`
      }
      {' '}{labels[resourceType]} Used
    </span>
  );
}
