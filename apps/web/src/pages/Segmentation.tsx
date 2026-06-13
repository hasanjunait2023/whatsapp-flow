import DashboardLayout from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CustomerSegmentManager } from '@/components/segmentation/CustomerSegmentManager';
import { CustomerScoringManager } from '@/components/segmentation/CustomerScoringManager';
import { SegmentsSummaryTile } from '@/components/segmentation/SegmentsSummaryTile';
import { KpiCard } from '@/components/dashboard/bento/KpiCard';
import { useCustomerSegments } from '@/hooks/useCustomerSegments';
import { m, pageEnter, staggerContainer, staggerItem } from '@/lib/motion';
import { Users, Target, Layers, Zap, Award } from 'lucide-react';

export default function Segmentation() {
  const { segments, customerScores, loading } = useCustomerSegments();

  // KPI metrics derived from existing query data — no extra fetches.
  const totalMembers = segments.reduce((sum, s) => sum + (s.contact_count ?? 0), 0);
  const autoSegments = segments.filter((s) => s.is_auto).length;
  const scoredCustomers = customerScores.length;

  return (
    <DashboardLayout>
      <m.div
        variants={pageEnter}
        initial="hidden"
        animate="show"
        className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8 space-y-6"
      >
        {/* Header */}
        <header className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Customer Segmentation
          </h1>
          <p className="text-sm text-muted-foreground">
            Group customers by behavior and create scoring rules for targeting.
          </p>
        </header>

        {/* KPI strip — stat cards + the ONE orange summary tile */}
        <m.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4"
        >
          {/* The single orange surface on this page */}
          <SegmentsSummaryTile
            totalMembers={totalMembers}
            segmentCount={segments.length}
            loading={loading}
          />
          <m.div variants={staggerItem}>
            <KpiCard
              title="Segments"
              value={segments.length}
              icon={Layers}
              tone="info"
              loading={loading}
            />
          </m.div>
          <m.div variants={staggerItem}>
            <KpiCard
              title="Auto-assigned"
              value={autoSegments}
              icon={Zap}
              tone="primary"
              loading={loading}
            />
          </m.div>
          <m.div variants={staggerItem}>
            <KpiCard
              title="Scored Customers"
              value={scoredCustomers}
              icon={Award}
              tone="success"
              loading={loading}
            />
          </m.div>
        </m.div>

        <Tabs defaultValue="segments" className="space-y-6">
          <TabsList className="bg-muted/50">
            <TabsTrigger value="segments" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Segments
            </TabsTrigger>
            <TabsTrigger value="scoring" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Scoring
            </TabsTrigger>
          </TabsList>

          <TabsContent value="segments">
            <CustomerSegmentManager />
          </TabsContent>

          <TabsContent value="scoring">
            <CustomerScoringManager />
          </TabsContent>
        </Tabs>
      </m.div>
    </DashboardLayout>
  );
}
