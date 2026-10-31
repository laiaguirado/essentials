import { useContext } from 'react'
import UserDataContext from './UserDataContext.js'

export function useUserData(key, initialValue) {
  const context = useContext(UserDataContext)
  if (!context) throw new Error('useUserData must be used within UserDataProvider')

  return [
    context.getData(key, initialValue),
    nextValue => context.setData(key, initialValue, nextValue),
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
