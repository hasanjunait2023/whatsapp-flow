import { Link } from 'react-router-dom';
import { LegalLayout, LegalSection, LEGAL_CONTACT_EMAIL } from './LegalLayout';

const LAST_UPDATED = '1 July 2026';

export default function PrivacyPolicy() {
  return (
    <LegalLayout title="Privacy Policy" lastUpdated={LAST_UPDATED}>
      <p>
        This Privacy Policy explains how Ecomex (the &ldquo;Service&rdquo;),
        operated by Ecomex Technologies Ltd., collects, uses, stores, and protects
        information when you use our messaging and customer-relationship platform. By
        using the Service you agree to the practices described here. The Service
        connects to WhatsApp, Facebook, and Instagram so that businesses can receive
        and send messages from a single inbox.
      </p>

      <LegalSection title="1. Who we are">
        <p>
          Ecomex is a WhatsApp, Facebook, and Instagram CRM and inbox platform for
          businesses. Our Meta application is registered as &ldquo;Ecomex&rdquo; and
          is operated by Ecomex Technologies Ltd., a company incorporated in
          Bangladesh. You can reach us at{' '}
          <a
            href={`mailto:${LEGAL_CONTACT_EMAIL}`}
            className="font-medium text-primary hover:underline"
          >
            {LEGAL_CONTACT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="2. Facebook and Instagram data we access">
        <p>
          With your explicit consent, granted through Facebook Login, the Service
          accesses your connected Facebook Pages and Instagram professional
          accounts in order to receive and send messages on your behalf. We only
          request the permissions required to operate the inbox, and we use this
          access solely to provide the Service to you.
        </p>
        <p>Specifically, we may access and store:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Page and Instagram access tokens</strong> issued by Meta, used
            to send and receive messages on your behalf.
          </li>
          <li>
            <strong>Page and account metadata</strong> such as the Page name, Page
            ID, Instagram account ID, profile picture, and category.
          </li>
          <li>
            <strong>Message content</strong> exchanged between your business and
            your customers through the connected channels, so it can be displayed
            and managed in your inbox.
          </li>
          <li>
            <strong>Customer identifiers</strong> such as Page-Scoped IDs (PSIDs),
            Instagram-Scoped IDs, sender names, and profile pictures supplied by
            Meta, used to attribute conversations to the correct contact.
          </li>
        </ul>
        <p>
          We do not request access to your personal Facebook profile, your friends
          list, or any data unrelated to operating your business inbox.
        </p>
      </LegalSection>

      <LegalSection title="3. Other information we collect">
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Account information</strong> you provide when registering, such
            as your name, email address, and workspace details.
          </li>
          <li>
            <strong>WhatsApp data</strong> for connected WhatsApp numbers, including
            contact phone numbers and message content, used to operate the inbox.
          </li>
          <li>
            <strong>Usage and technical data</strong> such as log files, device and
            browser information, and IP address, used to operate, secure, and
            improve the Service.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="4. How we use your information">
        <p>We use the information described above only to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Operate the CRM inbox and deliver and display your messages.</li>
          <li>Attribute conversations to the correct contacts and team members.</li>
          <li>Provide support, maintain security, and prevent abuse.</li>
          <li>Comply with legal obligations and Meta&rsquo;s platform policies.</li>
        </ul>
        <p>
          We do not use your Facebook, Instagram, or WhatsApp data for advertising,
          and we do not build user profiles for purposes unrelated to the Service.
        </p>
      </LegalSection>

      <LegalSection title="5. How your information is stored and protected">
        <p>
          Your data is stored on secure, server-side infrastructure. Access tokens
          and other sensitive credentials are encrypted at rest. Access to
          production data is restricted to authorized personnel and is protected by
          authentication and access controls. We retain data only for as long as
          your account is active or as needed to provide the Service.
        </p>
      </LegalSection>

      <LegalSection title="6. We do not sell your data">
        <p>
          We do not sell, rent, or trade your personal information, your customers&rsquo;
          information, or any data obtained through Meta to third parties. We share
          data only with infrastructure providers that process it on our behalf to
          run the Service, and only under appropriate confidentiality and data
          protection obligations.
        </p>
      </LegalSection>

      <LegalSection title="7. Data retention">
        <p>
          We keep message history and connected-channel data for as long as your
          account remains active so that you can access your inbox. When you remove
          an integration or delete your account, the associated data is deleted as
          described below, subject to any short technical retention period needed to
          complete the deletion and to any legal retention requirements.
        </p>
      </LegalSection>

      <LegalSection id="revoking-access" title="8. Revoking access">
        <p>
          You can revoke the Service&rsquo;s access to your Facebook Pages and
          Instagram accounts at any time. To do so, go to{' '}
          <strong>
            Facebook → Settings &amp; Privacy → Settings → Business Integrations
          </strong>
          , locate &ldquo;Ecomex&rdquo;, and remove it. Once removed, the
          Service can no longer access your Pages or Instagram accounts, and our
          servers stop receiving new messages from those channels.
        </p>
      </LegalSection>

      <LegalSection id="data-deletion" title="9. Data deletion">
        <p>
          Removing the integration from Facebook Business Integrations triggers our
          data-deletion callback, which begins removal of the data tied to that
          integration, including connected Pages and the message history associated
          with them. You can also request deletion at any time.
        </p>
        <p>
          For instructions and to check the status of a deletion request, see our{' '}
          <Link
            to="/data-deletion"
            className="font-medium text-primary hover:underline"
          >
            Data Deletion page
          </Link>
          . You may also email us at{' '}
          <a
            href={`mailto:${LEGAL_CONTACT_EMAIL}`}
            className="font-medium text-primary hover:underline"
          >
            {LEGAL_CONTACT_EMAIL}
          </a>{' '}
          to request deletion of your data.
        </p>
      </LegalSection>

      <LegalSection title="10. Your rights">
        <p>
          Subject to applicable law, you may request access to, correction of, or
          deletion of your personal data, and you may object to or restrict certain
          processing. To exercise these rights, contact us at{' '}
          <a
            href={`mailto:${LEGAL_CONTACT_EMAIL}`}
            className="font-medium text-primary hover:underline"
          >
            {LEGAL_CONTACT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="11. Changes to this policy">
        <p>
          We may update this Privacy Policy from time to time. When we do, we will
          revise the &ldquo;Last updated&rdquo; date at the top of this page.
          Continued use of the Service after changes take effect constitutes
          acceptance of the updated policy.
        </p>
      </LegalSection>

      <LegalSection title="12. Contact us">
        <p>
          If you have any questions about this Privacy Policy or how we handle your
          data, contact us at{' '}
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
