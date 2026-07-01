import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { TeamMemberStats } from '@/hooks/useTeamReports';
import { 
  Trophy, 
  MessageSquare, 
  DollarSign, 
  Clock, 
  TrendingUp 
} from 'lucide-react';

interface TeamLeaderboardProps {
  teamStats: TeamMemberStats[];
  isLoading: boolean;
}

interface LeaderboardCategory {
  title: string;
  icon: React.ElementType;
  iconColor: string;
  getScore: (member: TeamMemberStats) => number;
  formatScore: (score: number) => string;
  sortDesc: boolean;
}

const categories: LeaderboardCategory[] = [
  {
    title: 'Top Sellers',
    icon: DollarSign,
    iconColor: 'text-emerald-500',
    getScore: (m) => m.totalSalesAmount,
    formatScore: (s) => `৳${s.toLocaleString()}`,
    sortDesc: true,
  },
  {
    title: 'Most Active',
    icon: MessageSquare,
    iconColor: 'text-blue-500',
    getScore: (m) => m.messagesSent,
    formatScore: (s) => `${s} messages`,
    sortDesc: true,
  },
  {
    title: 'Fastest Responders',
    icon: Clock,
    iconColor: 'text-violet-500',
    getScore: (m) => m.avgResponseTimeMinutes,
    formatScore: (s) => `${s.toFixed(1)} min`,
    sortDesc: false,
  },
  {
    title: 'Best Converters',
    icon: TrendingUp,
    iconColor: 'text-purple-500',
    getScore: (m) => m.conversionRate,
    formatScore: (s) => `${s.toFixed(1)}%`,
    sortDesc: true,
  },
];

const medals = ['🥇', '🥈', '🥉'];

export function TeamLeaderboard({ teamStats, isLoading }: TeamLeaderboardProps) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-5 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3].map((j) => (
                  <Skeleton key={j} className="h-12 w-full" />
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {categories.map((category) => {
        const sorted = [...teamStats].sort((a, b) => {
          const aScore = category.getScore(a);
          const bScore = category.getScore(b);
          return category.sortDesc ? bScore - aScore : aScore - bScore;
        });

        const top3 = sorted.slice(0, 3);

        return (
          <Card key={category.title}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <category.icon className={`h-5 w-5 ${category.iconColor}`} />
                {category.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {top3.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No data available
                  </p>
                ) : (
                  top3.map((member, index) => (
                    <div 
                      key={member.userId}
                      className="flex items-center gap-3 p-2 rounded-lg bg-muted/50"
                    >
                      <span className="text-xl w-8 text-center">
                        {medals[index] || (index + 1)}
                      </span>
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.avatarUrl || undefined} />
                        <AvatarFallback className="text-xs">
                          {member.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate text-sm">
                          {member.name}
                        </div>
                      </div>
                      <div className="font-semibold text-sm">
                        {category.formatScore(category.getScore(member))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        );
      })}

      {/* Overall KPI Leaders */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-500" />
            Overall KPI Leaders
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            {teamStats.slice(0, 3).map((member, index) => (
              <div 
                key={member.userId}
                className={`flex flex-col items-center p-4 rounded-lg ${
                  index === 0 
                    ? 'bg-yellow-500/10 border border-yellow-500/20' 
                    : 'bg-muted/50'
                }`}
              >
                <span className="text-2xl mb-2">{medals[index]}</span>
                <Avatar className="h-12 w-12 mb-2">
                  <AvatarImage src={member.avatarUrl || undefined} />
                  <AvatarFallback>
                    {member.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="font-medium text-center">{member.name}</div>
                <div className="text-2xl font-bold mt-1">
                  {member.kpiScore.toFixed(0)}%
                </div>
                <div className="text-xs text-muted-foreground">KPI Score</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
