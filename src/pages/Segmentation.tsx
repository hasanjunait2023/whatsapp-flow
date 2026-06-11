import DashboardLayout from '@/components/layout/DashboardLayout';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CustomerSegmentManager } from '@/components/segmentation/CustomerSegmentManager';
import { CustomerScoringManager } from '@/components/segmentation/CustomerScoringManager';
import { Users, Target } from 'lucide-react';

export default function Segmentation() {
  return (
    <DashboardLayout>
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Customer Segmentation</h1>
          <p className="text-muted-foreground">
            Group customers by behavior and create scoring rules for targeting
          </p>
        </div>

        <Tabs defaultValue="segments" className="space-y-6">
          <TabsList>
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
      </div>
    </DashboardLayout>
  );
}
