import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useWorkflows, Workflow } from '@/hooks/useWorkflows';
import WorkflowBuilder from '@/components/workflows/WorkflowBuilder';
import WorkflowCard from '@/components/workflows/WorkflowCard';
import { ActiveWorkflowsTile } from '@/components/workflows/ActiveWorkflowsTile';
import CreateWorkflowDialog from '@/components/workflows/CreateWorkflowDialog';
import WorkflowTemplatesDialog from '@/components/workflows/WorkflowTemplatesDialog';
import { KpiCard } from '@/components/dashboard/bento/KpiCard';
import { PageHeader } from '@/components/ui/page-header';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { GitBranch, ListChecks, PlayCircle, PauseCircle } from 'lucide-react';
import { m, pageEnter, staggerContainer, staggerItem } from '@/lib/motion';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

export default function Workflows() {
  const {
    workflows,
    loading,
    saving,
    createWorkflow,
    deleteWorkflow,
    toggleWorkflow,
    fetchWorkflowWithDetails,
    saveWorkflowNodes,
  } = useWorkflows();
  const { toast } = useToast();

  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [workflowToDelete, setWorkflowToDelete] = useState<string | null>(null);

  const stats = {
    total: workflows.length,
    active: workflows.filter((w) => w.is_active).length,
    inactive: workflows.filter((w) => !w.is_active).length,
  };

  const handleEdit = async (workflow: Workflow) => {
    const fullWorkflow = await fetchWorkflowWithDetails(workflow.id);
    if (fullWorkflow) {
      setEditingWorkflow(fullWorkflow);
    }
  };

  const handleDelete = (id: string) => {
    setWorkflowToDelete(id);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (workflowToDelete) {
      await deleteWorkflow(workflowToDelete);
      setWorkflowToDelete(null);
    }
    setDeleteDialogOpen(false);
  };

  const handleSave = async (nodes: any[], edges: any[]) => {
    if (!editingWorkflow) return false;
    return saveWorkflowNodes(editingWorkflow.id, nodes, edges);
  };

  const handleToggleActive = async (isActive: boolean) => {
    if (!editingWorkflow) return false;
    const result = await toggleWorkflow(editingWorkflow.id, isActive);
    if (result) {
      setEditingWorkflow({ ...editingWorkflow, is_active: isActive });
    }
    return result;
  };

  const handleImportTemplate = async (
    name: string,
    description: string,
    nodes: any[],
    edges: any[]
  ) => {
    // Create the workflow first
    const workflow = await createWorkflow({
      name,
      description,
      trigger_type: nodes[0]?.node_subtype || 'message_received',
    });

    if (!workflow) {
      toast({
        title: 'Error',
        description: 'Failed to create workflow from template',
        variant: 'destructive',
      });
      return;
    }

    // Now save the nodes and edges
    // First, we need to generate temporary IDs and map them
    const nodesWithTempIds = nodes.map((n, i) => ({
      ...n,
      temp_id: `temp-${i}`,
    }));

    // Map edge indices to temp IDs
    const mappedEdges = edges.map((e: any) => ({
      source_node_id: `temp-${e.source_index !== undefined ? e.source_index : 0}`,
      target_node_id: `temp-${e.target_index !== undefined ? e.target_index : 1}`,
      source_handle: e.source_handle || null,
      target_handle: e.target_handle || null,
      label: e.label || null,
    }));

    await saveWorkflowNodes(workflow.id, nodesWithTempIds, mappedEdges);
    
    toast({
      title: 'Template imported',
      description: `"${name}" has been created. Click to edit.`,
    });
  };

  // If editing, show the builder
  if (editingWorkflow) {
    return (
      <DashboardLayout>
        <div className="h-[calc(100vh-0px)]">
          <WorkflowBuilder
            workflow={editingWorkflow}
            onSave={handleSave}
            onBack={() => setEditingWorkflow(null)}
            onToggleActive={handleToggleActive}
            saving={saving}
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <m.div
        variants={pageEnter}
        initial="hidden"
        animate="show"
        className="mx-auto w-full max-w-[1440px] px-4 py-5 sm:px-6 lg:px-8 space-y-6"
      >
        {/* Header */}
        <PageHeader
          title="Workflows"
          description="Build visual automation workflows for your messaging"
        >
          <WorkflowTemplatesDialog onImport={handleImportTemplate} />
          <CreateWorkflowDialog onSubmit={createWorkflow} saving={saving} />
        </PageHeader>

        {/* KPI strip — stat cards + the ONE orange active-workflows tile */}
        <m.div
          variants={staggerContainer}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4"
        >
          <m.div variants={staggerItem}>
            <KpiCard
              title="Total Workflows"
              value={stats.total}
              icon={ListChecks}
              tone="info"
              loading={loading}
            />
          </m.div>
          <m.div variants={staggerItem}>
            <KpiCard
              title="Active"
              value={stats.active}
              icon={PlayCircle}
              tone="success"
              loading={loading}
            />
          </m.div>
          <m.div variants={staggerItem}>
            <KpiCard
              title="Inactive"
              value={stats.inactive}
              icon={PauseCircle}
              tone="warning"
              loading={loading}
            />
          </m.div>
          {/* The single orange surface on this page */}
          <ActiveWorkflowsTile
            activeCount={stats.active}
            totalCount={stats.total}
            loading={loading}
          />
        </m.div>

        {/* Workflow Grid */}
        {loading ? (
          <div className="grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-44 rounded-card" />
            ))}
          </div>
        ) : workflows.length === 0 ? (
          <Card className="flex flex-col items-center justify-center px-4 py-16 text-center">
            <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent">
              <GitBranch className="h-8 w-8 text-primary" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-foreground">No workflows yet</h3>
            <p className="mb-6 max-w-sm text-muted-foreground">
              Create your first workflow to automate responses, assign agents, and more.
            </p>
            <div className="flex items-center gap-2">
              <WorkflowTemplatesDialog onImport={handleImportTemplate} />
              <CreateWorkflowDialog onSubmit={createWorkflow} saving={saving} />
            </div>
          </Card>
        ) : (
          <m.div
            data-tour="workflow-cards"
            variants={staggerContainer}
            initial="hidden"
            animate="show"
            className="grid gap-4 sm:gap-5 md:grid-cols-2 xl:grid-cols-3"
          >
            {workflows.map((workflow, index) => (
              <m.div key={workflow.id} variants={index < 12 ? staggerItem : undefined}>
                <WorkflowCard
                  workflow={workflow}
                  onEdit={() => handleEdit(workflow)}
                  onDelete={() => handleDelete(workflow.id)}
                  onToggle={(isActive) => toggleWorkflow(workflow.id, isActive)}
                />
              </m.div>
            ))}
          </m.div>
        )}
      </m.div>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Workflow</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this workflow? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
}
