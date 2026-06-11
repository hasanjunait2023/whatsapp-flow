import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api';
import { useTenant } from '@/hooks/useTenant';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { BrainCircuit, Loader2, Save } from 'lucide-react';

// TODO i18n: hardcoded English strings

interface LlmSettings {
  provider: 'openai' | 'anthropic' | 'gemini' | null;
  model: string | null;
  temperature: number | null;
  monthly_token_budget: number | null;
  is_byok: boolean;
  has_api_key: boolean;
}

const PLATFORM_DEFAULT = 'default';

export function LlmSettingsCard() {
  const { currentTenant } = useTenant();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [provider, setProvider] = useState<string>(PLATFORM_DEFAULT);
  const [model, setModel] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [temperature, setTemperature] = useState('0.7');
  const [budget, setBudget] = useState('');
  const [saving, setSaving] = useState(false);

  const settingsQuery = useQuery({
    queryKey: ['llm-settings', currentTenant?.id],
    enabled: !!currentTenant?.id,
    queryFn: async () => {
      const { data, error } = await apiRequest<LlmSettings>('/llm-settings');
      if (error) throw new Error(error);
      return data;
    },
  });

  useEffect(() => {
    const settings = settingsQuery.data;
    if (settings) {
      setProvider(settings.provider ?? PLATFORM_DEFAULT);
      setModel(settings.model ?? '');
      setTemperature(String(settings.temperature ?? 0.7));
      setBudget(settings.monthly_token_budget != null ? String(settings.monthly_token_budget) : '');
    }
  }, [settingsQuery.data]);

  const handleSave = async () => {
    setSaving(true);
    const body: Record<string, unknown> = {
      provider: provider === PLATFORM_DEFAULT ? null : provider,
      model: model.trim() || null,
      temperature: Number(temperature) || 0.7,
      monthly_token_budget: budget.trim() ? Number(budget) : null,
    };
    if (apiKey.trim()) {
      body.api_key = apiKey.trim();
    }
    const { error } = await apiRequest<LlmSettings>('/llm-settings', { method: 'PUT', body });
    setSaving(false);

    if (error) {
      toast({ title: 'Error', description: error, variant: 'destructive' });
    } else {
      toast({ title: 'Settings saved', description: 'LLM configuration has been updated.' });
      setApiKey('');
      void queryClient.invalidateQueries({ queryKey: ['llm-settings', currentTenant?.id] });
    }
  };

  if (settingsQuery.isLoading) {
    return <Skeleton className="h-72" />;
  }

  const hasApiKey = settingsQuery.data?.has_api_key ?? false;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BrainCircuit className="h-5 w-5 text-primary" />
          AI Model (LLM)
          {settingsQuery.data?.is_byok && <Badge variant="outline">BYOK</Badge>}
        </CardTitle>
        <CardDescription>
          Choose which AI provider powers your agents. Leave on platform default to use our managed
          models.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Provider</Label>
            <Select value={provider} onValueChange={setProvider}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PLATFORM_DEFAULT}>Platform default</SelectItem>
                <SelectItem value="openai">OpenAI</SelectItem>
                <SelectItem value="anthropic">Anthropic</SelectItem>
                <SelectItem value="gemini">Google Gemini</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="llm-model">Model</Label>
            <Input
              id="llm-model"
              placeholder="e.g. gpt-4o-mini"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              disabled={provider === PLATFORM_DEFAULT}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="llm-api-key">API key</Label>
          <Input
            id="llm-api-key"
            type="password"
            placeholder={hasApiKey ? '•••••••• (key saved — enter to replace)' : 'sk-...'}
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            disabled={provider === PLATFORM_DEFAULT}
            autoComplete="off"
          />
          <p className="text-xs text-muted-foreground">
            Bring your own key to use your provider account directly. Stored encrypted.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="llm-temperature">Temperature</Label>
            <Input
              id="llm-temperature"
              type="number"
              min={0}
              max={2}
              step={0.1}
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="llm-budget">Monthly token budget</Label>
            <Input
              id="llm-budget"
              type="number"
              min={0}
              placeholder="Unlimited"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save LLM Settings
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
