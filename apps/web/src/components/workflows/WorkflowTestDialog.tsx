import { useState } from 'react';
import { Node, Edge } from '@xyflow/react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  SkipForward, 
  RotateCcw, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Zap,
  Send,
  GitBranch,
  User,
  ShoppingCart
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface WorkflowTestDialogProps {
  nodes: Node[];
  edges: Edge[];
  workflowName: string;
}

interface ExecutionStep {
  nodeId: string;
  nodeType: string;
  nodeLabel: string;
  status: 'pending' | 'running' | 'completed' | 'skipped';
  output?: string;
  duration?: number;
}

interface MockData {
  contactName: string;
  contactPhone: string;
  messageContent: string;
  orderNumber: string;
  orderTotal: string;
  orderStatus: string;
}

const nodeTypeIcons: Record<string, React.ElementType> = {
  trigger: Zap,
  action: Send,
  condition: GitBranch,
  delay: Clock,
};

export default function WorkflowTestDialog({ nodes, edges, workflowName }: WorkflowTestDialogProps) {
  const [open, setOpen] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([]);
  const [mockData, setMockData] = useState<MockData>({
    contactName: 'John Doe',
    contactPhone: '+8801712345678',
    messageContent: 'Hello, I want to place an order',
    orderNumber: 'ORD-000123',
    orderTotal: '1500',
    orderStatus: 'confirmed',
  });

  const triggerNodes = nodes.filter((n) => n.type === 'trigger');

  // Build execution path from nodes and edges
  const buildExecutionPath = (startNodeId: string): ExecutionStep[] => {
    const steps: ExecutionStep[] = [];
    const visited = new Set<string>();
    
    const traverse = (nodeId: string) => {
      if (visited.has(nodeId)) return;
      visited.add(nodeId);
      
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) return;
      
      steps.push({
        nodeId: node.id,
        nodeType: node.type || 'action',
        nodeLabel: (node.data as any).label || node.type || 'Unknown',
        status: 'pending',
      });
      
      // Find outgoing edges
      const outgoingEdges = edges.filter((e) => e.source === nodeId);
      outgoingEdges.forEach((edge) => {
        traverse(edge.target);
      });
    };
    
    traverse(startNodeId);
    return steps;
  };

  const startTest = () => {
    if (triggerNodes.length === 0) return;
    
    const path = buildExecutionPath(triggerNodes[0].id);
    setExecutionSteps(path);
    setCurrentStep(-1);
    setIsRunning(true);
    
    // Start execution
    runNextStep(path, 0);
  };

  const runNextStep = (steps: ExecutionStep[], stepIndex: number) => {
    if (stepIndex >= steps.length) {
      setIsRunning(false);
      return;
    }
    
    setCurrentStep(stepIndex);
    
    // Mark current step as running
    setExecutionSteps((prev) =>
      prev.map((s, i) => (i === stepIndex ? { ...s, status: 'running' } : s))
    );
    
    // Simulate step execution
    const delay = steps[stepIndex].nodeType === 'delay' ? 2000 : 800;
    
    setTimeout(() => {
      // Mark step as completed
      setExecutionSteps((prev) =>
        prev.map((s, i) =>
          i === stepIndex
            ? {
                ...s,
                status: 'completed',
                duration: delay,
                output: getStepOutput(steps[stepIndex], mockData),
              }
            : s
        )
      );
      
      // Continue to next step
      runNextStep(steps, stepIndex + 1);
    }, delay);
  };

  const getStepOutput = (step: ExecutionStep, data: MockData): string => {
    const nodeType = step.nodeType;
    const label = step.nodeLabel.toLowerCase();
    
    if (nodeType === 'trigger') {
      return `Triggered by: ${data.contactName} (${data.contactPhone})`;
    }
    if (label.includes('message') || label.includes('send')) {
      return `Message sent to ${data.contactName}`;
    }
    if (label.includes('label')) {
      return 'Label applied to contact';
    }
    if (label.includes('group')) {
      return 'Contact added to group';
    }
    if (nodeType === 'delay') {
      return 'Waited for specified duration';
    }
    if (nodeType === 'condition') {
      return 'Condition evaluated: true';
    }
    return 'Step completed successfully';
  };

  const resetTest = () => {
    setIsRunning(false);
    setCurrentStep(-1);
    setExecutionSteps([]);
  };

  const skipToEnd = () => {
    setExecutionSteps((prev) =>
      prev.map((s) => ({ ...s, status: 'completed', duration: 100 }))
    );
    setIsRunning(false);
    setCurrentStep(executionSteps.length - 1);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Play className="h-4 w-4 mr-2" />
          Test Workflow
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Test Workflow: {workflowName}</DialogTitle>
          <DialogDescription>
            Simulate workflow execution with mock data to verify your workflow works correctly.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 grid grid-cols-2 gap-4 overflow-hidden">
          {/* Mock Data Panel */}
          <div className="space-y-4 overflow-y-auto pr-2">
            <h4 className="font-medium flex items-center gap-2">
              <User className="h-4 w-4" />
              Mock Contact Data
            </h4>
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Contact Name</Label>
                <Input
                  value={mockData.contactName}
                  onChange={(e) => setMockData({ ...mockData, contactName: e.target.value })}
                  disabled={isRunning}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Phone Number</Label>
                <Input
                  value={mockData.contactPhone}
                  onChange={(e) => setMockData({ ...mockData, contactPhone: e.target.value })}
                  disabled={isRunning}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Message Content</Label>
                <Textarea
                  value={mockData.messageContent}
                  onChange={(e) => setMockData({ ...mockData, messageContent: e.target.value })}
                  disabled={isRunning}
                  rows={2}
                />
              </div>
            </div>

            <h4 className="font-medium flex items-center gap-2 pt-2">
              <ShoppingCart className="h-4 w-4" />
              Mock Order Data
            </h4>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Order Number</Label>
                  <Input
                    value={mockData.orderNumber}
                    onChange={(e) => setMockData({ ...mockData, orderNumber: e.target.value })}
                    disabled={isRunning}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Order Total</Label>
                  <Input
                    value={mockData.orderTotal}
                    onChange={(e) => setMockData({ ...mockData, orderTotal: e.target.value })}
                    disabled={isRunning}
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Order Status</Label>
                <Input
                  value={mockData.orderStatus}
                  onChange={(e) => setMockData({ ...mockData, orderStatus: e.target.value })}
                  disabled={isRunning}
                />
              </div>
            </div>
          </div>

          {/* Execution Steps Panel */}
          <div className="border rounded-lg overflow-hidden flex flex-col">
            <div className="p-3 border-b bg-muted/50 flex items-center justify-between">
              <h4 className="font-medium text-sm">Execution Steps</h4>
              {executionSteps.length > 0 && (
                <Badge variant="secondary" className="text-xs">
                  {executionSteps.filter((s) => s.status === 'completed').length} / {executionSteps.length}
                </Badge>
              )}
            </div>
            <ScrollArea className="flex-1 p-3">
              {executionSteps.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  <Play className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">Click "Run Test" to start simulation</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {executionSteps.map((step, index) => {
                    const Icon = nodeTypeIcons[step.nodeType] || Send;
                    return (
                      <div
                        key={step.nodeId}
                        className={cn(
                          'p-3 rounded-lg border transition-all',
                          step.status === 'running' && 'border-primary bg-primary/5 animate-pulse',
                          step.status === 'completed' && 'border-emerald-500/50 bg-emerald-500/5',
                          step.status === 'pending' && 'border-border opacity-50'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <div
                            className={cn(
                              'h-6 w-6 rounded flex items-center justify-center',
                              step.status === 'completed' && 'bg-emerald-500/10',
                              step.status === 'running' && 'bg-primary/10',
                              step.status === 'pending' && 'bg-muted'
                            )}
                          >
                            {step.status === 'completed' ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                            ) : step.status === 'running' ? (
                              <Clock className="h-4 w-4 text-primary animate-spin" />
                            ) : (
                              <Icon className="h-4 w-4 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{step.nodeLabel}</p>
                            <p className="text-xs text-muted-foreground capitalize">{step.nodeType}</p>
                          </div>
                          {step.duration && (
                            <span className="text-xs text-muted-foreground">
                              {step.duration}ms
                            </span>
                          )}
                        </div>
                        {step.output && step.status === 'completed' && (
                          <p className="text-xs text-muted-foreground mt-2 pl-8">
                            → {step.output}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-xs text-muted-foreground">
            {triggerNodes.length === 0 ? (
              <span className="text-amber-500 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                No trigger node found
              </span>
            ) : (
              <span>
                Trigger: {(triggerNodes[0].data as any).label || 'Unknown'}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            {executionSteps.length > 0 && (
              <>
                <Button variant="outline" size="sm" onClick={resetTest} disabled={isRunning}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset
                </Button>
                <Button variant="outline" size="sm" onClick={skipToEnd} disabled={!isRunning}>
                  <SkipForward className="h-4 w-4 mr-2" />
                  Skip to End
                </Button>
              </>
            )}
            <Button
              onClick={startTest}
              disabled={isRunning || triggerNodes.length === 0}
            >
              <Play className="h-4 w-4 mr-2" />
              {isRunning ? 'Running...' : 'Run Test'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
