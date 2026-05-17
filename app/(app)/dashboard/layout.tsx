'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useQuery } from 'convex/react'
import { api } from '@/convex/_generated/api'
import { useAuthActions } from '@convex-dev/auth/react'
import { Button } from '@/components/ui/button'
import { LayoutDashboard, Settings, LogOut, FileText, Menu, X } from 'lucide-react'
import { useState } from 'react'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const agent = useQuery(api.agents.getAgent)
  const { signOut } = useAuthActions()
  const [menuOpen, setMenuOpen] = useState(false)

  const nav = [
    { href: '/dashboard', label: 'Leads', icon: LayoutDashboard },
    { href: '/dashboard/listings', label: 'Listings', icon: FileText },
    { href: '/dashboard/settings', label: 'Settings', icon: Settings },
  ]

  const sidebarContent = (
    <>
      <div className="p-4 border-b flex items-center justify-between">
        <span className="font-bold text-lg tracking-tight">ReplyPilot</span>
        <button
          className="md:hidden text-neutral-500 hover:text-neutral-900"
          onClick={() => setMenuOpen(false)}
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <nav className="flex-1 p-3 space-y-1">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setMenuOpen(false)}
            className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              pathname === href
                ? 'bg-neutral-100 text-neutral-900'
                : 'text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="p-3 border-t">
        <div className="text-xs text-neutral-500 px-3 mb-2 truncate">{agent?.email}</div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 text-neutral-600"
          onClick={() => signOut()}
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </Button>
      </div>
    </>
  )

  return (
    <div className="min-h-screen flex">
      {/* Mobile top header */}
      <header className="fixed top-0 left-0 right-0 h-12 bg-white border-b flex items-center px-4 z-30 md:hidden">
        <button
          className="text-neutral-500 hover:text-neutral-900 mr-3"
          onClick={() => setMenuOpen(true)}
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="font-bold text-base tracking-tight">ReplyPilot</span>
      </header>

      {/* Mobile overlay */}
      {menuOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed top-0 left-0 h-full w-56 bg-white border-r flex flex-col z-50 transition-transform duration-200 md:hidden ${
          menuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-56 bg-white border-r flex-col">
        {sidebarContent}
      </aside>

      <main className="flex-1 bg-gray-50 overflow-auto pt-12 md:pt-0">{children}</main>
    </div>
  )
}
