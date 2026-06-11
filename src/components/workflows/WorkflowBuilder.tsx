import { useCallback, useRef, useState, useEffect } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant,
  EdgeProps,
  getBezierPath,
  BaseEdge,
  EdgeLabelRenderer,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import TriggerNode from './nodes/TriggerNode';
import ActionNode from './nodes/ActionNode';
import ConditionNode from './nodes/ConditionNode';
import DelayNode from './nodes/DelayNode';
import NodePalette from './NodePalette';
import NodeConfigPanel from './config/NodeConfigPanel';
import WorkflowTestDialog from './WorkflowTestDialog';
import { Button } from '@/components/ui/button';
import { Workflow, WorkflowNode, WorkflowEdge } from '@/hooks/useWorkflows';
import { Save, ArrowLeft, Keyboard, X } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

const nodeTypes = {
  trigger: TriggerNode,
  action: ActionNode,
  condition: ConditionNode,
  delay: DelayNode,
};

interface WorkflowBuilderProps {
  workflow: Workflow;
  onSave: (nodes: any[], edges: any[]) => Promise<boolean>;
  onBack: () => void;
  onToggleActive: (isActive: boolean) => Promise<boolean>;
  saving?: boolean;
}

export default function WorkflowBuilder({
  workflow,
  onSave,
  onBack,
  onToggleActive,
  saving,
}: WorkflowBuilderProps) {
  const { toast } = useToast();
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [reactFlowInstance, setReactFlowInstance] = useState<any>(null);
  const [isActive, setIsActive] = useState(workflow.is_active);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [selectedEdge, setSelectedEdge] = useState<string | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Custom deletable edge component
  const DeletableEdge = useCallback(({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    label,
  }: EdgeProps) => {
    const [edgePath, labelX, labelY] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });

    const isSelected = selectedEdge === id;

    return (
      <>
        <BaseEdge
          path={edgePath}
          markerEnd={markerEnd}
          style={{
            ...style,
            strokeWidth: isSelected ? 3 : 2,
            stroke: isSelected ? 'hsl(var(--destructive))' : 'hsl(var(--primary))',
          }}
        />
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
              pointerEvents: 'all',
            }}
            className="nodrag nopan"
          >
            <button
              className={cn(
                "flex items-center justify-center w-5 h-5 rounded-full transition-all",
                isSelected
                  ? "bg-destructive text-destructive-foreground scale-110"
                  : "bg-muted text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
              )}
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteEdge(id);
              }}
              title="Delete connection"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        </EdgeLabelRenderer>
        {label && (
          <EdgeLabelRenderer>
            <div
              style={{
                position: 'absolute',
                transform: `translate(-50%, -100%) translate(${labelX}px,${labelY - 15}px)`,
                pointerEvents: 'none',
              }}
              className="text-xs bg-background px-1 rounded border border-border"
            >
              {label}
            </div>
          </EdgeLabelRenderer>
        )}
      </>
    );
  }, [selectedEdge]);

  const edgeTypes = {
    default: DeletableEdge,
  };

  // Handle edge deletion
  const handleDeleteEdge = useCallback((edgeId: string) => {
    setEdges((eds) => eds.filter((e) => e.id !== edgeId));
    setSelectedEdge(null);
    toast({
      title: 'Connection deleted',
      description: 'The connection has been removed.',
    });
  }, [setEdges, toast]);

  // Load existing nodes and edges
  useEffect(() => {
    if (workflow.nodes && workflow.nodes.length > 0) {
      const loadedNodes: Node[] = workflow.nodes.map((n) => ({
        id: n.id,
        type: n.node_type,
        position: { x: n.position_x, y: n.position_y },
        data: {
          label: n.node_config.label || n.node_subtype,
          triggerType: n.node_subtype,
          actionType: n.node_subtype,
          conditionType: n.node_subtype,
          delay: n.node_config.delay || 1,
          unit: n.node_config.unit || 'minutes',
          config: n.node_config,
        },
      }));
      setNodes(loadedNodes);
    }

    if (workflow.edges && workflow.edges.length > 0) {
      const loadedEdges: Edge[] = workflow.edges.map((e) => ({
        id: e.id,
        source: e.source_node_id,
        target: e.target_node_id,
        sourceHandle: e.source_handle,
        targetHandle: e.target_handle,
        label: e.label,
        animated: true,
        style: { stroke: 'hsl(var(--primary))' },
      }));
      setEdges(loadedEdges);
    }
  }, [workflow, setNodes, setEdges]);

  // Track unsaved changes
  useEffect(() => {
    setHasUnsavedChanges(true);
  }, [nodes, edges]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete selected node
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNode) {
        e.preventDefault();
        handleDeleteNode(selectedNode.id);
        return;
      }
      
      // Delete selected edge
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedEdge) {
        e.preventDefault();
        handleDeleteEdge(selectedEdge);
        return;
      }
      
      // Duplicate selected node
      if (e.key === 'd' && (e.ctrlKey || e.metaKey) && selectedNode) {
        e.preventDefault();
        handleDuplicateNode(selectedNode);
      }
      
      // Save workflow
      if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSave();
      }
      
      // Deselect node/edge
      if (e.key === 'Escape') {
        setSelectedNode(null);
        setSelectedEdge(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedNode, selectedEdge, handleDeleteEdge]);

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          { ...params, animated: true, style: { stroke: 'hsl(var(--primary))' } },
          eds
        )
      ),
    [setEdges]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node);
    setSelectedEdge(null); // Deselect edge when node is clicked
  }, []);

  const onEdgeClick = useCallback((event: React.MouseEvent, edge: Edge) => {
    setSelectedEdge(edge.id);
    setSelectedNode(null); // Deselect node when edge is clicked
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
    setSelectedEdge(null);
  }, []);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const type = event.dataTransfer.getData('application/reactflow-type');
      const subtype = event.dataTransfer.getData('application/reactflow-subtype');
      const label = event.dataTransfer.getData('application/reactflow-label');

      if (!type || !reactFlowInstance || !reactFlowWrapper.current) return;

      const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = reactFlowInstance.screenToFlowPosition({
        x: event.clientX - reactFlowBounds.left,
        y: event.clientY - reactFlowBounds.top,
      });

      const newNode: Node = {
        id: `${type}-${Date.now()}`,
        type,
        position,
        data: {
          label,
          triggerType: subtype,
          actionType: subtype,
          conditionType: subtype,
          delay: 1,
          unit: 'minutes',
          config: {},
        },
      };

      setNodes((nds) => nds.concat(newNode));
      setSelectedNode(newNode);
    },
    [reactFlowInstance, setNodes]
  );

  const handleDragStart = (
    event: React.DragEvent,
    nodeType: string,
    nodeSubtype: string,
    label: string
  ) => {
    event.dataTransfer.setData('application/reactflow-type', nodeType);
    event.dataTransfer.setData('application/reactflow-subtype', nodeSubtype);
    event.dataTransfer.setData('application/reactflow-label', label);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleUpdateNode = useCallback((nodeId: string, data: Record<string, any>) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === nodeId ? { ...n, data } : n))
    );
    // Update selected node reference
    setSelectedNode((prev) => (prev?.id === nodeId ? { ...prev, data } : prev));
  }, [setNodes]);

  const handleDeleteNode = useCallback((nodeId: string) => {
    setNodes((nds) => nds.filter((n) => n.id !== nodeId));
    setEdges((eds) => eds.filter((e) => e.source !== nodeId && e.target !== nodeId));
    setSelectedNode(null);
    toast({
      title: 'Node deleted',
      description: 'The node and its connections have been removed.',
    });
  }, [setNodes, setEdges, toast]);

  const handleDuplicateNode = useCallback((node: Node) => {
    const newNode: Node = {
      ...node,
      id: `${node.type}-${Date.now()}`,
      position: {
        x: node.position.x + 50,
        y: node.position.y + 50,
      },
      data: { ...node.data },
      selected: false,
    };
    setNodes((nds) => nds.concat(newNode));
    setSelectedNode(newNode);
    toast({
      title: 'Node duplicated',
      description: 'A copy of the node has been created.',
    });
  }, [setNodes, toast]);

  const handleSave = async () => {
    // Validate workflow
    const triggerNodes = nodes.filter((n) => n.type === 'trigger');
    if (triggerNodes.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'Workflow must have at least one trigger node.',
        variant: 'destructive',
      });
      return;
    }

    const nodesToSave = nodes.map((n) => ({
      node_type: n.type,
      node_subtype: n.data.triggerType || n.data.actionType || n.data.conditionType || 'wait',
      node_config: {
        label: n.data.label,
        ...n.data.config,
        delay: n.data.delay,
        unit: n.data.unit,
      },
      position_x: n.position.x,
      position_y: n.position.y,
    }));

    const edgesToSave = edges.map((e) => ({
      source_node_id: e.source,
      target_node_id: e.target,
      source_handle: e.sourceHandle || null,
      target_handle: e.targetHandle || null,
      label: typeof e.label === 'string' ? e.label : null,
    }));

    const success = await onSave(nodesToSave, edgesToSave);
    if (success) {
      setHasUnsavedChanges(false);
    }
  };

  const handleToggleActive = async (checked: boolean) => {
    setIsActive(checked);
    await onToggleActive(checked);
  };

  return (
    <div className="flex h-full">
      {/* Left: Node Palette */}
      <NodePalette onDragStart={handleDragStart} />

      {/* Center: Canvas */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onBack}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold">{workflow.name}</h2>
                {hasUnsavedChanges && (
                  <span className="text-xs text-muted-foreground">(unsaved)</span>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {workflow.description || 'No description'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Keyboard shortcuts tooltip */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <Keyboard className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs">
                  <div className="text-xs space-y-1">
                    <p><kbd className="bg-muted px-1 rounded">Delete</kbd> Delete node/connection</p>
                    <p><kbd className="bg-muted px-1 rounded">Ctrl+D</kbd> Duplicate node</p>
                    <p><kbd className="bg-muted px-1 rounded">Ctrl+S</kbd> Save workflow</p>
                    <p><kbd className="bg-muted px-1 rounded">Esc</kbd> Deselect</p>
                    <p className="pt-1 text-muted-foreground">Click <span className="text-destructive">×</span> on connection to delete</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>

            {/* Test Workflow Button */}
            <WorkflowTestDialog
              nodes={nodes}
              edges={edges}
              workflowName={workflow.name}
            />
            
            <div className="flex items-center gap-2">
              <Switch
                id="workflow-active"
                checked={isActive}
                onCheckedChange={handleToggleActive}
              />
              <Label htmlFor="workflow-active" className="text-sm">
                {isActive ? 'Active' : 'Inactive'}
              </Label>
            </div>
            <Button onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>

        {/* Canvas */}
        <div ref={reactFlowWrapper} className="flex-1">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onInit={setReactFlowInstance}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onNodeClick={onNodeClick}
            onEdgeClick={onEdgeClick}
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            className="bg-muted/30"
            deleteKeyCode={null} // We handle delete manually
          >
            <Controls />
            <MiniMap
              nodeStrokeColor="hsl(var(--primary))"
              nodeColor="hsl(var(--card))"
              nodeBorderRadius={8}
            />
            <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          </ReactFlow>
        </div>
      </div>

      {/* Right: Config Panel */}
      <NodeConfigPanel
        node={selectedNode}
        onClose={() => setSelectedNode(null)}
        onUpdateNode={handleUpdateNode}
        onDeleteNode={handleDeleteNode}
        onDuplicateNode={handleDuplicateNode}
      />
    </div>
  );
}
