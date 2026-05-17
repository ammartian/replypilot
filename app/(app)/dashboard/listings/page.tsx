'use client'

import { useState } from 'react'
import { useQuery, useMutation, useAction } from 'convex/react'
import { api } from '@/convex/_generated/api'
import type { Id } from '@/convex/_generated/dataModel'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Pencil, Trash2, X, Check } from 'lucide-react'

type Listing = {
  _id: Id<'listings'>
  fileName: string
  status: string
  content?: string
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'ready'
      ? 'bg-green-100 text-green-700'
      : status === 'error'
        ? 'bg-red-100 text-red-700'
        : 'bg-yellow-100 text-yellow-700'
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${cls}`}>
      {status}
    </span>
  )
}

function ListingRow({ listing }: { listing: Listing }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(listing.fileName)
  const [content, setContent] = useState(listing.content ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const updateName = useMutation(api.listings.updateListingName)
  const reprocess = useAction(api.listings.reprocessListingContent)
  const deleteListing = useMutation(api.listings.deleteListing)

  async function handleSave() {
    if (!content.trim()) {
      setError('Content cannot be empty')
      return
    }
    setSaving(true)
    setError('')
    try {
      const nameChanged = name.trim() !== listing.fileName
      const contentChanged = content.trim() !== (listing.content ?? '')

      if (nameChanged) {
        await updateName({ listingId: listing._id, fileName: name.trim() })
      }
      if (contentChanged) {
        await reprocess({ listingId: listing._id, content: content.trim() })
      }
      setEditing(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete() {
    if (!window.confirm(`Delete "${listing.fileName}"? This cannot be undone.`)) return
    await deleteListing({ listingId: listing._id })
  }

  if (!editing) {
    return (
      <li className="flex items-center justify-between px-4 py-3 text-sm">
        <div className="flex items-center gap-3 min-w-0">
          <span className="truncate max-w-xs font-medium">{listing.fileName}</span>
          <StatusBadge status={listing.status} />
        </div>
        <div className="flex items-center gap-2 ml-4 shrink-0">
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)}>
            <Pencil className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="sm" onClick={handleDelete} className="text-red-600 hover:text-red-700 hover:bg-red-50">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </li>
    )
  }

  return (
    <li className="px-4 py-4 space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor={`name-${listing._id}`}>Name</Label>
        <Input
          id={`name-${listing._id}`}
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={saving}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor={`content-${listing._id}`}>Listing Details</Label>
        <textarea
          id={`content-${listing._id}`}
          rows={14}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 resize-y font-mono"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={saving}
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Saving…
            </>
          ) : (
            <>
              <Check className="w-4 h-4 mr-2" />
              Save
            </>
          )}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => {
            setEditing(false)
            setName(listing.fileName)
            setContent(listing.content ?? '')
            setError('')
          }}
          disabled={saving}
        >
          <X className="w-4 h-4 mr-2" />
          Cancel
        </Button>
      </div>
    </li>
  )
}

export default function ListingsPage() {
  const listings = useQuery(api.listings.getListingsForAgent)

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 md:px-6 md:py-10 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Listings</h1>
        <p className="text-sm text-neutral-500 mt-1">Manage your property listings. Editing content re-indexes the listing for AI search.</p>
      </div>

      {listings === undefined && (
        <div className="flex items-center gap-2 text-sm text-neutral-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading…
        </div>
      )}

      {listings && listings.length === 0 && (
        <p className="text-sm text-neutral-500">No listings yet. Add one from the onboarding page.</p>
      )}

      {listings && listings.length > 0 && (
        <ul className="divide-y rounded-lg border bg-white">
          {listings.map((l) => (
            <ListingRow key={l._id} listing={l as Listing} />
          ))}
        </ul>
      )}
    </div>
  )
}
