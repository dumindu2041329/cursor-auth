import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { PublicUser } from './api'
import { changePassword, getCurrentUser, onAuthChange, signIn, signInWithGoogleIdToken, signOut, signUp, updateProfile } from './api'

type AuthContextValue = {
  user: PublicUser | null
  loading: boolean
  signInWithPassword: (email: string, password: string) => Promise<void>
  signUpWithPassword: (name: string, email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  updateProfile: (updates: Partial<Pick<PublicUser, 'name' | 'email' | 'avatarUrl'>>) => Promise<void>
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>
  signInWithGoogle: (idToken: string) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    getCurrentUser().then((u) => {
      if (mounted) setUser(u)
      if (mounted) setLoading(false)
    })
    const unsub = onAuthChange((u) => setUser(u))
    return () => {
      mounted = false
      unsub()
    }
  }, [])

  const value = useMemo<AuthContextValue>(() => ({
    user,
    loading,
    async signInWithPassword(email, password) {
      const u = await signIn(email, password)
      setUser(u)
    },
    async signUpWithPassword(name, email, password) {
      const u = await signUp(name, email, password)
      setUser(u)
    },
    async signOut() {
      await signOut()
      setUser(null)
    },
    async updateProfile(updates) {
      const u = await updateProfile(updates)
      setUser(u)
    },
    async changePassword(currentPassword, newPassword) {
      await changePassword(currentPassword, newPassword)
    },
    async signInWithGoogle(idToken) {
      const u = await signInWithGoogleIdToken(idToken)
      setUser(u)
    }
  }), [user, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}


