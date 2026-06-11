import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Target,
  Plus,
  Trash2,
  Crown,
  Medal,
  Award,
  Star,
  Sparkles,
  Loader2,
  TrendingUp,
} from 'lucide-react';
import { useCustomerSegments, ScoringRule } from '@/hooks/useCustomerSegments';

const CRITERIA_TYPES = [
  { value: 'order_count', label: 'Total Order Count', unit: 'orders' },
  { value: 'total_spent', label: 'Total Amount Spent', unit: 'BDT' },
  { value: 'avg_order_value', label: 'Average Order Value', unit: 'BDT' },
  { value: 'days_since_last_order', label: 'Days Since Last Order', unit: 'days' },
  { value: 'message_count', label: 'Message Count', unit: 'messages' },
];

const OPERATORS = [
  { value: '>=', label: 'Greater than or equal' },
  { value: '<=', label: 'Less than or equal' },
  { value: '=', label: 'Equal to' },
  { value: '>', label: 'Greater than' },
  { value: '<', label: 'Less than' },
  { value: 'between', label: 'Between' },
];

const TIER_CONFIG = {
  vip: { label: 'VIP', icon: Crown, color: 'text-amber-500', bg: 'bg-amber-100' },
  platinum: { label: 'Platinum', icon: Sparkles, color: 'text-purple-500', bg: 'bg-purple-100' },
  gold: { label: 'Gold', icon: Medal, color: 'text-yellow-500', bg: 'bg-yellow-100' },
  silver: { label: 'Silver', icon: Award, color: 'text-gray-400', bg: 'bg-gray-100' },
  bronze: { label: 'Bronze', icon: Star, color: 'text-orange-500', bg: 'bg-orange-100' },
  new: { label: 'New', icon: Star, color: 'text-blue-500', bg: 'bg-blue-100' },
};

export function CustomerScoringManager() {
  const { scoringRules, customerScores, loading, createScoringRule, deleteScoringRule } = useCustomerSegments();
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    criteria_type: 'order_count',
    operator: '>=',
    value_min: 0,
    value_max: null as number | null,
    points: 10,
    is_active: true,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      criteria_type: 'order_count',
      operator: '>=',
      value_min: 0,
      value_max: null,
      points: 10,
      is_active: true,
    });
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) return;

    await createScoringRule.mutateAsync({
      name: formData.name,
      description: formData.description || null,
      criteria_type: formData.criteria_type,
      operator: formData.operator,
      value_min: formData.value_min,
      value_max: formData.value_max,
      points: formData.points,
      is_active: formData.is_active,
    });

    setDialogOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    await deleteScoringRule.mutateAsync(id);
  };

  const getCriteriaLabel = (type: string) => {
    return CRITERIA_TYPES.find(c => c.value === type)?.label || type;
  };

  const getTierStats = () => {
    const tiers: Record<string, number> = {};
    customerScores.forEach(score => {
      tiers[score.score_tier] = (tiers[score.score_tier] || 0) + 1;
    });
    return tiers;
  };

  const tierStats = getTierStats();
  const maxScore = Math.max(...customerScores.map(s => s.score), 100);

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-40" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Scoring Rules */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Scoring Rules
              </CardTitle>
              <CardDescription>
                Define how customer scores are calculated
              </CardDescription>
            </div>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Rule
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {scoringRules.length === 0 ? (
            <div className="text-center py-8">
              <Target className="h-12 w-12 mx-auto text-muted-foreground/50" />
              <p className="mt-4 text-sm text-muted-foreground">
                No scoring rules defined yet
              </p>
              <Button className="mt-4" variant="outline" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Create First Rule
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {scoringRules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{rule.name}</span>
                      <Badge variant={rule.points >= 0 ? 'default' : 'destructive'}>
                        {rule.points >= 0 ? '+' : ''}{rule.points} pts
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {getCriteriaLabel(rule.criteria_type)} {rule.operator} {rule.value_min}
                      {rule.operator === 'between' && rule.value_max && ` - ${rule.value_max}`}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => handleDelete(rule.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Customer Tiers Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Customer Tiers
          </CardTitle>
          <CardDescription>
            Distribution of customers by score tier
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Object.entries(TIER_CONFIG).map(([tier, config]) => {
              const count = tierStats[tier] || 0;
              const percentage = customerScores.length > 0
                ? (count / customerScores.length) * 100
                : 0;
              const IconComp = config.icon;

              return (
                <div key={tier} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className={`p-1.5 rounded ${config.bg}`}>
                        <IconComp className={`h-4 w-4 ${config.color}`} />
                      </div>
                      <span className="font-medium">{config.label}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {count} customers ({percentage.toFixed(1)}%)
                    </span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </div>

          {customerScores.length === 0 && (
            <div className="text-center py-8">
              <p className="text-sm text-muted-foreground">
                No customer scores calculated yet
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Top Customers */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5" />
            Top Customers by Score
          </CardTitle>
        </CardHeader>
        <CardContent>
          {customerScores.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              No customer scores available
            </p>
          ) : (
            <ScrollArea className="h-[300px]">
              <div className="space-y-2">
                {customerScores.slice(0, 20).map((score, index) => {
                  const tierConfig = TIER_CONFIG[score.score_tier as keyof typeof TIER_CONFIG] || TIER_CONFIG.new;
                  const TierIcon = tierConfig.icon;

                  return (
                    <div
                      key={score.id}
                      className="flex items-center gap-4 p-3 rounded-lg hover:bg-accent/50 transition-colors"
                    >
                      <span className="text-lg font-bold text-muted-foreground w-8">
                        #{index + 1}
                      </span>
                      <div className={`p-2 rounded-full ${tierConfig.bg}`}>
                        <TierIcon className={`h-4 w-4 ${tierConfig.color}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Customer</span>
                          <Badge variant="outline">{tierConfig.label}</Badge>
                        </div>
                        <div className="flex gap-4 text-sm text-muted-foreground mt-1">
                          <span>{score.total_orders} orders</span>
                          <span>৳{score.total_spent.toLocaleString()}</span>
                          <span>{score.message_count} messages</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold">{score.score}</div>
                        <div className="text-xs text-muted-foreground">points</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Create Rule Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Scoring Rule</DialogTitle>
            <DialogDescription>
              Add a rule to calculate customer scores based on behavior
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Rule Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Repeat Customer Bonus"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Criteria</Label>
                <Select
                  value={formData.criteria_type}
                  onValueChange={(v) => setFormData({ ...formData, criteria_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CRITERIA_TYPES.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Operator</Label>
                <Select
                  value={formData.operator}
                  onValueChange={(v) => setFormData({ ...formData, operator: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPERATORS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Value</Label>
                <Input
                  type="number"
                  value={formData.value_min}
                  onChange={(e) => setFormData({ ...formData, value_min: parseFloat(e.target.value) || 0 })}
                />
              </div>
              {formData.operator === 'between' && (
                <div className="space-y-2">
                  <Label>Max Value</Label>
                  <Input
                    type="number"
                    value={formData.value_max || ''}
                    onChange={(e) => setFormData({ ...formData, value_max: parseFloat(e.target.value) || null })}
                  />
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Points to Award</Label>
              <Input
                type="number"
                value={formData.points}
                onChange={(e) => setFormData({ ...formData, points: parseInt(e.target.value) || 0 })}
                placeholder="10"
              />
              <p className="text-xs text-muted-foreground">
                Use negative numbers to deduct points
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name.trim() || createScoringRule.isPending}
            >
              {createScoringRule.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Create Rule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
