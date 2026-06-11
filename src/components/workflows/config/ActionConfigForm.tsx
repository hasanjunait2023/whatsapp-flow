import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import InstanceSelector from './InstanceSelector';
import GroupSelector from './GroupSelector';
import LabelSelector from './LabelSelector';
import TeamMemberSelector from './TeamMemberSelector';
import VariablePicker from './VariablePicker';
import MediaUploader from './MediaUploader';
import { useRef } from 'react';
import { Info } from 'lucide-react';

interface ActionConfigFormProps {
  actionType: string;
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
}

const httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

export default function ActionConfigForm({
  actionType,
  config,
  onChange,
}: ActionConfigFormProps) {
  const messageRef = useRef<HTMLTextAreaElement>(null);
  
  const updateConfig = (key: string, value: any) => {
    onChange({ ...config, [key]: value });
  };

  const insertVariable = (variable: string) => {
    if (messageRef.current) {
      const start = messageRef.current.selectionStart;
      const end = messageRef.current.selectionEnd;
      const currentValue = config.message || '';
      const newValue = currentValue.slice(0, start) + variable + currentValue.slice(end);
      updateConfig('message', newValue);
      
      // Set cursor position after variable
      setTimeout(() => {
        if (messageRef.current) {
          const newPosition = start + variable.length;
          messageRef.current.setSelectionRange(newPosition, newPosition);
          messageRef.current.focus();
        }
      }, 0);
    } else {
      updateConfig('message', (config.message || '') + variable);
    }
  };

  switch (actionType) {
    case 'send_text':
      return (
        <div className="space-y-4">
          <InstanceSelector
            value={config.instance_id}
            onChange={(id) => updateConfig('instance_id', id)}
            label="WhatsApp Instance"
            required
          />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>
                Message <span className="text-destructive">*</span>
              </Label>
              <VariablePicker onSelect={insertVariable} />
            </div>
            <Textarea
              ref={messageRef}
              placeholder="Enter your text message..."
              value={config.message || ''}
              onChange={(e) => updateConfig('message', e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Use variables like {'{{contact.name}}'} for dynamic content
            </p>
          </div>
          <div className="flex items-center gap-2 p-3 rounded-lg bg-blue-500/10">
            <Info className="h-4 w-4 text-blue-500 flex-shrink-0" />
            <p className="text-xs text-blue-500">
              Messages have a minimum 5-second delay between sends
            </p>
          </div>
        </div>
      );

    case 'send_image':
      return (
        <div className="space-y-4">
          <InstanceSelector
            value={config.instance_id}
            onChange={(id) => updateConfig('instance_id', id)}
            label="WhatsApp Instance"
            required
          />
          <MediaUploader
            value={config.media_url}
            onChange={(url) => updateConfig('media_url', url)}
            label="Image"
            mediaType="image"
            instanceId={config.instance_id}
          />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Caption (Optional)</Label>
              <VariablePicker onSelect={(v) => updateConfig('caption', (config.caption || '') + v)} />
            </div>
            <Textarea
              placeholder="Add a caption to your image..."
              value={config.caption || ''}
              onChange={(e) => updateConfig('caption', e.target.value)}
              rows={2}
            />
          </div>
        </div>
      );

    case 'send_video':
      return (
        <div className="space-y-4">
          <InstanceSelector
            value={config.instance_id}
            onChange={(id) => updateConfig('instance_id', id)}
            label="WhatsApp Instance"
            required
          />
          <MediaUploader
            value={config.media_url}
            onChange={(url) => updateConfig('media_url', url)}
            label="Video"
            mediaType="video"
            instanceId={config.instance_id}
          />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Caption (Optional)</Label>
              <VariablePicker onSelect={(v) => updateConfig('caption', (config.caption || '') + v)} />
            </div>
            <Textarea
              placeholder="Add a caption to your video..."
              value={config.caption || ''}
              onChange={(e) => updateConfig('caption', e.target.value)}
              rows={2}
            />
          </div>
        </div>
      );

    case 'send_voice':
      return (
        <div className="space-y-4">
          <InstanceSelector
            value={config.instance_id}
            onChange={(id) => updateConfig('instance_id', id)}
            label="WhatsApp Instance"
            required
          />
          <MediaUploader
            value={config.media_url}
            onChange={(url) => updateConfig('media_url', url)}
            label="Voice Message"
            mediaType="voice"
            instanceId={config.instance_id}
          />
          <p className="text-xs text-muted-foreground">
            Upload an audio file to send as a voice message
          </p>
        </div>
      );

    case 'send_audio':
      return (
        <div className="space-y-4">
          <InstanceSelector
            value={config.instance_id}
            onChange={(id) => updateConfig('instance_id', id)}
            label="WhatsApp Instance"
            required
          />
          <MediaUploader
            value={config.media_url}
            onChange={(url) => updateConfig('media_url', url)}
            label="Audio File"
            mediaType="audio"
            instanceId={config.instance_id}
          />
          <div className="space-y-2">
            <Label>Filename (Optional)</Label>
            <Input
              placeholder="audio.mp3"
              value={config.filename || ''}
              onChange={(e) => updateConfig('filename', e.target.value)}
            />
          </div>
        </div>
      );

    case 'send_document':
      return (
        <div className="space-y-4">
          <InstanceSelector
            value={config.instance_id}
            onChange={(id) => updateConfig('instance_id', id)}
            label="WhatsApp Instance"
            required
          />
          <MediaUploader
            value={config.media_url}
            onChange={(url) => updateConfig('media_url', url)}
            label="Document"
            mediaType="document"
            instanceId={config.instance_id}
          />
          <div className="space-y-2">
            <Label>Filename</Label>
            <Input
              placeholder="document.pdf"
              value={config.filename || ''}
              onChange={(e) => updateConfig('filename', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Caption (Optional)</Label>
              <VariablePicker onSelect={(v) => updateConfig('caption', (config.caption || '') + v)} />
            </div>
            <Textarea
              placeholder="Add a caption..."
              value={config.caption || ''}
              onChange={(e) => updateConfig('caption', e.target.value)}
              rows={2}
            />
          </div>
        </div>
      );

    case 'send_location':
      return (
        <div className="space-y-4">
          <InstanceSelector
            value={config.instance_id}
            onChange={(id) => updateConfig('instance_id', id)}
            label="WhatsApp Instance"
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Latitude <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                step="any"
                placeholder="23.8103"
                value={config.lat || ''}
                onChange={(e) => updateConfig('lat', parseFloat(e.target.value) || '')}
              />
            </div>
            <div className="space-y-2">
              <Label>Longitude <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                step="any"
                placeholder="90.4125"
                value={config.lng || ''}
                onChange={(e) => updateConfig('lng', parseFloat(e.target.value) || '')}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Location Name</Label>
            <Input
              placeholder="My Business Location"
              value={config.location_name || ''}
              onChange={(e) => updateConfig('location_name', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Address (Optional)</Label>
            <Input
              placeholder="123 Main St, City"
              value={config.address || ''}
              onChange={(e) => updateConfig('address', e.target.value)}
            />
          </div>
        </div>
      );

    case 'send_message':
      return (
        <div className="space-y-4">
          <InstanceSelector
            value={config.instance_id}
            onChange={(id) => updateConfig('instance_id', id)}
            label="Send from Instance"
          />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>
                Message <span className="text-destructive">*</span>
              </Label>
              <VariablePicker onSelect={insertVariable} />
            </div>
            <Textarea
              ref={messageRef}
              placeholder="Enter your message..."
              value={config.message || ''}
              onChange={(e) => updateConfig('message', e.target.value)}
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Use variables like {'{{contact.name}}'} for dynamic content
            </p>
          </div>
        </div>
      );

    case 'add_label':
      return (
        <div className="space-y-4">
          <LabelSelector
            value={config.label_id}
            onChange={(id, name) => {
              updateConfig('label_id', id);
              updateConfig('label_name', name);
            }}
            label="Label to Add"
            required
            allowCreate
          />
        </div>
      );

    case 'assign_agent':
      return (
        <div className="space-y-4">
          <TeamMemberSelector
            value={config.agent_id}
            onChange={(id, name) => {
              updateConfig('agent_id', id);
              updateConfig('agent_name', name);
            }}
            label="Assign to Agent"
            required
          />
          <div className="flex items-center gap-2">
            <Switch
              id="notify-agent"
              checked={config.notify_agent || false}
              onCheckedChange={(checked) => updateConfig('notify_agent', checked)}
            />
            <Label htmlFor="notify-agent">Notify agent when assigned</Label>
          </div>
        </div>
      );

    case 'http_request':
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>
              URL <span className="text-destructive">*</span>
            </Label>
            <Input
              placeholder="https://api.example.com/webhook"
              value={config.url || ''}
              onChange={(e) => updateConfig('url', e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Method</Label>
            <Select
              value={config.method || 'POST'}
              onValueChange={(v) => updateConfig('method', v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {httpMethods.map((method) => (
                  <SelectItem key={method} value={method}>
                    {method}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Headers (JSON)</Label>
            <Textarea
              placeholder='{"Authorization": "Bearer token"}'
              value={config.headers || ''}
              onChange={(e) => updateConfig('headers', e.target.value)}
              rows={2}
              className="font-mono text-xs"
            />
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Body (JSON)</Label>
              <VariablePicker onSelect={(v) => updateConfig('body', (config.body || '') + v)} />
            </div>
            <Textarea
              placeholder='{"contact": "{{contact.phone}}"}'
              value={config.body || ''}
              onChange={(e) => updateConfig('body', e.target.value)}
              rows={3}
              className="font-mono text-xs"
            />
          </div>
        </div>
      );

    case 'ai_response':
      return (
        <div className="space-y-4">
          <InstanceSelector
            value={config.instance_id}
            onChange={(id) => updateConfig('instance_id', id)}
            label="Reply from Instance"
          />
          <div className="space-y-2">
            <Label>AI Prompt Template</Label>
            <Textarea
              placeholder="You are a helpful customer support agent..."
              value={config.prompt || ''}
              onChange={(e) => updateConfig('prompt', e.target.value)}
              rows={4}
            />
          </div>
          <div className="space-y-2">
            <Label>Max Tokens</Label>
            <Input
              type="number"
              placeholder="500"
              value={config.max_tokens || ''}
              onChange={(e) => updateConfig('max_tokens', parseInt(e.target.value) || undefined)}
            />
          </div>
        </div>
      );

    case 'add_to_group':
      return (
        <div className="space-y-4">
          <InstanceSelector
            value={config.instance_id}
            onChange={(id) => updateConfig('instance_id', id)}
            label="WhatsApp Instance"
            required
          />
          <GroupSelector
            value={config.group_id}
            onChange={(id, name) => {
              updateConfig('group_id', id);
              updateConfig('group_name', name);
            }}
            instanceId={config.instance_id}
            label="Add to Group"
            required
          />
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted">
            <Switch
              id="use-queue"
              checked={config.use_queue || false}
              onCheckedChange={(checked) => updateConfig('use_queue', checked)}
            />
            <div>
              <Label htmlFor="use-queue">Safe Mode (Batched)</Label>
              <p className="text-xs text-muted-foreground">
                Add members in batches to avoid WhatsApp rate limits
              </p>
            </div>
          </div>
        </div>
      );

    case 'remove_from_group':
      return (
        <div className="space-y-4">
          <InstanceSelector
            value={config.instance_id}
            onChange={(id) => updateConfig('instance_id', id)}
            label="WhatsApp Instance"
            required
          />
          <GroupSelector
            value={config.group_id}
            onChange={(id, name) => {
              updateConfig('group_id', id);
              updateConfig('group_name', name);
            }}
            instanceId={config.instance_id}
            label="Remove from Group"
            required
          />
        </div>
      );

    case 'send_group_invite':
      return (
        <div className="space-y-4">
          <InstanceSelector
            value={config.instance_id}
            onChange={(id) => updateConfig('instance_id', id)}
            label="WhatsApp Instance"
            required
          />
          <GroupSelector
            value={config.group_id}
            onChange={(id, name) => {
              updateConfig('group_id', id);
              updateConfig('group_name', name);
            }}
            instanceId={config.instance_id}
            label="Group to Invite"
            required
          />
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Invitation Message</Label>
              <VariablePicker onSelect={insertVariable} />
            </div>
            <Textarea
              ref={messageRef}
              placeholder="Hey {{contact.name}}! Join our exclusive group..."
              value={config.message || ''}
              onChange={(e) => updateConfig('message', e.target.value)}
              rows={3}
            />
          </div>
        </div>
      );

    default:
      return (
        <div className="p-4 text-center text-muted-foreground">
          <p>No configuration available for this action type.</p>
        </div>
      );
  }
}
