import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { CreateAutomationRuleInput } from '@/hooks/useAutomationRules';

interface AddRuleDialogProps {
  onAdd: (rule: CreateAutomationRuleInput) => Promise<void>;
  teamMembers?: { id: string; name: string }[];
}

export function AddRuleDialog({ onAdd, teamMembers = [] }: AddRuleDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [triggerType, setTriggerType] = useState<'new_message' | 'keyword_match'>('new_message');
  const [keywords, setKeywords] = useState('');
  const [matchType, setMatchType] = useState<'contains' | 'exact' | 'starts_with'>('contains');
  const [actionType, setActionType] = useState<'auto_reply' | 'assign_agent'>('auto_reply');
  const [replyMessage, setReplyMessage] = useState('');
  const [agentId, setAgentId] = useState('');

  const resetForm = () => {
    setName('');
    setDescription('');
    setTriggerType('new_message');
    setKeywords('');
    setMatchType('contains');
    setActionType('auto_reply');
    setReplyMessage('');
    setAgentId('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const triggerConfig: Record<string, any> = {};
      if (triggerType === 'keyword_match') {
        triggerConfig.keywords = keywords.split(',').map(k => k.trim()).filter(Boolean);
        triggerConfig.match_type = matchType;
        triggerConfig.case_sensitive = false;
      }

      const actionConfig: Record<string, any> = {};
      if (actionType === 'auto_reply') {
        actionConfig.reply_message = replyMessage;
      } else {
        actionConfig.agent_id = agentId;
      }

      await onAdd({
        name,
        description: description || undefined,
        trigger_type: triggerType,
        trigger_config: triggerConfig,
        action_type: actionType,
        action_config: actionConfig,
        is_active: true,
      });

      setOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error adding rule:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Rule
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create Automation Rule</DialogTitle>
            <DialogDescription>
              Set up triggers and actions to automate your workflow.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Rule Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Welcome Message"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional description"
              />
            </div>

            {/* Trigger Configuration */}
            <div className="grid gap-2">
              <Label>Trigger</Label>
              <Select value={triggerType} onValueChange={(v) => setTriggerType(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new_message">New Message</SelectItem>
                  <SelectItem value="keyword_match">Keyword Match</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {triggerType === 'keyword_match' && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="keywords">Keywords (comma-separated)</Label>
                  <Input
                    id="keywords"
                    value={keywords}
                    onChange={(e) => setKeywords(e.target.value)}
                    placeholder="help, support, price"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Match Type</Label>
                  <Select value={matchType} onValueChange={(v) => setMatchType(v as any)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="contains">Contains</SelectItem>
                      <SelectItem value="exact">Exact Match</SelectItem>
                      <SelectItem value="starts_with">Starts With</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {/* Action Configuration */}
            <div className="grid gap-2">
              <Label>Action</Label>
              <Select value={actionType} onValueChange={(v) => setActionType(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto_reply">Auto Reply</SelectItem>
                  <SelectItem value="assign_agent">Assign to Agent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {actionType === 'auto_reply' && (
              <div className="grid gap-2">
                <Label htmlFor="replyMessage">Reply Message</Label>
                <Textarea
                  id="replyMessage"
                  value={replyMessage}
                  onChange={(e) => setReplyMessage(e.target.value)}
                  placeholder="Hi! Thanks for reaching out. We'll get back to you shortly."
                  rows={3}
                />
              </div>
            )}

            {actionType === 'assign_agent' && (
              <div className="grid gap-2">
                <Label>Assign To</Label>
                <Select value={agentId} onValueChange={setAgentId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select an agent" />
                  </SelectTrigger>
                  <SelectContent>
                    {teamMembers.map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        {member.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !name.trim()}>
              {loading ? 'Creating...' : 'Create Rule'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
