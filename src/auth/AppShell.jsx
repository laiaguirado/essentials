import App from '../App.jsx'
import { useAuth } from './useAuth.js'
import AuthScreen from './AuthScreen.jsx'
import { isSupabaseConfigured } from './supabase.js'
import { UserDataProvider } from './UserDataProvider.jsx'
import { useUserDataStatus } from './useUserData.js'

function AuthenticatedApp() {
  const { session, signOut, setError, error: authError } = useAuth()
  const { saveError, retrySave, migrationNotice } = useUserDataStatus()

  const handleSignOut = async () => {
    try {
      await signOut()
    } catch (error) {
      setError(error.message)
    }
  }

  return (
    <>
      <header className="account-bar">
        <span>{session.user.email}</span>
        <button onClick={handleSignOut}>Cerrar sesión</button>
      </header>
      {authError && <p className="save-warning" role="alert">{authError}</p>}
      {migrationNotice && <p className="save-warning" role="status">{migrationNotice}</p>}
      {saveError && (
        <p className="save-warning" role="alert">
          {saveError}
          <button onClick={retrySave} style={{ marginLeft: 12 }}>Reintentar guardado</button>
        </p>
      )}
      <App />
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
