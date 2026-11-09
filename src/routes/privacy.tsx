import { createFileRoute, Link } from '@tanstack/react-router'
import { LegalPage, LegalSection } from '@/components/legal-page'
import {
  LEGAL_POLICIES_UPDATED,
  PRIVACY_CONTACT_EMAIL,
  PRODUCT_NAME,
  PRODUCT_SITE_URL,
  STUDIO_NAME,
} from '@/lib/constants'

export const Route = createFileRoute('/privacy')({
  head: () => ({
    meta: [
      { title: `Privacy Policy · ${PRODUCT_NAME}` },
      {
        name: 'description',
        content: `How ${PRODUCT_NAME} collects, uses, and protects personal data.`,
      },
    ],
  }),
  component: PrivacyPage,
})

function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated={LEGAL_POLICIES_UPDATED}>
      <p>
        This Privacy Policy explains how {PRODUCT_NAME} (“we”, “us”, or “our”)
        collects and uses personal data when you use {PRODUCT_SITE_URL} and
        related wedding websites we host for couples. {PRODUCT_NAME} is operated
        by {STUDIO_NAME}.
      </p>
      <p>
        If you are in the European Economic Area (EEA), the United Kingdom, or
        Switzerland, we process personal data under the EU General Data
        Protection Regulation (GDPR) and the UK GDPR where they apply. This
        notice is written so those rights are clear. It is not legal advice.
        Controllers should review it with their own counsel before relying on it
        in production.
      </p>

      <LegalSection title="Who is responsible">
        <p>
          For the product platform (accounts, billing contact if any, support,
          and product emails), {STUDIO_NAME} operating {PRODUCT_NAME} is the
          data controller.
        </p>
        <p>
          For a couple’s wedding website, the couple (or the wedding admins they
          appoint) decide what guest and registry information to collect. In
          that case they are typically the controller for guest RSVP data,
          registry contribution details, and private photo shares. We act as
          their processor and only process that data to run the service they
          asked for.
        </p>
        <p>
          Contact for privacy requests:{' '}
          <a
            href={`mailto:${PRIVACY_CONTACT_EMAIL}`}
            className="underline underline-offset-4"
          >
            {PRIVACY_CONTACT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="Personal data we collect">
        <p>Depending on how you use the service, we may process:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Admin accounts:</strong> name, email address, optional phone
            number, role, and sign-in activity (email one-time codes).
          </li>
          <li>
            <strong>Wedding settings:</strong> couple names, wedding date, venue
            details, theme choices, and invitation card images.
          </li>
          <li>
            <strong>Guest list and RSVP:</strong> guest names, email, optional
            phone, plus-ones, attendance answers, and related notes the couple
            stores.
          </li>
          <li>
            <strong>Registry contributions:</strong> payer name, email, optional
            phone, amount, currency, payment reference, and bank details the
            couple publish for transfers. We do not take card payments in the
            app.
          </li>
          <li>
            <strong>Photos and media:</strong> images uploaded to the media
            library, gift photos, and private photo-share links.
          </li>
          <li>
            <strong>Activity and support:</strong> admin activity logs, product
            feedback, and support messages.
          </li>
          <li>
            <strong>Technical data:</strong> IP address, device and browser
            type, and basic request logs needed to secure and operate the
            service.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="Why we use personal data">
        <p>We use personal data to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>create and secure admin accounts (email OTP sign-in);</li>
          <li>host and display the couple’s wedding website;</li>
          <li>send invite, RSVP, photo-share, registry, and admin emails;</li>
          <li>track registry contributions the couple chooses to record;</li>
          <li>provide admin tools, activity history, and support;</li>
          <li>keep the service secure, reliable, and legally compliant.</li>
        </ul>
        <p>
          Where GDPR applies, our legal bases are typically: performance of a
          contract (providing the service you asked for), legitimate interests
          (security, product improvement that does not override your rights),
          and consent where we ask for it (for example optional marketing, if we
          add it later). Couples who collect guest data are responsible for
          their own lawful basis toward their guests.
        </p>
      </LegalSection>

      <LegalSection title="Who we share data with">
        <p>
          We do not sell personal data. We share it with processors who help us
          run the product, under contracts that limit how they may use it:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Supabase:</strong> authentication, database, and file
            storage.
          </li>
          <li>
            <strong>Resend:</strong> transactional email delivery.
          </li>
          <li>
            <strong>Vercel:</strong> application hosting and related
            infrastructure.
          </li>
        </ul>
        <p>
          We may also disclose data if the law requires it, or to protect the
          rights, safety, or property of users and {PRODUCT_NAME}.
        </p>
      </LegalSection>

      <LegalSection title="International transfers">
        <p>
          Our processors may store or process data outside your country,
          including in the United States. Where GDPR transfer rules apply, we
          rely on appropriate safeguards such as the processor’s standard
          contractual clauses or other lawful transfer mechanisms they publish.
        </p>
      </LegalSection>

      <LegalSection title="How long we keep data">
        <p>
          We keep personal data while the wedding account is active and as long
          as needed to provide the service. After an account is closed or a
          wedding is removed, we delete or anonymise personal data within a
          reasonable period, unless we must keep it longer for legal claims,
          security, or accounting. Registry contribution records and activity
          logs may be retained while the wedding remains on the platform so the
          couple can audit gifts and changes.
        </p>
      </LegalSection>

      <LegalSection title="Cookies and similar technology">
        <p>
          We use cookies and similar storage as described in our{' '}
          <Link to="/cookies" className="underline underline-offset-4">
            Cookie Policy
          </Link>
          . Essential cookies are required for admin sign-in. Appearance
          preference may be stored in your browser’s local storage.
        </p>
      </LegalSection>

      <LegalSection title="Your rights">
        <p>
          Depending on where you live, you may have the right to access,
          correct, delete, or restrict processing of your personal data; to
          object to certain processing; to data portability; and to withdraw
          consent where processing is based on consent. You may also complain to
          your local data protection authority.
        </p>
        <p>
          To exercise these rights for platform account data, email{' '}
          <a
            href={`mailto:${PRIVACY_CONTACT_EMAIL}`}
            className="underline underline-offset-4"
          >
            {PRIVACY_CONTACT_EMAIL}
          </a>
          . For guest data on a specific wedding site, contact the couple first.
          We will help where we are the processor.
        </p>
      </LegalSection>

      <LegalSection title="Children">
        <p>
          The service is aimed at adults planning a wedding. We do not knowingly
          collect personal data from children under 16. If you believe a child
          has provided personal data, contact us and we will delete it.
        </p>
      </LegalSection>

      <LegalSection title="Security">
        <p>
          We use access controls, encrypted transport (HTTPS), and processor
          security features. No method of transmission or storage is completely
          secure. Please use strong email account security, because admin
          sign-in uses email one-time codes.
        </p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>
          We may update this policy when the product or the law changes. The
          “Last updated” date at the top will change when we do. Continued use
          of the service after an update means you have read the revised policy.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Privacy questions and requests:{' '}
          <a
            href={`mailto:${PRIVACY_CONTACT_EMAIL}`}
            className="underline underline-offset-4"
          >
            {PRIVACY_CONTACT_EMAIL}
          </a>
          .
        </p>
        <p>
          Product site:{' '}
          <a
            href={PRODUCT_SITE_URL}
            className="underline underline-offset-4"
            rel="noreferrer"
            target="_blank"
          >
            {PRODUCT_SITE_URL}
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  )
}
