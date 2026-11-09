import { createFileRoute, Link } from '@tanstack/react-router'
import { LegalPage, LegalSection } from '@/components/legal-page'
import {
  LEGAL_POLICIES_UPDATED,
  PRIVACY_CONTACT_EMAIL,
  PRODUCT_NAME,
  PRODUCT_SITE_URL,
} from '@/lib/constants'

export const Route = createFileRoute('/cookies')({
  head: () => ({
    meta: [
      { title: `Cookie Policy · ${PRODUCT_NAME}` },
      {
        name: 'description',
        content: `How ${PRODUCT_NAME} uses cookies and similar storage.`,
      },
    ],
  }),
  component: CookiesPage,
})

function CookiesPage() {
  return (
    <LegalPage title="Cookie Policy" updated={LEGAL_POLICIES_UPDATED}>
      <p>
        This Cookie Policy explains how {PRODUCT_NAME} uses cookies and similar
        technologies on {PRODUCT_SITE_URL} and on wedding websites we host. It
        should be read with our{' '}
        <Link to="/privacy" className="underline underline-offset-4">
          Privacy Policy
        </Link>
        .
      </p>

      <LegalSection title="What cookies are">
        <p>
          Cookies are small text files a site stores on your device. They help
          the site remember a session, keep you signed in, or store a
          preference. Similar technologies include local storage in your
          browser.
        </p>
      </LegalSection>

      <LegalSection title="Cookies and storage we use">
        <p>
          We aim to keep this list short. Today we use the following categories:
        </p>
        <ul className="list-disc space-y-2 pl-5">
          <li>
            <strong>Essential session cookies (admin areas):</strong> when an
            admin signs in with an email one-time code, our authentication
            provider (Supabase) sets cookies so the dashboard can recognise that
            session. These cookies are required for the admin product to work.
            Wedding guests browsing a public wedding site do not need them to
            view the site, RSVP, or send a registry contribution.
          </li>
          <li>
            <strong>Appearance preference (local storage):</strong> if you
            choose light, dark, or system appearance, we store that choice in
            your browser’s local storage so the next visit matches. This is not
            a cookie and is not used to track you across other sites.
          </li>
        </ul>
        <p>
          We do not currently use advertising cookies, social media tracking
          pixels, or third-party analytics cookies on the product.
        </p>
      </LegalSection>

      <LegalSection title="Why we use them">
        <p>
          Essential cookies exist so admins can stay signed in securely while
          managing a wedding. Local storage for appearance exists only to
          remember your display preference.
        </p>
        <p>
          Where GDPR or the ePrivacy rules require consent for non-essential
          cookies, we will ask before setting them. Essential cookies that are
          strictly necessary for a service you request do not require that
          consent.
        </p>
      </LegalSection>

      <LegalSection title="How long they last">
        <p>
          Session cookies last for the signed-in period set by our auth
          provider, or until you sign out or clear your browser data. Local
          storage preferences stay until you clear site data or change the
          preference.
        </p>
      </LegalSection>

      <LegalSection title="How to control cookies">
        <p>
          You can delete or block cookies in your browser settings. If you block
          essential admin cookies, you will not be able to stay signed in to the
          dashboard. Public wedding pages should still work for guests.
        </p>
        <p>
          You can also clear local storage for this site if you want to reset
          appearance preferences.
        </p>
      </LegalSection>

      <LegalSection title="Updates">
        <p>
          If we add analytics or other optional cookies later, we will update
          this page and, where required, ask for consent before setting them.
          The “Last updated” date at the top will change when we revise this
          policy.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Questions about cookies:{' '}
          <a
            href={`mailto:${PRIVACY_CONTACT_EMAIL}`}
            className="underline underline-offset-4"
          >
            {PRIVACY_CONTACT_EMAIL}
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  )
}
