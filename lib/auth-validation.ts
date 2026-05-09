type SignupInput = { name: string; email: string; password: string }
type LoginInput = { email: string; password: string }

type ValidationResult<T> =
  | { ok: true; data: T }
  | { ok: false; errors: Partial<Record<keyof T, string>> }

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateSignupInput(
  raw: SignupInput,
): ValidationResult<SignupInput> {
  const name = raw.name.trim()
  const email = raw.email.trim()
  const { password } = raw

  const errors: Partial<Record<keyof SignupInput, string>> = {}

  if (!name) errors.name = 'Name is required'
  if (!EMAIL_RE.test(email)) errors.email = 'Valid email required'
  if (password.length < 8) errors.password = 'Password must be at least 8 characters'

  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return { ok: true, data: { name, email, password } }
}

export function validateLoginInput(
  raw: LoginInput,
): ValidationResult<LoginInput> {
  const email = raw.email.trim()
  const { password } = raw

  const errors: Partial<Record<keyof LoginInput, string>> = {}

  if (!email) errors.email = 'Email is required'
  if (!password) errors.password = 'Password is required'

  if (Object.keys(errors).length > 0) return { ok: false, errors }
  return { ok: true, data: { email, password } }
}
