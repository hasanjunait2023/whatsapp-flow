import { useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { FlaskConical, Loader2, RotateCcw, Send, UserRound } from 'lucide-react';

// TODO i18n: hardcoded English strings

interface PlaygroundMessage {
  role: 'user' | 'assistant';
  content: string;
  outcome?: 'reply' | 'handoff' | 'skip';
  handoffReason?: string;
}

interface HermesTestResponse {
  kind: 'reply' | 'handoff' | 'skip';
  reply?: string | null;
  handoff_reason?: string | null;
  run_id?: string;
}

export function AgentPlayground() {
  const [messages, setMessages] = useState<PlaygroundMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
    });
  };

  const handleSend = async () => {
    const content = input.trim();
    if (!content || sending) return;

    const nextMessages: PlaygroundMessage[] = [...messages, { role: 'user', content }];
    setMessages(nextMessages);
    setInput('');
    setSending(true);
    setError(null);
    scrollToBottom();

    const { data, error: invokeError } = await supabase.functions.invoke<HermesTestResponse>(
      'hermes-test',
      {
        body: {
          messages: nextMessages.map((m) => ({ role: m.role, content: m.content })),
        },
      },
    );

    if (invokeError || !data) {
      setError(invokeError?.message ?? 'Test failed');
    } else if (data.kind === 'reply' && data.reply) {
      setMessages([...nextMessages, { role: 'assistant', content: data.reply, outcome: 'reply' }]);
    } else if (data.kind === 'handoff') {
      setMessages([
        ...nextMessages,
        {
          role: 'assistant',
          content: data.reply || 'Conversation handed off to a human agent.',
          outcome: 'handoff',
          handoffReason: data.handoff_reason ?? undefined,
        },
      ]);
    } else {
      setMessages([
        ...nextMessages,
        { role: 'assistant', content: 'Agent chose not to reply.', outcome: 'skip' },
      ]);
    }
    setSending(false);
    scrollToBottom();
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5 text-primary" />
            Playground
          </CardTitle>
          <CardDescription>
            Test how Hermes responds before going live. Messages here are not sent to customers.
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setMessages([]);
            setError(null);
          }}
          disabled={messages.length === 0}
        >
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <div
          ref={scrollRef}
          className="h-72 overflow-y-auto rounded-lg border bg-muted/30 p-3 space-y-3"
        >
          {messages.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-12">
              Send a message as a customer to see how your agent replies.
            </p>
          )}
          {messages.map((message, index) => (
            <div
              key={index}
              className={cn('flex', message.role === 'user' ? 'justify-end' : 'justify-start')}
            >
              <div
                className={cn(
                  'max-w-[80%] rounded-lg px-3 py-2 text-sm',
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background border',
                )}
              >
                {message.outcome === 'handoff' && (
                  <Badge variant="outline" className="mb-1 border-amber-500 text-amber-600">
                    <UserRound className="h-3 w-3 mr-1" />
                    Handoff{message.handoffReason ? `: ${message.handoffReason}` : ''}
                  </Badge>
                )}
                {message.outcome === 'skip' && (
                  <Badge variant="secondary" className="mb-1">
                    Skipped
                  </Badge>
                )}
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="rounded-lg border bg-background px-3 py-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void handleSend();
          }}
        >
          <Input
            placeholder="Type a customer message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={sending}
          />
          <Button type="submit" disabled={sending || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
