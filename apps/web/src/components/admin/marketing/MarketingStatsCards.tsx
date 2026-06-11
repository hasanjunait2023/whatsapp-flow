import { Card, CardContent } from '@/components/ui/card';
import { Target, Users, CheckCircle2, XCircle, TrendingUp, Pause } from 'lucide-react';

interface MarketingStatsCardsProps {
  totalCampaigns: number;
  activeCampaigns: number;
  totalEnrollments: number;
  activeEnrollments: number;
  completedEnrollments: number;
  unsubscribedEnrollments: number;
}

export default function MarketingStatsCards({
  totalCampaigns,
  activeCampaigns,
  totalEnrollments,
  activeEnrollments,
  completedEnrollments,
  unsubscribedEnrollments,
}: MarketingStatsCardsProps) {
  const stats = [
    {
      title: 'মোট ক্যাম্পেইন',
      value: totalCampaigns,
      subValue: `${activeCampaigns} অ্যাক্টিভ`,
      icon: Target,
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
    },
    {
      title: 'মোট এনরোলমেন্ট',
      value: totalEnrollments,
      subValue: `${activeEnrollments} চলমান`,
      icon: Users,
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
    },
    {
      title: 'সম্পন্ন',
      value: completedEnrollments,
      subValue: 'জার্নি শেষ',
      icon: CheckCircle2,
      color: 'text-emerald-500',
      bgColor: 'bg-emerald-500/10',
    },
    {
      title: 'আনসাবস্ক্রাইব',
      value: unsubscribedEnrollments,
      subValue: 'অপ্ট-আউট',
      icon: XCircle,
      color: 'text-red-500',
      bgColor: 'bg-red-500/10',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {stats.map((stat, index) => (
        <Card key={index}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{stat.title}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
                <p className="text-xs text-muted-foreground mt-1">{stat.subValue}</p>
              </div>
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
