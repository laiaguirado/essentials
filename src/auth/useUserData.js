import { useCallback, useContext, useRef } from 'react'
import UserDataContext from './UserDataContext.js'

export function useUserData(key, initialValue) {
  const context = useContext(UserDataContext)
  if (!context) throw new Error('useUserData must be used within UserDataProvider')
  const { getData, setData: setContextData } = context

  const initialValueRef = useRef(initialValue)
  const setData = useCallback(
    nextValue => setContextData(key, initialValueRef.current, nextValue),
    [setContextData, key],
  )

  return [
    getData(key, initialValue),
    setData,
  ]
}

export function useUserDataStatus() {
  const context = useContext(UserDataContext)
  if (!context) throw new Error('useUserDataStatus must be used within UserDataProvider')
  return {
    saveError: context.saveError,
    retrySave: context.retrySave,
    migrationNotice: context.migrationNotice,
  }
}
