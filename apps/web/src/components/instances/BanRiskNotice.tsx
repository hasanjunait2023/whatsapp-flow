import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ShieldAlert, TrendingUp } from 'lucide-react';

interface BanRiskNoticeProps {
  /** Whether the user has acknowledged the disclosure. */
  accepted: boolean;
  onAcceptedChange: (accepted: boolean) => void;
}

/**
 * Ban-risk guardrail shown before connecting a WhatsApp number. Combines the
 * warm-up guidance (ramp slowly to avoid bans) with a one-time Terms
 * acknowledgment the tenant must check before they can connect a number.
 *
 * The hard cap (under 30 proactive sends/hour/number) is enforced server-side
 * by the outbound rate limiter; this notice sets expectations and records
 * informed consent for using an unofficial WhatsApp connection.
 */
export function BanRiskNotice({ accepted, onAcceptedChange }: BanRiskNoticeProps) {
  return (
    <div className="space-y-3">
      <Alert>
        <TrendingUp className="h-4 w-4" />
        <AlertTitle>Warm up new numbers slowly</AlertTitle>
        <AlertDescription>
          <ul className="mt-1 list-disc list-inside space-y-1 text-xs">
            <li>Keep proactive messages under 30/hour per number (enforced automatically).</li>
            <li>For the first 1–2 weeks, send low volume and reply to real conversations.</li>
            <li>Avoid identical bulk messages to many new contacts at once.</li>
          </ul>
        </AlertDescription>
      </Alert>

      <Alert variant="destructive">
        <ShieldAlert className="h-4 w-4" />
        <AlertTitle>Unofficial WhatsApp connection</AlertTitle>
        <AlertDescription className="text-xs">
          This connects WhatsApp through an unofficial method. Misuse (spam, mass
          unsolicited messaging) can get the number banned by WhatsApp. You are
          responsible for following WhatsApp&apos;s Terms of Service and messaging
          your own opted-in contacts.
        </AlertDescription>
      </Alert>

      <div className="flex items-start gap-2">
        <Checkbox
          id="ban-risk-ack"
          checked={accepted}
          onCheckedChange={(v) => onAcceptedChange(v === true)}
          className="mt-0.5"
        />
        <Label htmlFor="ban-risk-ack" className="text-xs font-normal leading-snug">
          I understand the ban risk and agree to follow WhatsApp&apos;s Terms of Service.
        </Label>
      </div>
    </div>
  );
}
