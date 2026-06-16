import { useSearchParams } from 'react-router-dom';
import { CheckCircle2 } from 'lucide-react';
import { LegalLayout, LegalSection, LEGAL_CONTACT_EMAIL } from './LegalLayout';

export default function DataDeletion() {
  const [searchParams] = useSearchParams();
  const code = searchParams.get('code')?.trim() || '';

  return (
    <LegalLayout title="Data Deletion">
      {code ? (
        <>
          <div className="flex items-start gap-3 rounded-xl border border-success/30 bg-success-soft p-4 sm:p-5">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden />
            <div className="space-y-1">
              <p className="font-semibold text-foreground">Request received</p>
              <p className="text-foreground/80">
                Your data deletion request{' '}
                <span className="font-mono font-semibold text-foreground break-all">
                  {code}
                </span>{' '}
                has been received and is being processed.
              </p>
            </div>
          </div>

          <LegalSection title="What gets deleted">
            <p>
              We are removing the data associated with the integration you
              disconnected, including:
            </p>
            <ul className="list-disc space-y-2 pl-5">
              <li>The connected Facebook Pages and Instagram accounts.</li>
              <li>The access tokens issued for those Pages and accounts.</li>
              <li>
                The message history tied to the removed integration, along with the
                related contact identifiers.
              </li>
            </ul>
            <p>
              Deletion completes shortly after the request is received. You can keep
              your confirmation code{' '}
              <span className="font-mono font-semibold text-foreground break-all">
                {code}
              </span>{' '}
              for your records.
            </p>
          </LegalSection>

          <LegalSection title="Questions">
            <p>
              If you have any questions about this deletion request, contact us at{' '}
              <a
                href={`mailto:${LEGAL_CONTACT_EMAIL}`}
                className="font-medium text-primary hover:underline"
              >
                {LEGAL_CONTACT_EMAIL}
              </a>
              .
            </p>
          </LegalSection>
        </>
      ) : (
        <>
          <p>
            You can request deletion of the data that What A App holds about your
            connected Facebook Pages and Instagram accounts at any time.
          </p>

          <LegalSection title="Remove the integration from Facebook">
            <p>
              The fastest way to delete your data is to remove the integration
              directly from Facebook:
            </p>
            <ol className="list-decimal space-y-2 pl-5">
              <li>
                Go to <strong>Facebook → Settings &amp; Privacy → Settings</strong>.
              </li>
              <li>
                Open <strong>Business Integrations</strong>.
              </li>
              <li>
                Find <strong>&ldquo;EcomeX Client&rdquo;</strong> and choose{' '}
                <strong>Remove</strong>.
              </li>
            </ol>
            <p>
              Removing the integration triggers our data-deletion callback, which
              begins removing the data tied to that integration, including the
              connected Pages and the message history associated with them.
            </p>
          </LegalSection>

          <LegalSection title="Request deletion by email">
            <p>
              You can also email us at{' '}
              <a
                href={`mailto:${LEGAL_CONTACT_EMAIL}`}
                className="font-medium text-primary hover:underline"
              >
                {LEGAL_CONTACT_EMAIL}
              </a>{' '}
              from the address associated with your account, and we will process the
              deletion and confirm once it is complete.
            </p>
          </LegalSection>
        </>
      )}
    </LegalLayout>
  );
}
