'use client'

import { useState } from 'react'
import { useAuthActions } from '@convex-dev/auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { validateLoginInput } from '@/lib/auth-validation'

export default function LoginPage() {
  const { signIn } = useAuthActions()
  const router = useRouter()

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setServerError(null)

    const form = e.currentTarget
    const raw = {
      email: (form.elements.namedItem('email') as HTMLInputElement).value,
      password: (form.elements.namedItem('password') as HTMLInputElement).value,
    }

    const result = validateLoginInput(raw)
    if (!result.ok) {
      setErrors(result.errors as Record<string, string>)
      return
    }
    setErrors({})

    setLoading(true)
    try {
      await signIn('password', {
        flow: 'signIn',
        email: result.data.email,
        password: result.data.password,
      })
      router.push('/dashboard')
    } catch {
      setServerError('Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Welcome back to ReplyPilot</CardDescription>
      </CardHeader>

      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {serverError && (
            <p className="text-sm text-destructive">{serverError}</p>
          )}

          <div className="space-y-1">
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" placeholder="ahmad@example.com" />
            {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
          </div>

          <div className="space-y-1">
            <Label htmlFor="password">Password</Label>
            <Input id="password" name="password" type="password" />
            {errors.password && <p className="text-sm text-destructive">{errors.password}</p>}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col gap-3">
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </Button>
          <p className="text-sm text-muted-foreground text-center">
            No account?{' '}
            <Link href="/signup" className="underline">Create one</Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
