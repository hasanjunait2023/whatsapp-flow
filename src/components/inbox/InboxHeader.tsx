import { useState, useEffect } from 'react';
import { useInstances, WhatsAppInstance } from '@/hooks/useInstances';
import { useAiAgent } from '@/hooks/useAiAgent';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Bot, Smartphone, Wifi, WifiOff } from 'lucide-react';

interface InboxHeaderProps {
  selectedInstanceId: string | null;
  onInstanceChange: (instanceId: string | null) => void;
}

export default function InboxHeader({ selectedInstanceId, onInstanceChange }: InboxHeaderProps) {
  const { instances, loading: instancesLoading } = useInstances();
  const { config, saveConfig, saving } = useAiAgent();
  const [aiEnabled, setAiEnabled] = useState(false);

  useEffect(() => {
    if (config) {
      setAiEnabled(config.is_enabled);
    }
  }, [config?.is_enabled]);

  const handleAiToggle = async (enabled: boolean) => {
    setAiEnabled(enabled);
    await saveConfig({ is_enabled: enabled });
  };

  const handleInstanceChange = (value: string) => {
    onInstanceChange(value === 'all' ? null : value);
  };

  const activeInstances = instances.filter(i => i.status === 'active');
  const selectedInstance = instances.find(i => i.id === selectedInstanceId);

  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card">
      {/* Instance Selector */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Smartphone className="h-4 w-4 text-muted-foreground" />
          <Select
            value={selectedInstanceId || 'all'}
            onValueChange={handleInstanceChange}
            disabled={instancesLoading}
          >
            <SelectTrigger className="w-[200px] h-9">
              <SelectValue placeholder="All Instances" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                <div className="flex items-center gap-2">
                  <span>All Instances</span>
                  <Badge variant="secondary" className="ml-auto">
                    {activeInstances.length}
                  </Badge>
                </div>
              </SelectItem>
              {instances.map((instance) => (
                <SelectItem key={instance.id} value={instance.id}>
                  <div className="flex items-center gap-2">
                    {instance.status === 'active' ? (
                      <Wifi className="h-3 w-3 text-success" />
                    ) : (
                      <WifiOff className="h-3 w-3 text-destructive" />
                    )}
                    <span>{instance.name}</span>
                    {instance.is_default && (
                      <Badge variant="outline" className="text-xs">Default</Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedInstance && (
          <Badge
            variant={selectedInstance.status === 'active' ? 'default' : 'destructive'}
            className={selectedInstance.status === 'active' ? 'bg-success' : ''}
          >
            {selectedInstance.status === 'active' ? 'Connected' : 'Disconnected'}
          </Badge>
        )}
      </div>

      {/* AI Agent Toggle */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Bot className={`h-4 w-4 ${aiEnabled ? 'text-primary' : 'text-muted-foreground'}`} />
          <Label htmlFor="ai-toggle" className="text-sm font-medium cursor-pointer">
            AI Agent
          </Label>
        </div>
        <Switch
          id="ai-toggle"
          checked={aiEnabled}
          onCheckedChange={handleAiToggle}
          disabled={saving || !config}
        />
        {aiEnabled && (
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            Active
          </Badge>
        )}
      </div>
    </div>
  );
}
