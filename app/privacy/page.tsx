import Link from 'next/link'

export const metadata = {
  title: 'Privacy Policy — ReplyPilot',
}

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
        <Link href="/" className="font-semibold text-lg tracking-tight">
          ReplyPilot
        </Link>
      </header>

      <main className="flex-1 max-w-2xl mx-auto px-6 py-16 w-full">
        <h1 className="text-3xl font-bold text-zinc-900 mb-2">Privacy Policy</h1>
        <p className="text-sm text-zinc-400 mb-10">Last updated: May 13, 2026</p>

        <div className="space-y-8 text-zinc-700 leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-2">1. Who we are</h2>
            <p>
              ReplyPilot is an AI-powered WhatsApp lead qualification service for real estate agents
              in Malaysia. We are operated by ReplyPilot (&ldquo;we&rdquo;, &ldquo;us&rdquo;,
              &ldquo;our&rdquo;).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-2">2. Data we collect</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>
                <strong>Agent account data</strong> — name, email address, WhatsApp Business number
              </li>
              <li>
                <strong>WhatsApp Business credentials</strong> — Meta phone number ID, WABA ID,
                access token (encrypted at rest)
              </li>
              <li>
                <strong>Conversation data</strong> — WhatsApp messages between buyers and your
                AI agent, stored to power lead qualification and summaries
              </li>
              <li>
                <strong>Listing data</strong> — property details you upload to configure your agent
              </li>
              <li>
                <strong>Billing data</strong> — handled by Stripe; we do not store card numbers
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-2">3. How we use your data</h2>
            <ul className="list-disc list-inside space-y-1">
              <li>To operate the ReplyPilot service on your behalf</li>
              <li>To qualify buyer leads and generate summaries for you</li>
              <li>To send you hot lead notifications via WhatsApp</li>
              <li>To process payments and manage your subscription</li>
              <li>To improve our AI models and service quality</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-2">4. WhatsApp and Meta</h2>
            <p>
              ReplyPilot integrates with the Meta WhatsApp Business Platform. By connecting your
              WhatsApp Business Account, you agree to Meta&apos;s{' '}
              <a
                href="https://www.whatsapp.com/legal/business-policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-700 underline underline-offset-2"
              >
                WhatsApp Business Policy
              </a>{' '}
              and{' '}
              <a
                href="https://www.facebook.com/privacy/policy"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-700 underline underline-offset-2"
              >
                Meta Privacy Policy
              </a>
              . We process WhatsApp messages on your behalf as a data processor. You remain the
              data controller for conversations with your buyers.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-2">5. Data sharing</h2>
            <p>We do not sell your data. We share data only with:</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>
                <strong>Anthropic</strong> — to generate AI replies (conversation content sent to
                Claude API)
              </li>
              <li>
                <strong>Meta</strong> — to deliver WhatsApp messages via their Cloud API
              </li>
              <li>
                <strong>Stripe</strong> — to process subscription payments
              </li>
              <li>
                <strong>Convex</strong> — our database and backend infrastructure provider
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-2">6. Data retention</h2>
            <p>
              Conversation data is retained for 12 months from the date of the last message.
              Account data is retained until you delete your account. You may request deletion at
              any time by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-2">7. Security</h2>
            <p>
              WhatsApp access tokens are encrypted at rest. We use HTTPS for all data in transit.
              Access to production data is restricted to authorised personnel only.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-2">8. Your rights</h2>
            <p>You may at any time:</p>
            <ul className="list-disc list-inside space-y-1 mt-2">
              <li>Request a copy of your data</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your account and associated data</li>
              <li>Disconnect your WhatsApp Business Account</li>
            </ul>
            <p className="mt-2">
              To exercise these rights, email us at{' '}
              <a
                href="mailto:ammartian.dev@gmail.com"
                className="text-emerald-700 underline underline-offset-2"
              >
                ammartian.dev@gmail.com
              </a>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-2">9. Changes to this policy</h2>
            <p>
              We may update this policy as the service evolves. We will notify you via email or
              in-app notice for material changes.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-zinc-900 mb-2">10. Contact</h2>
            <p>
              Questions?{' '}
              <a
                href="mailto:ammartian.dev@gmail.com"
                className="text-emerald-700 underline underline-offset-2"
              >
                ammartian.dev@gmail.com
              </a>
            </p>
          </section>
        </div>
      </main>

      <footer className="py-6 text-center text-xs text-zinc-400 border-t border-zinc-100">
        &copy; {new Date().getFullYear()} ReplyPilot. All rights reserved.
      </footer>
    </div>
  )
}
