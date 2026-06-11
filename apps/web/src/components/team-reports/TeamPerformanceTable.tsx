import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TeamMemberStats } from '@/hooks/useTeamReports';
import { MemberDetailSheet } from './MemberDetailSheet';
import { ArrowUpDown, ChevronRight } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface TeamPerformanceTableProps {
  teamStats: TeamMemberStats[];
  isLoading: boolean;
}

type SortKey = 'name' | 'messagesSent' | 'ordersCreated' | 'totalSalesAmount' | 'kpiScore';

export function TeamPerformanceTable({ teamStats, isLoading }: TeamPerformanceTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('kpiScore');
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMemberStats | null>(null);
  const isMobile = useIsMobile();

  const sortedStats = [...teamStats].sort((a, b) => {
    const aVal = a[sortKey];
    const bVal = b[sortKey];
    if (typeof aVal === 'string' && typeof bVal === 'string') {
      return sortAsc ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    }
    return sortAsc ? (aVal as number) - (bVal as number) : (bVal as number) - (aVal as number);
  });

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  };

  const getKPIBadgeVariant = (score: number) => {
    if (score >= 80) return 'default';
    if (score >= 50) return 'secondary';
    return 'outline';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Team Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Mobile card view
  if (isMobile) {
    return (
      <>
        <div className="space-y-3">
          {sortedStats.map((member) => (
            <Card 
              key={member.userId} 
              className="cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => setSelectedMember(member)}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Avatar>
                    <AvatarImage src={member.avatarUrl || undefined} />
                    <AvatarFallback>
                      {member.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{member.name}</div>
                    <div className="text-xs text-muted-foreground capitalize">{member.role}</div>
                  </div>
                  <Badge variant={getKPIBadgeVariant(member.kpiScore)}>
                    {member.kpiScore.toFixed(0)}%
                  </Badge>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="mt-3 grid grid-cols-4 gap-2 text-center text-sm">
                  <div>
                    <div className="font-semibold">{member.messagesSent}</div>
                    <div className="text-xs text-muted-foreground">Msgs</div>
                  </div>
                  <div>
                    <div className="font-semibold">{member.ordersCreated}</div>
                    <div className="text-xs text-muted-foreground">Orders</div>
                  </div>
                  <div>
                    <div className="font-semibold">৳{member.totalSalesAmount.toLocaleString()}</div>
                    <div className="text-xs text-muted-foreground">Sales</div>
                  </div>
                  <div>
                    <div className="font-semibold">{member.customersAssigned}</div>
                    <div className="text-xs text-muted-foreground">Customers</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <MemberDetailSheet 
          member={selectedMember} 
          open={!!selectedMember}
          onOpenChange={(open) => !open && setSelectedMember(null)}
        />
      </>
    );
  }

  // Desktop table view
  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Team Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>
                  <Button variant="ghost" size="sm" onClick={() => handleSort('name')}>
                    Member <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead>Role</TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('messagesSent')}>
                    Messages <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('ordersCreated')}>
                    Orders <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('totalSalesAmount')}>
                    Sales <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
                <TableHead className="text-right">Customers</TableHead>
                <TableHead className="text-right">Parcels</TableHead>
                <TableHead className="text-right">
                  <Button variant="ghost" size="sm" onClick={() => handleSort('kpiScore')}>
                    KPI <ArrowUpDown className="ml-1 h-3 w-3" />
                  </Button>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedStats.map((member) => (
                <TableRow 
                  key={member.userId}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelectedMember(member)}
                >
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={member.avatarUrl || undefined} />
                        <AvatarFallback className="text-xs">
                          {member.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{member.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">
                      {member.role}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">{member.messagesSent}</TableCell>
                  <TableCell className="text-right">{member.ordersCreated}</TableCell>
                  <TableCell className="text-right">৳{member.totalSalesAmount.toLocaleString()}</TableCell>
                  <TableCell className="text-right">{member.customersAssigned}</TableCell>
                  <TableCell className="text-right">{member.parcelsBooked}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={getKPIBadgeVariant(member.kpiScore)}>
                      {member.kpiScore.toFixed(0)}%
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <MemberDetailSheet 
        member={selectedMember} 
        open={!!selectedMember}
        onOpenChange={(open) => !open && setSelectedMember(null)}
      />
    </>
  );
}
