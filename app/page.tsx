import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      {/* Nav */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
        <span className="font-semibold text-lg tracking-tight">ReplyPilot</span>
        <div className="flex items-center gap-3">
          <Link href="/login" className="text-sm text-zinc-600 hover:text-zinc-900">
            Sign in
          </Link>
          <Button asChild size="sm">
            <Link href="/signup">Get started</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6 py-24 gap-8">
        <div className="flex flex-col items-center gap-4 max-w-2xl">
          <span className="text-sm font-medium text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full">
            For Malaysian real estate agents
          </span>
          <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-zinc-900 leading-tight">
            Never miss a hot lead<br />on WhatsApp again
          </h1>
          <p className="text-lg text-zinc-500 max-w-lg leading-relaxed">
            ReplyPilot qualifies your buyers 24/7 — in Malay, English, or Mandarin — and notifies
            you the moment someone&apos;s ready to buy.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <Button asChild size="lg" className="px-8">
            <Link href="/signup">Start free trial</Link>
          </Button>
          <Link href="/login" className="text-sm text-zinc-500 hover:text-zinc-800">
            Already have an account? Sign in
          </Link>
        </div>

        {/* Social proof / plan hint */}
        <p className="text-sm text-zinc-400">
          From RM 299/month &middot; No setup fee &middot; Cancel anytime
        </p>
      </main>

      {/* Feature strip */}
      <section className="border-t border-zinc-100 bg-zinc-50 py-12 px-6">
        <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-3 gap-8 text-center">
          <div className="flex flex-col items-center gap-2">
            <span className="text-2xl">💬</span>
            <h3 className="font-semibold text-zinc-900">AI replies in seconds</h3>
            <p className="text-sm text-zinc-500">
              Handles enquiries in Malay, English, and Mandarin — round the clock.
            </p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-2xl">🔥</span>
            <h3 className="font-semibold text-zinc-900">Hot lead alerts</h3>
            <p className="text-sm text-zinc-500">
              Get a WhatsApp ping the moment a buyer is serious, with a full summary.
            </p>
          </div>
          <div className="flex flex-col items-center gap-2">
            <span className="text-2xl">🏠</span>
            <h3 className="font-semibold text-zinc-900">Knows your listings</h3>
            <p className="text-sm text-zinc-500">
              Upload your property files and the AI matches buyers to the right unit.
            </p>
          </div>
        </div>
      </section>

      <footer className="py-6 text-center text-xs text-zinc-400 border-t border-zinc-100 flex flex-col items-center gap-1">
        <span>&copy; {new Date().getFullYear()} ReplyPilot. All rights reserved.</span>
        <Link href="/privacy" className="hover:text-zinc-600 underline underline-offset-2">
          Privacy Policy
        </Link>
      </footer>
    </div>
  )
}
