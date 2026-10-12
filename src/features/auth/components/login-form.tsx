import { Alert, Button, PasswordInput, Stack, TextInput } from '@mantine/core'
import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router'

import { authClient } from '@/lib/auth-client'
import { fr } from '@/lib/i18n/fr'

/**
 * Formulaire de connexion. Inputs « contrôlés » : la valeur vit dans un `useState` et `onChange`
 * la met à jour (≈ `v-model`, mais explicite).
 */
export function LoginForm() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    const { error: signInError } = await authClient.signIn.email({
      email,
      password,
    })
    setSubmitting(false)
    if (signInError) {
      // Message volontairement unique : ne pas révéler si c'est l'e-mail ou le mot de passe.
      setError(
        signInError.status === 429
          ? fr.auth.tooManyAttempts
          : fr.auth.invalidCredentials,
      )
      return
    }
    void navigate('/personal', { replace: true })
  }

  return (
    <form onSubmit={(event) => void handleSubmit(event)}>
      <Stack gap="md">
        <TextInput
          autoComplete="username"
          label={fr.auth.email}
          onChange={(event) => setEmail(event.currentTarget.value)}
          required
          type="email"
          value={email}
        />
        <PasswordInput
          autoComplete="current-password"
          label={fr.auth.password}
          onChange={(event) => setPassword(event.currentTarget.value)}
          required
          value={password}
        />
        {error && (
          <Alert color="red" variant="light">
            {error}
          </Alert>
        )}
        <Button loading={submitting} type="submit">
          {fr.auth.submit}
        </Button>
      </Stack>
    </form>
  )
}
