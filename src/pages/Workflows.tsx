import { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useWorkflows, Workflow } from '@/hooks/useWorkflows';
import WorkflowBuilder from '@/components/workflows/WorkflowBuilder';
import WorkflowCard from '@/components/workflows/WorkflowCard';
import CreateWorkflowDialog from '@/components/workflows/CreateWorkflowDialog';
import WorkflowTemplatesDialog from '@/components/workflows/WorkflowTemplatesDialog';
import { Skeleton } from '@/components/ui/skeleton';
import { GitBranch } from 'lucide-react';
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
      <div className="p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold">Workflows</h1>
            <p className="text-muted-foreground">
              Build visual automation workflows for your messaging
            </p>
          </div>
          <div className="flex items-center gap-2">
            <WorkflowTemplatesDialog onImport={handleImportTemplate} />
            <CreateWorkflowDialog onSubmit={createWorkflow} saving={saving} />
          </div>
        </div>

        {/* Workflow Grid */}
        {loading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 rounded-lg" />
            ))}
          </div>
        ) : workflows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <GitBranch className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No workflows yet</h3>
            <p className="text-muted-foreground max-w-sm mb-4">
              Create your first workflow to automate responses, assign agents, and more.
            </p>
            <div className="flex items-center gap-2">
              <WorkflowTemplatesDialog onImport={handleImportTemplate} />
              <CreateWorkflowDialog onSubmit={createWorkflow} saving={saving} />
            </div>
          </div>
        ) : (
          <div data-tour="workflow-cards" className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {workflows.map((workflow) => (
              <WorkflowCard
                key={workflow.id}
                workflow={workflow}
                onEdit={() => handleEdit(workflow)}
                onDelete={() => handleDelete(workflow.id)}
                onToggle={(isActive) => toggleWorkflow(workflow.id, isActive)}
              />
            ))}
          </div>
        )}
      </div>

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
