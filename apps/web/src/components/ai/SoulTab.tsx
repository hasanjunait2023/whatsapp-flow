import { useEffect, useState } from 'react';
import {
  useAgentSoul,
  SoulFaq,
  SoulHours,
  SoulPolicies,
  SoulStatusValue,
  SoulTone,
} from '@/hooks/useAgentSoul';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertTriangle,
  CheckCircle2,
  Globe,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
} from 'lucide-react';

// TODO i18n: hardcoded English strings

const STATUS_BADGE: Record<SoulStatusValue, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  none: { label: 'Not built', variant: 'secondary' },
  pending: { label: 'Queued', variant: 'outline' },
  ingesting: { label: 'Building...', variant: 'outline' },
  ready: { label: 'Ready for review', variant: 'default' },
  approved: { label: 'Approved & active', variant: 'default' },
  error: { label: 'Error', variant: 'destructive' },
};

interface SoulDraft {
  tone: SoulTone;
  faqs: SoulFaq[];
  hours: SoulHours;
  policies: SoulPolicies;
  products_summary: string;
}

export function SoulTab() {
  const {
    soul,
    isLoading,
    ingest,
    isIngesting,
    regenerate,
    isRegenerating,
    approve,
    isApproving,
  } = useAgentSoul();

  const [websiteUrl, setWebsiteUrl] = useState('');
  const [includeFacebook, setIncludeFacebook] = useState(false);
  const [draft, setDraft] = useState<SoulDraft | null>(null);

  const status: SoulStatusValue = soul?.status ?? 'none';

  // Seed the editable draft whenever a (re)generated soul arrives.
  useEffect(() => {
    if (soul && (status === 'ready' || status === 'approved')) {
      setDraft({
        tone: { ...(soul.tone ?? {}) },
        faqs: (soul.faqs ?? []).map((f) => ({ ...f })),
        hours: { ...(soul.hours ?? {}) },
        policies: { ...(soul.policies ?? {}) },
        products_summary: soul.products_summary ?? '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soul?.version, status]);

  const handleBuild = () => {
    void ingest({
      websiteUrl: websiteUrl.trim() || undefined,
      includeFacebook,
    });
  };

  const handleApprove = () => {
    if (!draft) return;
    void approve({
      tone: draft.tone,
      faqs: draft.faqs,
      hours: draft.hours,
      policies: draft.policies,
      products_summary: draft.products_summary,
    });
  };

  const updateFaq = (index: number, patch: Partial<SoulFaq>) => {
    if (!draft) return;
    setDraft({
      ...draft,
      faqs: draft.faqs.map((f, i) => (i === index ? { ...f, ...patch } : f)),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Status header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant={STATUS_BADGE[status].variant}>
            {status === 'approved' && <CheckCircle2 className="h-3 w-3 mr-1" />}
            {STATUS_BADGE[status].label}
          </Badge>
          {soul?.version != null && status !== 'none' && (
            <span className="text-xs text-muted-foreground">v{soul.version}</span>
          )}
        </div>
        {status !== 'none' && status !== 'pending' && status !== 'ingesting' && (
          <Button variant="outline" size="sm" onClick={() => void regenerate()} disabled={isRegenerating}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Regenerate
          </Button>
        )}
      </div>

      {status === 'error' && soul?.error_message && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{soul.error_message}</AlertDescription>
        </Alert>
      )}

      {/* Build form */}
      {(status === 'none' || status === 'error') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              Build your agent
            </CardTitle>
            <CardDescription>
              We read your website and Facebook page to automatically build an AI persona
              that knows your business, products, FAQs, and policies.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="soul-website">Website URL</Label>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="soul-website"
                  className="pl-9"
                  placeholder="https://yourbusiness.com"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="space-y-0.5">
                <Label className="text-base">Include Facebook page</Label>
                <p className="text-sm text-muted-foreground">
                  Use your connected Facebook page content as a source
                </p>
              </div>
              <Switch checked={includeFacebook} onCheckedChange={setIncludeFacebook} />
            </div>
            <div className="flex justify-end">
              <Button
                onClick={handleBuild}
                disabled={isIngesting || (!websiteUrl.trim() && !includeFacebook)}
              >
                {isIngesting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4 mr-2" />
                )}
                Build my agent
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress */}
      {(status === 'pending' || status === 'ingesting') && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center text-center py-8 gap-4">
              <Loader2 className="h-10 w-10 text-primary animate-spin" />
              <div>
                <h3 className="font-medium mb-1">Building your agent...</h3>
                <p className="text-sm text-muted-foreground">
                  Reading your sources and extracting business knowledge. This page updates automatically.
                </p>
              </div>
              {soul?.sources && soul.sources.length > 0 && (
                <div className="w-full max-w-md space-y-2 text-left">
                  {soul.sources.map((source) => (
                    <div key={source.id} className="flex items-center justify-between text-sm p-2 border rounded-md">
                      <span className="truncate mr-2">{source.url || source.type}</span>
                      <Badge variant={source.status === 'error' ? 'destructive' : 'outline'} className="text-xs">
                        {source.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Review & approve */}
      {(status === 'ready' || status === 'approved') && draft && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Business profile</CardTitle>
              <CardDescription>What we learned about your business (read-only)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <p>
                <span className="font-medium">Name:</span>{' '}
                {soul?.business_profile?.name || '—'}
              </p>
              <p>
                <span className="font-medium">Category:</span>{' '}
                {soul?.business_profile?.category || '—'}
              </p>
              <p className="text-muted-foreground">{soul?.business_profile?.description || ''}</p>
              {soul?.languages && soul.languages.length > 0 && (
                <div className="flex gap-1 flex-wrap pt-1">
                  {soul.languages.map((lang) => (
                    <Badge key={lang} variant="outline" className="text-xs">{lang}</Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Tone</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label>Style</Label>
                  <Input
                    value={draft.tone.style ?? ''}
                    onChange={(e) => setDraft({ ...draft, tone: { ...draft.tone, style: e.target.value } })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Formality</Label>
                  <Input
                    value={draft.tone.formality ?? ''}
                    onChange={(e) => setDraft({ ...draft, tone: { ...draft.tone, formality: e.target.value } })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Emoji usage</Label>
                  <Input
                    value={draft.tone.emoji_usage ?? ''}
                    onChange={(e) => setDraft({ ...draft, tone: { ...draft.tone, emoji_usage: e.target.value } })}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Hours</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-1">
                  <Label>Schedule</Label>
                  <Textarea
                    value={draft.hours.schedule ?? ''}
                    onChange={(e) => setDraft({ ...draft, hours: { ...draft.hours, schedule: e.target.value } })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Timezone</Label>
                  <Input
                    value={draft.hours.timezone ?? ''}
                    onChange={(e) => setDraft({ ...draft, hours: { ...draft.hours, timezone: e.target.value } })}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Products summary</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                className="min-h-[100px]"
                value={draft.products_summary}
                onChange={(e) => setDraft({ ...draft, products_summary: e.target.value })}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0">
              <div>
                <CardTitle>FAQs</CardTitle>
                <CardDescription>Questions your agent will answer</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setDraft({ ...draft, faqs: [...draft.faqs, { question: '', answer: '' }] })}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add FAQ
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {draft.faqs.length === 0 && (
                <p className="text-sm text-muted-foreground">No FAQs yet. Add one above.</p>
              )}
              {draft.faqs.map((faq, index) => (
                <div key={index} className="p-4 border rounded-lg space-y-2">
                  <div className="flex items-start gap-2">
                    <div className="flex-1 space-y-2">
                      <Input
                        placeholder="Question"
                        value={faq.question}
                        onChange={(e) => updateFaq(index, { question: e.target.value })}
                      />
                      <Textarea
                        placeholder="Answer"
                        value={faq.answer}
                        onChange={(e) => updateFaq(index, { answer: e.target.value })}
                      />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() =>
                        setDraft({ ...draft, faqs: draft.faqs.filter((_, i) => i !== index) })
                      }
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Policies</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label>Shipping</Label>
                <Textarea
                  value={draft.policies.shipping ?? ''}
                  onChange={(e) => setDraft({ ...draft, policies: { ...draft.policies, shipping: e.target.value } })}
                />
              </div>
              <div className="space-y-1">
                <Label>Returns</Label>
                <Textarea
                  value={draft.policies.returns ?? ''}
                  onChange={(e) => setDraft({ ...draft, policies: { ...draft.policies, returns: e.target.value } })}
                />
              </div>
              <div className="space-y-1">
                <Label>Payment</Label>
                <Textarea
                  value={draft.policies.payment ?? ''}
                  onChange={(e) => setDraft({ ...draft, policies: { ...draft.policies, payment: e.target.value } })}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button onClick={handleApprove} disabled={isApproving}>
              {isApproving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              {status === 'approved' ? 'Save & re-approve' : 'Approve & activate'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
