import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { KPITarget, TeamMemberStats } from '@/hooks/useTeamReports';
import { Plus, Trash2, Target } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface KPITargetManagerProps {
  targets: KPITarget[];
  teamStats: TeamMemberStats[];
  onSave: (target: { metric: string; targetValue: number; period: string; userId?: string }) => void;
  onDelete: (id: string) => void;
  isLoading: boolean;
}

const METRICS = [
  { value: 'messages_per_day', label: 'Messages per Day' },
  { value: 'orders_per_day', label: 'Orders per Day' },
  { value: 'sales_amount', label: 'Sales Amount (৳)' },
  { value: 'response_time_minutes', label: 'Response Time (minutes)' },
  { value: 'conversion_rate', label: 'Conversion Rate (%)' },
];

const PERIODS = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

export function KPITargetManager({ 
  targets, 
  teamStats, 
  onSave, 
  onDelete, 
  isLoading 
}: KPITargetManagerProps) {
  const [showForm, setShowForm] = useState(false);
  const [metric, setMetric] = useState('');
  const [targetValue, setTargetValue] = useState('');
  const [period, setPeriod] = useState('daily');
  const [userId, setUserId] = useState('all');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!metric || !targetValue) return;

    onSave({
      metric,
      targetValue: Number(targetValue),
      period,
      userId: userId === 'all' ? undefined : userId,
    });

    setMetric('');
    setTargetValue('');
    setPeriod('daily');
    setUserId('all');
    setShowForm(false);
  };

  const getMetricLabel = (value: string) => {
    return METRICS.find(m => m.value === value)?.label || value;
  };

  const getPeriodLabel = (value: string) => {
    return PERIODS.find(p => p.value === value)?.label || value;
  };

  const getMemberName = (id: string | null) => {
    if (!id) return 'All Team Members';
    const member = teamStats.find(m => m.userId === id);
    return member?.name || 'Unknown';
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                KPI Targets
              </CardTitle>
              <CardDescription>
                Set performance targets for your team members
              </CardDescription>
            </div>
            <Button onClick={() => setShowForm(!showForm)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Target
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showForm && (
            <form onSubmit={handleSubmit} className="mb-6 p-4 border rounded-lg bg-muted/50">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-2">
                  <Label>Metric</Label>
                  <Select value={metric} onValueChange={setMetric}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select metric" />
                    </SelectTrigger>
                    <SelectContent>
                      {METRICS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Target Value</Label>
                  <Input
                    type="number"
                    placeholder="Enter target"
                    value={targetValue}
                    onChange={(e) => setTargetValue(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Period</Label>
                  <Select value={period} onValueChange={setPeriod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PERIODS.map((p) => (
                        <SelectItem key={p.value} value={p.value}>
                          {p.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Apply To</Label>
                  <Select value={userId} onValueChange={setUserId}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Team Members</SelectItem>
                      {teamStats.map((member) => (
                        <SelectItem key={member.userId} value={member.userId}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <Button type="submit" disabled={!metric || !targetValue}>
                  Save Target
                </Button>
                <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
              </div>
            </form>
          )}

          {targets.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Target className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No KPI targets set yet</p>
              <p className="text-sm">Click "Add Target" to create your first target</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead>Target</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Applied To</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {targets.map((target) => (
                  <TableRow key={target.id}>
                    <TableCell className="font-medium">
                      {getMetricLabel(target.metric)}
                    </TableCell>
                    <TableCell>
                      {target.metric === 'sales_amount' 
                        ? `৳${target.targetValue.toLocaleString()}`
                        : target.metric === 'conversion_rate'
                        ? `${target.targetValue}%`
                        : target.metric === 'response_time_minutes'
                        ? `${target.targetValue} min`
                        : target.targetValue
                      }
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{getPeriodLabel(target.period)}</Badge>
                    </TableCell>
                    <TableCell>
                      {getMemberName(target.userId)}
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete KPI Target</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete this target? This action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => onDelete(target.id)}>
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
