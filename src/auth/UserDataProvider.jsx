import PropTypes from 'prop-types'
import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase.js'
import UserDataContext from './UserDataContext.js'
const MIGRATION_MARKER = 'essentials-cloud-migration-v1'
const LOCAL_KEYS = ['dailyTasks', 'dailyHabits', 'expenses', 'expenseBudgets']

function readLocalData() {
  return LOCAL_KEYS.flatMap(key => {
    const rawValue = localStorage.getItem(key)
    if (rawValue === null) return []

    let value
    try {
      value = JSON.parse(rawValue)
    } catch {
      throw new Error(`No se pudo leer el dato local "${key}". No se ha migrado ni borrado.`)
    }

    if (key === 'dailyTasks' && !Array.isArray(value)) {
      throw new Error('Las tareas locales tienen un formato no válido. No se han migrado ni borrado.')
    }
    if (key === 'expenses' && !Array.isArray(value)) {
      throw new Error('Los gastos locales tienen un formato no válido. No se han migrado ni borrado.')
    }
    if ((key === 'dailyHabits' || key === 'expenseBudgets') &&
        (value === null || typeof value !== 'object' || Array.isArray(value))) {
      throw new Error(`El dato local "${key}" tiene un formato no válido. No se ha migrado ni borrado.`)
    }

    if (key === 'expenses') {
      value = value.map(expense => expense.category === 'comida'
        ? { ...expense, category: 'restaurantes' }
        : expense)
    }

    if (key === 'expenseBudgets') {
      const hasMonthSpecificBudgets = Object.keys(value).some(month => /^\d{4}-\d{2}$/.test(month))
      const monthBudgets = hasMonthSpecificBudgets
        ? value
        : { [new Date().toISOString().slice(0, 7)]: value }
      value = Object.fromEntries(Object.entries(monthBudgets).map(([month, budgets]) => {
        const migratedBudgets = { ...budgets }
        if (migratedBudgets.restaurantes === undefined && migratedBudgets.comida !== undefined) {
          migratedBudgets.restaurantes = migratedBudgets.comida
        }
        delete migratedBudgets.comida
        return [month, migratedBudgets]
      }))
    }

    return [{ key, value }]
  })
}

export function UserDataProvider({ userId, children }) {
  const [records, setRecords] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [saveError, setSaveError] = useState('')
  const [migrationNotice, setMigrationNotice] = useState('')
  const savedRecords = useRef({})
  const latestRecords = useRef(records)
  const saveQueues = useRef({})
  latestRecords.current = records

  useEffect(() => {
    let active = true

    async function loadUserData() {
      setRecords(null)
      setLoadError('')
      setSaveError('')
      setMigrationNotice('')

      const { data, error } = await supabase
        .from('user_data')
        .select('key, value')
        .eq('user_id', userId)

      if (!active) return
      if (error) {
        setLoadError(`No se pudieron cargar tus datos: ${error.message}`)
        return
      }

      const cloudRecords = Object.fromEntries(data.map(record => [record.key, record.value]))
      const migrationStatus = localStorage.getItem(MIGRATION_MARKER)
      let nextMigrationNotice = ''

      if (!migrationStatus) {
        try {
          const localRecords = readLocalData()
          if (localRecords.length > 0 && data.length === 0) {
            const rows = localRecords.map(record => ({ ...record, user_id: userId }))
            const { error: migrationError } = await supabase
              .from('user_data')
              .upsert(rows, { onConflict: 'user_id,key' })

            if (migrationError) throw migrationError
            for (const { key } of localRecords) localStorage.removeItem(key)
            Object.assign(cloudRecords, Object.fromEntries(localRecords.map(({ key, value }) => [key, value])))
            localStorage.setItem(MIGRATION_MARKER, `migrated:${userId}`)
          } else {
            localStorage.setItem(
              MIGRATION_MARKER,
              data.length > 0 && localRecords.length > 0 ? `skipped:${userId}` : `empty:${userId}`,
            )
            if (data.length > 0 && localRecords.length > 0) {
              nextMigrationNotice = 'Los datos antiguos de este navegador no se importaron porque esta cuenta ya tiene datos. Siguen guardados localmente.'
            }
          }
        } catch (migrationError) {
          localStorage.setItem(MIGRATION_MARKER, `skipped:${userId}`)
          nextMigrationNotice = `No se completó la migración de datos locales: ${migrationError.message} Los datos siguen guardados en este navegador.`
        }
      } else if (migrationStatus.startsWith('skipped:')) {
        nextMigrationNotice = 'Los datos antiguos de este navegador no se importaron. Siguen guardados localmente.'
      }

      if (!active) return
      savedRecords.current = cloudRecords
      setRecords(cloudRecords)
      setMigrationNotice(nextMigrationNotice)
    }

    loadUserData()
    return () => {
      active = false
    }
  }, [userId])

  const persist = useCallback((key) => {
    const previous = saveQueues.current[key] || Promise.resolve()
    const operation = previous.catch(() => {}).then(async () => {
      const currentRecords = latestRecords.current
      if (!currentRecords || JSON.stringify(currentRecords[key]) === JSON.stringify(savedRecords.current[key])) {
        return
      }

      const value = currentRecords[key]
      const { error } = await supabase
        .from('user_data')
        .upsert(
          { user_id: userId, key, value, updated_at: new Date().toISOString() },
          { onConflict: 'user_id,key' },
        )
      if (error) throw error

      savedRecords.current = { ...savedRecords.current, [key]: value }
      setSaveError('')
    }).catch(error => {
      setSaveError(`No se pudieron guardar tus cambios (${key}): ${error.message}`)
    })
    saveQueues.current[key] = operation
    return operation
  }, [userId])

  useEffect(() => {
    if (!records) return
    for (const key of Object.keys(records)) {
      if (JSON.stringify(records[key]) !== JSON.stringify(savedRecords.current[key])) persist(key)
    }
  }, [records, persist])

  const getData = useCallback((key, initialValue) => (
    records && Object.hasOwn(records, key) ? records[key] : initialValue
  ), [records])

  const setData = useCallback((key, initialValue, nextValue) => {
    setRecords(current => {
      if (!current) return current
      const currentValue = Object.hasOwn(current, key) ? current[key] : initialValue
      const value = typeof nextValue === 'function' ? nextValue(currentValue) : nextValue
      return { ...current, [key]: value }
    })
  }, [])

  const retrySave = useCallback(() => {
    if (!records) return
    for (const key of Object.keys(records)) {
      if (JSON.stringify(records[key]) !== JSON.stringify(savedRecords.current[key])) persist(key)
    }
  }, [persist, records])

  if (loadError) {
    return (
      <div className="account-message" role="alert">
        <p>{loadError}</p>
        <button onClick={() => window.location.reload()}>Reintentar</button>
      </div>
    )
  }
  if (!records) return <div className="account-message">Cargando tus datos…</div>

  return (
    <UserDataContext.Provider value={{ getData, setData, saveError, retrySave, migrationNotice }}>
      {children}
    </UserDataContext.Provider>
  )
}

UserDataProvider.propTypes = {
  userId: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
}
