import { useState } from 'react'
import App from '../App.jsx'
import { useAuth } from './useAuth.js'
import AuthScreen from './AuthScreen.jsx'
import { isSupabaseConfigured, supabase } from './supabase.js'
import { UserDataProvider } from './UserDataProvider.jsx'
import { useUserDataStatus } from './useUserData.js'

function PasswordRecovery() {
  const { setIsRecoveringPassword } = useAuth()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (event) => {
    event.preventDefault()
    setError('')
    setMessage('')
    if (password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.')
    if (password !== confirmation) return setError('Las contraseñas no coinciden.')
    setSaving(true)
    const { error: updateError } = await supabase.auth.updateUser({ password })
    setSaving(false)
    if (updateError) return setError(updateError.message)
    setPassword('')
    setConfirmation('')
    setMessage('Contraseña actualizada. Ya puedes continuar usando Essentials.')
    setIsRecoveringPassword(false)
  }

  return (
    <main className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <h1>Nueva contraseña</h1>
        <p>Elige una nueva contraseña para tu cuenta.</p>
        <label>Nueva contraseña<input type="password" value={password} onChange={event => setPassword(event.target.value)} minLength={6} autoComplete="new-password" required /></label>
        <label>Repite la contraseña<input type="password" value={confirmation} onChange={event => setConfirmation(event.target.value)} minLength={6} autoComplete="new-password" required /></label>
        {(error || message) && <p className={error ? 'auth-error' : 'auth-success'} role={error ? 'alert' : 'status'}>{error || message}</p>}
        <button type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Actualizar contraseña'}</button>
      </form>
    </main>
  )
}

function AuthenticatedApp() {
  const { session, signOut, setError, error: authError, isRecoveringPassword } = useAuth()
  const { saveError, retrySave, migrationNotice } = useUserDataStatus()
  const [showPasswordForm, setShowPasswordForm] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      setError(error.message)
    }
  }

  const handlePasswordChange = async (event) => {
    event.preventDefault()
    setPasswordError('')
    setPasswordMessage('')
    if (newPassword.length < 6) {
      setPasswordError('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    if (newPassword !== passwordConfirmation) {
      setPasswordError('Las contraseñas no coinciden.')
      return
    }
    setSavingPassword(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setSavingPassword(false)
    if (error) {
      setPasswordError(error.message)
      return
    }
    setNewPassword('')
    setPasswordConfirmation('')
    setPasswordMessage('Contraseña actualizada correctamente.')
  }

  if (isRecoveringPassword) return <PasswordRecovery />

  return (
    <>
      <header className="account-bar">
        <div className="account-identity"><span className="account-avatar">{session.user.email.slice(0, 1).toUpperCase()}</span><div className="account-copy"><small>Sesión iniciada</small><strong>{session.user.email}</strong></div></div>
        <div className="account-actions">
          <button type="button" onClick={() => { setShowPasswordForm(value => !value); setPasswordError(''); setPasswordMessage('') }}>Cambiar contraseña</button>
          <button type="button" onClick={handleSignOut}>Cerrar sesión</button>
        </div>
        {showPasswordForm && (
          <form className="password-change-form" onSubmit={handlePasswordChange}>
            <strong>Cambiar contraseña</strong>
            <input type="password" value={newPassword} onChange={event => setNewPassword(event.target.value)} placeholder="Nueva contraseña" autoComplete="new-password" minLength={6} required />
            <input type="password" value={passwordConfirmation} onChange={event => setPasswordConfirmation(event.target.value)} placeholder="Repite la contraseña" autoComplete="new-password" minLength={6} required />
            {passwordError && <p className="password-change-error" role="alert">{passwordError}</p>}
            {passwordMessage && <p className="password-change-success" role="status">{passwordMessage}</p>}
            <div className="password-change-actions">
              <button type="submit" disabled={savingPassword}>{savingPassword ? 'Guardando…' : 'Guardar'}</button>
              <button type="button" onClick={() => setShowPasswordForm(false)}>Cancelar</button>
            </div>
          </form>
        )}
      </header>
      <div className="authenticated-content">
      {authError && <p className="save-warning" role="alert">{authError}</p>}
      {migrationNotice && <p className="save-warning" role="status">{migrationNotice}</p>}
      {saveError && (
        <p className="save-warning" role="alert">
          {saveError}
          <button onClick={retrySave} style={{ marginLeft: 12 }}>Reintentar guardado</button>
        </p>
      )}
      <App />
      </div>
    </>
  )
}

export default function AppShell() {
  const { session, loading } = useAuth()

  if (!isSupabaseConfigured) {
    return (
      <main className="account-message" role="alert">
        <h1>Falta configurar Supabase</h1>
        <p>Crea un proyecto de Supabase, aplica <code>supabase/schema.sql</code> y configura las variables VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.</p>
        <p>Consulta el README para completar la configuración.</p>
      </main>
    )
  }

  if (loading) return <div className="account-message">Comprobando sesión…</div>
  if (!session) return <AuthScreen />

  return (
    <UserDataProvider key={session.user.id} userId={session.user.id}>
      <AuthenticatedApp />
    </UserDataProvider>
  )
}
