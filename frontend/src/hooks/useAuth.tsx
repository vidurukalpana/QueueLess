import {
  createContext,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

const TOKEN_KEY = 'queueless.token'

interface AuthContextValue {
  token: string | null
  login: (token: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY))

  const value = useMemo(
    () => ({
      token,
      login: (newToken: string) => {
        localStorage.setItem(TOKEN_KEY, newToken)
        setToken(newToken)
      },
      logout: () => {
        localStorage.removeItem(TOKEN_KEY)
        setToken(null)
      },
    }),
    [token],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider')
  }
  return context
}
