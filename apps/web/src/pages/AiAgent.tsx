import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAiAgent, KnowledgeItem } from '@/hooks/useAiAgent';
import { useSubscription } from '@/hooks/useSubscription';
import { SoulTab } from '@/components/ai/SoulTab';
import { HermesTab } from '@/components/ai/HermesTab';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AiAgentOverview } from '@/components/ai-agent/AiAgentOverview';
import { m, pageEnter } from '@/lib/motion';
import {
  Brain,
  Settings2,
  BookOpen,
  Plus,
  Trash2,
  Edit2,
  Save,
  AlertTriangle,
  Lock,
  UserRound,
  ArrowRightLeft,
  Sparkle,
  Headset,
} from 'lucide-react';

export default function AiAgent() {
  const { config, knowledgeBase, loading, saving, saveConfig, addKnowledgeItem, updateKnowledgeItem, deleteKnowledgeItem } = useAiAgent();
  const { canUseAI } = useSubscription();
  const [activeTab, setActiveTab] = useState('prompt');
  const [isAddKnowledgeOpen, setIsAddKnowledgeOpen] = useState(false);
  const [editingKnowledge, setEditingKnowledge] = useState<KnowledgeItem | null>(null);
  const [newKnowledge, setNewKnowledge] = useState({ title: '', content: '', category: 'general', is_active: true });
  const [promptDraft, setPromptDraft] = useState({ system_prompt: '', welcome_message: '', fallback_message: '' });

  useEffect(() => {
    if (config) {
      setPromptDraft({
        system_prompt: config.system_prompt ?? '',
        welcome_message: config.welcome_message ?? '',
        fallback_message: config.fallback_message ?? '',
      });
    }
  }, [config?.id]);

  const handleToggleEnabled = () => {
    if (config) {
      saveConfig({ is_enabled: !config.is_enabled });
    }
  };

  const handleSavePrompt = () => {
    if (config) {
      saveConfig({
        system_prompt: promptDraft.system_prompt,
        welcome_message: promptDraft.welcome_message,
        fallback_message: promptDraft.fallback_message,
      });
    }
  };

  const handleSaveBehavior = () => {
    if (config) {
      saveConfig({
        tone: config.tone,
        response_length: config.response_length,
        language: config.language,
        max_response_tokens: config.max_response_tokens,
        temperature: config.temperature,
      });
    }
  };

  const handleAddKnowledge = () => {
    addKnowledgeItem(newKnowledge);
    setNewKnowledge({ title: '', content: '', category: 'general', is_active: true });
    setIsAddKnowledgeOpen(false);
  };

  const handleUpdateKnowledge = () => {
    if (editingKnowledge) {
      updateKnowledgeItem(editingKnowledge.id, editingKnowledge);
      setEditingKnowledge(null);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="mx-auto w-full max-w-[1440px] space-y-6 p-4 md:p-6">
          <Skeleton className="h-8 w-48" />
          <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
            <Skeleton className="col-span-2 h-[140px] rounded-card lg:col-span-1" />
            <Skeleton className="h-[140px] rounded-card" />
            <Skeleton className="h-[140px] rounded-card" />
            <Skeleton className="h-[140px] rounded-card" />
          </div>
          <Skeleton className="h-96 rounded-card" />
        </div>
      </DashboardLayout>
    );
  }

  if (!canUseAI) {
    return (
      <DashboardLayout>
        <div className="mx-auto w-full max-w-[1440px] p-4 md:p-6">
          <div className="mx-auto max-w-2xl py-16 text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-muted-soft">
              <Lock className="h-8 w-8 text-muted-foreground" />
            </div>
            <h1 className="mb-2 text-2xl font-bold tracking-tight text-foreground">AI Agent Not Available</h1>
            <p className="mb-6 text-muted-foreground">
              Upgrade your plan to unlock AI-powered automated responses for your WhatsApp conversations.
            </p>
            <Button asChild>
              <a href="/billing">Upgrade Plan</a>
            </Button>
          </div>
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
        className="mx-auto w-full max-w-[1440px] space-y-6 p-4 md:p-6"
      >
        <AiAgentOverview
          isEnabled={!!config?.is_enabled}
          saving={saving}
          knowledgeCount={knowledgeBase.length}
          onToggle={handleToggleEnabled}
        />

        {/* Main Configuration */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <div className="-mx-4 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:mx-0 sm:px-0">
            <TabsList className="w-max">
              <TabsTrigger value="soul" className="h-11 gap-2 sm:h-9">
                <Sparkle className="h-4 w-4" />
                Soul
              </TabsTrigger>
              <TabsTrigger value="hermes" className="h-11 gap-2 sm:h-9">
                <Headset className="h-4 w-4" />
                Hermes
              </TabsTrigger>
              <TabsTrigger value="prompt" className="h-11 gap-2 sm:h-9">
                <Brain className="h-4 w-4" />
                Prompts
              </TabsTrigger>
              <TabsTrigger value="knowledge" className="h-11 gap-2 sm:h-9">
                <BookOpen className="h-4 w-4" />
                Knowledge
              </TabsTrigger>
              <TabsTrigger value="handoff" className="h-11 gap-2 sm:h-9">
                <ArrowRightLeft className="h-4 w-4" />
                Handoff
              </TabsTrigger>
              <TabsTrigger value="behavior" className="h-11 gap-2 sm:h-9">
                <Settings2 className="h-4 w-4" />
                Behavior
              </TabsTrigger>
            </TabsList>
          </div>

          {/* Agent Soul Tab */}
          <TabsContent value="soul" className="mt-4">
            <SoulTab />
          </TabsContent>

          {/* Hermes Tab */}
          <TabsContent value="hermes" className="mt-4">
            <HermesTab />
          </TabsContent>

          {/* Prompts Tab */}
          <TabsContent value="prompt" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle>System Prompt</CardTitle>
                <CardDescription>
                  Define how your AI agent should behave and respond to customers
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="system-prompt">AI Instructions</Label>
                  <Textarea
                    id="system-prompt"
                    placeholder="You are a helpful customer service assistant..."
                    className="min-h-[200px] font-mono text-sm"
                    value={promptDraft.system_prompt}
                    onChange={(e) => setPromptDraft(d => ({ ...d, system_prompt: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    This prompt defines the AI's personality, knowledge boundaries, and response style.
                  </p>
                </div>
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Welcome Message</CardTitle>
                  <CardDescription>
                    Sent when a new conversation starts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Hello! How can I help you today?"
                    className="min-h-[100px]"
                    value={promptDraft.welcome_message}
                    onChange={(e) => setPromptDraft(d => ({ ...d, welcome_message: e.target.value }))}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Fallback Message</CardTitle>
                  <CardDescription>
                    Sent when AI cannot understand the request
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="I'm sorry, I couldn't understand that..."
                    className="min-h-[100px]"
                    value={promptDraft.fallback_message}
                    onChange={(e) => setPromptDraft(d => ({ ...d, fallback_message: e.target.value }))}
                  />
                </CardContent>
              </Card>
            </div>

            <div className="flex justify-end">
              <Button onClick={handleSavePrompt} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                Save Prompts
              </Button>
            </div>
          </TabsContent>

          {/* Knowledge Base Tab */}
          <TabsContent value="knowledge" className="space-y-4 mt-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
                <div>
                  <CardTitle>Knowledge Base</CardTitle>
                  <CardDescription>
                    Add FAQs, product info, and company policies for the AI to reference
                  </CardDescription>
                </div>
                <Dialog open={isAddKnowledgeOpen} onOpenChange={setIsAddKnowledgeOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Knowledge
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Add Knowledge Item</DialogTitle>
                      <DialogDescription>
                        Add information the AI can use to answer customer questions
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="kb-title">Title</Label>
                        <Input
                          id="kb-title"
                          placeholder="e.g., Return Policy"
                          value={newKnowledge.title}
                          onChange={(e) => setNewKnowledge({ ...newKnowledge, title: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="kb-category">Category</Label>
                        <Select
                          value={newKnowledge.category}
                          onValueChange={(value) => setNewKnowledge({ ...newKnowledge, category: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="general">General</SelectItem>
                            <SelectItem value="products">Products</SelectItem>
                            <SelectItem value="policies">Policies</SelectItem>
                            <SelectItem value="faq">FAQ</SelectItem>
                            <SelectItem value="support">Support</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="kb-content">Content</Label>
                        <Textarea
                          id="kb-content"
                          placeholder="Enter the information the AI should know..."
                          className="min-h-[150px]"
                          value={newKnowledge.content}
                          onChange={(e) => setNewKnowledge({ ...newKnowledge, content: e.target.value })}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddKnowledgeOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddKnowledge} disabled={!newKnowledge.title || !newKnowledge.content}>
                        Add Knowledge
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {knowledgeBase.length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-medium mb-2">No knowledge items yet</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Add FAQs, policies, and product information for your AI to reference
                    </p>
                    <Button variant="outline" onClick={() => setIsAddKnowledgeOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add your first item
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {knowledgeBase.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-start justify-between rounded-card border border-border p-4 transition-colors hover:bg-muted-soft"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium truncate">{item.title}</h4>
                            <Badge variant="outline" className="text-xs">
                              {item.category}
                            </Badge>
                            {!item.is_active && (
                              <Badge variant="secondary" className="text-xs">
                                Disabled
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {item.content}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingKnowledge(item)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => deleteKnowledgeItem(item.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Edit Knowledge Dialog */}
            <Dialog open={!!editingKnowledge} onOpenChange={(open) => !open && setEditingKnowledge(null)}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Edit Knowledge Item</DialogTitle>
                </DialogHeader>
                {editingKnowledge && (
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Title</Label>
                      <Input
                        value={editingKnowledge.title}
                        onChange={(e) => setEditingKnowledge({ ...editingKnowledge, title: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Category</Label>
                      <Select
                        value={editingKnowledge.category}
                        onValueChange={(value) => setEditingKnowledge({ ...editingKnowledge, category: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General</SelectItem>
                          <SelectItem value="products">Products</SelectItem>
                          <SelectItem value="policies">Policies</SelectItem>
                          <SelectItem value="faq">FAQ</SelectItem>
                          <SelectItem value="support">Support</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Content</Label>
                      <Textarea
                        className="min-h-[150px]"
                        value={editingKnowledge.content}
                        onChange={(e) => setEditingKnowledge({ ...editingKnowledge, content: e.target.value })}
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={editingKnowledge.is_active}
                        onCheckedChange={(checked) => setEditingKnowledge({ ...editingKnowledge, is_active: checked })}
                      />
                      <Label>Active</Label>
                    </div>
                  </div>
                )}
                <DialogFooter>
                  <Button variant="outline" onClick={() => setEditingKnowledge(null)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdateKnowledge}>
                    Save Changes
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </TabsContent>

          {/* Behavior Tab */}
          <TabsContent value="behavior" className="space-y-4 mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Response Style</CardTitle>
                  <CardDescription>
                    Configure how the AI communicates
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label>Tone</Label>
                    <Select
                      value={config?.tone}
                      onValueChange={(value: 'professional' | 'friendly' | 'casual') =>
                        config && saveConfig({ ...config, tone: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="friendly">Friendly</SelectItem>
                        <SelectItem value="casual">Casual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Response Length</Label>
                    <Select
                      value={config?.response_length}
                      onValueChange={(value: 'concise' | 'balanced' | 'detailed') =>
                        config && saveConfig({ ...config, response_length: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="concise">Concise</SelectItem>
                        <SelectItem value="balanced">Balanced</SelectItem>
                        <SelectItem value="detailed">Detailed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Language</Label>
                    <Select
                      value={config?.language}
                      onValueChange={(value) => config && saveConfig({ ...config, language: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="es">Spanish</SelectItem>
                        <SelectItem value="pt">Portuguese</SelectItem>
                        <SelectItem value="fr">French</SelectItem>
                        <SelectItem value="de">German</SelectItem>
                        <SelectItem value="bn">Bengali</SelectItem>
                        <SelectItem value="hi">Hindi</SelectItem>
                        <SelectItem value="ar">Arabic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Advanced Settings</CardTitle>
                  <CardDescription>
                    Fine-tune AI model parameters
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Creativity (Temperature)</Label>
                      <span className="text-sm text-muted-foreground">{config?.temperature}</span>
                    </div>
                    <Slider
                      value={[config?.temperature || 0.7]}
                      onValueChange={([value]) => config && saveConfig({ ...config, temperature: value })}
                      min={0}
                      max={1}
                      step={0.1}
                    />
                    <p className="text-xs text-muted-foreground">
                      Lower = more consistent, Higher = more creative
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Max Response Tokens</Label>
                      <span className="text-sm text-muted-foreground">{config?.max_response_tokens}</span>
                    </div>
                    <Slider
                      value={[config?.max_response_tokens || 500]}
                      onValueChange={([value]) => config && saveConfig({ ...config, max_response_tokens: value })}
                      min={100}
                      max={2000}
                      step={100}
                    />
                    <p className="text-xs text-muted-foreground">
                      Maximum length of AI responses
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Changes to behavior settings take effect immediately for new conversations.
              </AlertDescription>
            </Alert>

            <div className="flex justify-end">
              <Button onClick={handleSaveBehavior} disabled={saving}>
                <Save className="h-4 w-4 mr-2" />
                Save Behavior Settings
              </Button>
            </div>
          </TabsContent>

          {/* Handoff Tab */}
          <TabsContent value="handoff" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserRound className="h-5 w-5" />
                  Human Handoff Settings
                </CardTitle>
                <CardDescription>
                  Configure when and how the AI should transfer conversations to human agents
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between rounded-card border border-border p-4">
                  <div className="space-y-0.5">
                    <Label className="text-base">Automatic Handoff</Label>
                    <p className="text-sm text-muted-foreground">
                      Automatically transfer to human when AI detects it can't help
                    </p>
                  </div>
                  <Switch
                    checked={config?.auto_handoff_enabled ?? true}
                    onCheckedChange={(checked) => config && saveConfig({ auto_handoff_enabled: checked })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Handoff Message</Label>
                  <Textarea
                    placeholder="I understand you'd like to speak with a human agent..."
                    className="min-h-[100px]"
                    value={config?.handoff_message || ''}
                    onChange={(e) => config && saveConfig({ handoff_message: e.target.value })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Message sent to the customer when transferring to a human agent
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Handoff Trigger Keywords</Label>
                  <Textarea
                    placeholder="speak to human, talk to agent, real person..."
                    className="min-h-[80px] font-mono text-sm"
                    value={config?.handoff_keywords?.join(', ') || ''}
                    onChange={(e) => config && saveConfig({ 
                      handoff_keywords: e.target.value.split(',').map(k => k.trim()).filter(Boolean)
                    })}
                  />
                  <p className="text-xs text-muted-foreground">
                    Comma-separated keywords that trigger an automatic handoff request
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label>Handoff After Failed Responses</Label>
                    <span className="text-sm text-muted-foreground">
                      {config?.handoff_after_failures || 3} attempts
                    </span>
                  </div>
                  <Slider
                    value={[config?.handoff_after_failures || 3]}
                    onValueChange={([value]) => config && saveConfig({ handoff_after_failures: value })}
                    min={1}
                    max={10}
                    step={1}
                  />
                  <p className="text-xs text-muted-foreground">
                    Number of fallback responses before automatically requesting a handoff
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Handoff Notifications</CardTitle>
                <CardDescription>
                  How agents are notified of handoff requests
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between rounded-card border border-border p-4">
                  <div className="space-y-0.5">
                    <Label className="text-base">In-App Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Show handoff badge on conversations in the inbox
                    </p>
                  </div>
                  <Badge variant="success-soft">
                    Always On
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Handoff requests are highlighted in the inbox with a yellow badge. 
                  Agents can take over the conversation or resume AI handling from the chat view.
                </p>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button 
                onClick={() => config && saveConfig({
                  auto_handoff_enabled: config.auto_handoff_enabled,
                  handoff_message: config.handoff_message,
                  handoff_keywords: config.handoff_keywords,
                  handoff_after_failures: config.handoff_after_failures,
                })} 
                disabled={saving}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Handoff Settings
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </m.div>
    </DashboardLayout>
  );
}
