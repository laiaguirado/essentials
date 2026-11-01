import { useState } from 'react'
import { useAuth } from './useAuth.js'
import './auth.css'

export default function AuthScreen() {
  const { signIn, signUp, resetPasswordForEmail, error: authError, setError } = useAuth()
  const [isSignUp, setIsSignUp] = useState(false)
  const [isForgotten, setIsForgotten] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setMessage('')
    setError('')
    setSubmitting(true)
    try {
      if (isForgotten) {
        await resetPasswordForEmail(email)
        setMessage('Te hemos enviado un enlace para actualizar tu contraseña. Revisa tu correo.')
      } else if (isSignUp) {
        const result = await signUp(email, password)
        if (!result.session) {
          setMessage('Cuenta creada. Revisa tu correo para confirmar la dirección antes de iniciar sesión.')
        }
      } else {
        await signIn(email, password)
      }
    } catch (error) {
      setError(error.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (isForgotten) {
    return (
      <main className="auth-page">
        <form className="auth-card" onSubmit={submit}>
          <h1>Recuperar contraseña</h1>
          <p>Introduce tu correo y te enviaremos un enlace seguro para actualizarla.</p>
          <label>
            Correo electrónico
            <input type="email" autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} required />
          </label>
          {(authError || message) && <p className={authError ? 'auth-error' : 'auth-success'} role={authError ? 'alert' : 'status'}>{authError || message}</p>}
          <button type="submit" disabled={submitting}>{submitting ? 'Enviando…' : 'Enviar enlace'}</button>
          <button className="auth-toggle" type="button" onClick={() => { setIsForgotten(false); setError(''); setMessage('') }}>Volver al inicio de sesión</button>
        </form>
      </main>
    )
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <h1>Essentials</h1>
        <p>{isSignUp ? 'Crea una cuenta para guardar tus datos privados.' : 'Inicia sesión para ver tus datos.'}</p>
        <label>
          Correo electrónico
          <input
            type="email"
            autoComplete="email"
            value={email}
            onChange={event => setEmail(event.target.value)}
            required
          />
        </label>
        <label>
          Contraseña
          <input
            type="password"
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
            value={password}
            onChange={event => setPassword(event.target.value)}
            minLength={6}
            required
          />
        </label>
        {(authError || message) && (
          <p className={authError ? 'auth-error' : 'auth-success'} role={authError ? 'alert' : 'status'}>
            {authError || message}
          </p>
        )}
        <button type="submit" disabled={submitting}>
          {submitting ? 'Un momento…' : isSignUp ? 'Crear cuenta' : 'Iniciar sesión'}
        </button>
        {!isSignUp && (
          <button className="auth-toggle" type="button" onClick={() => { setIsForgotten(true); setError(''); setMessage('') }}>
            ¿Has olvidado tu contraseña?
          </button>
        )}
        <button
          className="auth-toggle"
          type="button"
          onClick={() => {
            setIsSignUp(value => !value)
            setIsForgotten(false)
            setError('')
            setMessage('')
          }}
        >
          {isSignUp ? 'Ya tengo una cuenta' : 'Crear una cuenta'}
        </button>
      </form>
    </main>
  )
}
