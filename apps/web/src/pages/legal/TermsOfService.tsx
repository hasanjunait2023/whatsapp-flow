import { Link } from 'react-router-dom';
import { LegalLayout, LegalSection, LEGAL_CONTACT_EMAIL } from './LegalLayout';

const LAST_UPDATED = '1 July 2026';

export default function TermsOfService() {
  return (
    <LegalLayout title="Terms of Service" lastUpdated={LAST_UPDATED}>
      <p>
        These Terms of Service (the &ldquo;Terms&rdquo;) govern your access to and
        use of Ecomex (the &ldquo;Service&rdquo;), operated by Ecomex Technologies
        Ltd. By creating an account or using the Service, you agree to be bound by
        these Terms. If you do not agree, do not use the Service.
      </p>

      <LegalSection title="1. The Service">
        <p>
          Ecomex is a customer-relationship and inbox platform that lets businesses
          receive and send messages across WhatsApp, Facebook, and Instagram from a
          unified workspace. WhatsApp connectivity is provided through the official
          WhatsApp Business API operated by Meta. We may add, change, or remove
          features over time.
        </p>
      </LegalSection>

      <LegalSection title="2. Accounts and responsibilities">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            You must provide accurate registration information and keep it current.
          </li>
          <li>
            You are responsible for safeguarding your account credentials and for
            all activity that occurs under your account.
          </li>
          <li>
            You are responsible for the conduct of every team member you invite to
            your workspace.
          </li>
          <li>
            You must promptly notify us of any unauthorized use of your account.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Acceptable use">
        <p>You agree not to use the Service to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Send spam, unsolicited bulk messages, or unlawful content.</li>
          <li>
            Harass, defraud, or harm others, or violate the rights of any person.
          </li>
          <li>
            Violate any applicable law, regulation, or third-party platform policy,
            including the policies of WhatsApp, Facebook, and Instagram.
          </li>
          <li>
            Attempt to gain unauthorized access to the Service, other accounts, or
            our systems, or interfere with their operation.
          </li>
        </ul>
        <p>
          You are solely responsible for the messages and content you send through
          the Service and for obtaining any consent required to contact your
          customers.
        </p>
      </LegalSection>

      <LegalSection title="4. WhatsApp and Meta platform compliance">
        <p>
          WhatsApp connectivity is provided through the official WhatsApp Business
          API on Meta&rsquo;s Cloud. You acknowledge and agree that:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            You must comply with the WhatsApp Business Messaging Policy, WhatsApp
            Commerce Policy, and Meta Platform Terms at all times when using the
            Service.
          </li>
          <li>
            You may only send messages to users who have opted in to receive
            communications from your business, and you must honour opt-out requests
            promptly.
          </li>
          <li>
            Message templates must be submitted to and approved by Meta before use.
            We provide tools and guidance to help you create compliant templates.
          </li>
          <li>
            We do not control and are not responsible for actions taken by Meta or
            WhatsApp against your account, including rate limits, quality-rating
            downgrades, or restrictions resulting from your messaging patterns.
          </li>
          <li>
            Connectivity, message delivery, pricing, and feature availability may
            change if Meta or WhatsApp updates its platforms, policies, or pricing.
          </li>
        </ul>
        <p>
          Your use of Facebook and Instagram features is also subject to Meta&rsquo;s
          own terms and policies. You are responsible for understanding and
          complying with them.
        </p>
      </LegalSection>

      <LegalSection title="5. Fees and trials">
        <p>
          Paid plans, trials, and billing terms are presented at sign-up and in your
          billing settings. Unless stated otherwise, fees are non-refundable. We may
          change pricing on a prospective basis with reasonable notice.
        </p>
      </LegalSection>

      <LegalSection title="6. Privacy">
        <p>
          Our handling of your data is described in our{' '}
          <Link
            to="/privacy"
            className="font-medium text-primary hover:underline"
          >
            Privacy Policy
          </Link>
          , which forms part of these Terms. By using the Service you also agree to
          that policy.
        </p>
      </LegalSection>

      <LegalSection title="7. Intellectual property">
        <p>
          The Service, including its software, design, and trademarks, is owned by
          Ecomex and its licensors and is protected by intellectual property laws.
          You retain ownership of the content you send through the Service. You grant
          us the limited rights needed to process and display that content in order
          to operate the Service for you.
        </p>
      </LegalSection>

      <LegalSection title="8. Disclaimer of warranties">
        <p>
          The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;
          without warranties of any kind, whether express or implied, including
          merchantability, fitness for a particular purpose, and non-infringement.
          We do not warrant that the Service will be uninterrupted, error-free, or
          secure, or that messages will always be delivered.
        </p>
      </LegalSection>

      <LegalSection title="9. Limitation of liability">
        <p>
          To the maximum extent permitted by law, Ecomex and its affiliates will not
          be liable for any indirect, incidental, special, consequential, or
          punitive damages, or for any loss of profits, revenue, data, or goodwill,
          arising out of or related to your use of the Service. This includes, without
          limitation, any restriction or ban of your WhatsApp numbers, Pages, or
          accounts by Meta or WhatsApp. Our total aggregate liability for any claim
          relating to the Service will not exceed the amount you paid us for the
          Service in the twelve months preceding the claim.
        </p>
      </LegalSection>

      <LegalSection title="10. Termination">
        <p>
          You may stop using the Service and delete your account at any time. We may
          suspend or terminate your access if you breach these Terms, create risk or
          legal exposure for us, or use the Service in a way that violates applicable
          law or platform policies. Upon termination, your right to use the Service
          ends, and we will handle your data as described in our Privacy Policy.
        </p>
      </LegalSection>

      <LegalSection title="11. Changes to these Terms">
        <p>
          We may update these Terms from time to time. When we do, we will revise the
          &ldquo;Last updated&rdquo; date above. Your continued use of the Service
          after changes take effect constitutes acceptance of the updated Terms.
        </p>
      </LegalSection>

      <LegalSection title="12. Contact us">
        <p>
          Questions about these Terms can be sent to{' '}
          <a
            href={`mailto:${LEGAL_CONTACT_EMAIL}`}
            className="font-medium text-primary hover:underline"
          >
            {LEGAL_CONTACT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>
    </LegalLayout>
  );
}
