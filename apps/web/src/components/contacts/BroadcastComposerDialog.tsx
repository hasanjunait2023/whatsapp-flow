import { useMemo, useRef, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Send,
  Megaphone,
  Shuffle,
  Clock,
  TriangleAlert,
  UserRound,
  Eye,
} from 'lucide-react';
import type { Contact } from '@/hooks/useContacts';
import { useSendBulkMessage } from '@/hooks/useSendBulkMessage';
import { renderPreview, hasVariation } from '@/lib/spintax';
import { toast } from 'sonner';

interface BroadcastComposerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: Contact[];
  instanceId?: string;
  onSent?: () => void;
}

const SECONDS_PER_SEND = 10;
const ICON_STROKE = 1.75;

/** Chips inserted at the cursor. Spintax example teaches the syntax inline. */
const INSERT_CHIPS = [
  { label: '{first_name}', insert: '{first_name}' },
  { label: '{name}', insert: '{name}' },
  { label: '{phone}', insert: '{phone}' },
  { label: '{Hi|Hello|Hey}', insert: '{Hi|Hello|Hey}' },
] as const;

export default function BroadcastComposerDialog({
  open,
  onOpenChange,
  contacts,
  instanceId,
  onSent,
}: BroadcastComposerDialogProps) {
  const [content, setContent] = useState('');
  const [shuffleSeed, setShuffleSeed] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const sendBulk = useSendBulkMessage();

  const sampleContact = contacts[0] ?? null;
  const optedOutCount = useMemo(
    () => contacts.filter((c) => c.opted_out).length,
    [contacts],
  );
  const deliverableCount = contacts.length - optedOutCount;

  const estimatedMinutes = Math.max(
    1,
    Math.ceil((deliverableCount * SECONDS_PER_SEND) / 60),
  );

  const trimmed = content.trim();
  const showVariationWarning = trimmed.length > 0 && !hasVariation(content);

  // Re-rolls whenever content, sample, or shuffle seed changes.
  const previewText = useMemo(() => {
    if (!trimmed) return '';
    void shuffleSeed; // dependency to force a re-roll on shuffle
    return renderPreview(content, {
      name: sampleContact?.name,
      phone: sampleContact?.phone_number,
    });
  }, [content, trimmed, sampleContact, shuffleSeed]);

  const insertAtCursor = (snippet: string) => {
    const el = textareaRef.current;
    if (!el) {
      setContent((prev) => prev + snippet);
      return;
    }
    const start = el.selectionStart ?? content.length;
    const end = el.selectionEnd ?? content.length;
    const next = content.slice(0, start) + snippet + content.slice(end);
    setContent(next);
    // Restore caret just after the inserted snippet.
    requestAnimationFrame(() => {
      el.focus();
      const caret = start + snippet.length;
      el.setSelectionRange(caret, caret);
    });
  };

  const handleClose = (next: boolean) => {
    if (sendBulk.isPending) return;
    onOpenChange(next);
  };

  const handleSend = async () => {
    if (!trimmed || deliverableCount === 0) return;
    try {
      const result = await sendBulk.mutateAsync({
        contactIds: contacts.map((c) => c.id),
        content: trimmed,
        instanceId,
      });
      toast.success(
        `Queued ${result.queued} message${result.queued === 1 ? '' : 's'} — they'll send gradually.`,
      );
      setContent('');
      onOpenChange(false);
      onSent?.();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to queue broadcast';
      toast.error(message);
    }
  };

  const canSend = trimmed.length > 0 && deliverableCount > 0 && !sendBulk.isPending;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl rounded-card">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-success" strokeWidth={ICON_STROKE} />
            Broadcast message
          </DialogTitle>
          <DialogDescription>
            Send a personalized message to your selected contacts. Each recipient
            gets a unique variant to stay ban-safe.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Recipient summary */}
          <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-muted/40 px-3 py-2.5 text-sm">
            <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
              <UserRound className="h-4 w-4 text-muted-foreground" strokeWidth={ICON_STROKE} />
              <span className="tabular-nums">{deliverableCount}</span>
              {deliverableCount === 1 ? 'recipient' : 'recipients'}
            </span>
            {optedOutCount > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-warning-soft px-2.5 py-0.5 text-xs font-medium text-warning">
                <TriangleAlert className="h-3.5 w-3.5" strokeWidth={ICON_STROKE} />
                {optedOutCount} opted-out will be skipped
              </span>
            )}
          </div>

          {/* Message editor */}
          <div className="space-y-2">
            <Label htmlFor="broadcast-content">Message</Label>
            <Textarea
              id="broadcast-content"
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="{Hi|Hello} {first_name}, just checking in about your order..."
              rows={5}
              className="resize-none rounded-control"
            />
            {/* Insertable syntax chips */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Insert:</span>
              {INSERT_CHIPS.map((chip) => (
                <button
                  key={chip.label}
                  type="button"
                  onClick={() => insertAtCursor(chip.insert)}
                  className="rounded-control border border-border bg-background px-2 py-1 font-mono text-xs text-foreground transition-colors hover:border-success/40 hover:bg-success/5"
                >
                  {chip.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              <span className="font-mono">{'{Hi|Hello}'}</span> picks one at random ·{' '}
              <span className="font-mono">{'{first_name}'}</span> fills each contact's name.
            </p>
          </div>

          {/* Variation nudge */}
          {showVariationWarning && (
            <div className="flex items-start gap-2.5 rounded-xl border border-warning/30 bg-warning-soft px-3 py-2.5 text-sm text-warning">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={ICON_STROKE} />
              <p>
                Identical text to many contacts risks a WhatsApp ban. Add{' '}
                <span className="font-mono">{'{first_name}'}</span> or{' '}
                <span className="font-mono">{'{Hi|Hello}'}</span> variants.
              </p>
            </div>
          )}

          {/* Live preview */}
          {trimmed && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5 text-muted-foreground">
                  <Eye className="h-4 w-4" strokeWidth={ICON_STROKE} />
                  Preview
                  {sampleContact && (
                    <span className="font-normal">
                      · for {sampleContact.name || sampleContact.phone_number}
                    </span>
                  )}
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShuffleSeed((s) => s + 1)}
                  className="h-7 gap-1.5 text-xs"
                >
                  <Shuffle className="h-3.5 w-3.5" strokeWidth={ICON_STROKE} />
                  Shuffle
                </Button>
              </div>
              <div className="rounded-xl border border-success/20 bg-success/5 px-3.5 py-3">
                <p className="whitespace-pre-wrap text-sm text-foreground">{previewText}</p>
              </div>
            </div>
          )}

          {/* Drip notice */}
          {deliverableCount > 0 && (
            <div className="flex items-start gap-2.5 rounded-xl border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
              <Clock className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={ICON_STROKE} />
              <p>
                Messages send gradually (~{SECONDS_PER_SEND}s apart) to stay safe —
                about <span className="font-medium text-foreground">{estimatedMinutes} min</span> for{' '}
                <span className="tabular-nums">{deliverableCount}</span> contacts.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)} disabled={sendBulk.isPending}>
            Cancel
          </Button>
          <Button
            variant="success"
            onClick={handleSend}
            disabled={!canSend}
            loading={sendBulk.isPending}
          >
            {!sendBulk.isPending && <Send className="h-4 w-4" strokeWidth={ICON_STROKE} />}
            {sendBulk.isPending
              ? 'Queueing...'
              : `Send to ${deliverableCount} ${deliverableCount === 1 ? 'contact' : 'contacts'}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
