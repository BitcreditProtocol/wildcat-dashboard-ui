import { useState, useEffect } from "react"
import keycloak from "../keycloak"

interface KeycloakProfile {
  username?: string
  email?: string
}

interface KeycloakTokenParsed {
  preferred_username?: string
  email?: string
}

interface KeycloakUser {
  name: string
  email: string
  avatar: string
}

interface UseKeycloakReturn {
  isAuthenticated: boolean
  isLoading: boolean
  user: KeycloakUser | null
}

export function useKeycloak(): UseKeycloakReturn {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<KeycloakUser | null>(null)

  useEffect(() => {
    const updateAuthState = () => {
      if (keycloak.authenticated) {
        setIsAuthenticated(true)
        setUser({
          name: (keycloak.profile as KeycloakProfile)?.username ?? (keycloak.tokenParsed as KeycloakTokenParsed)?.preferred_username ?? 'Unknown User',
          email: (keycloak.profile as KeycloakProfile)?.email ?? (keycloak.tokenParsed as KeycloakTokenParsed)?.email ?? '',
          avatar: "",
        })
      } else {
        setIsAuthenticated(false)
        setUser(null)
      }
      setIsLoading(false)
    }

    if (keycloak.authenticated) {
      updateAuthState()
    }

    keycloak.onAuthSuccess = () => {
      updateAuthState()
    }

    keycloak.onAuthError = () => {
      setIsAuthenticated(false)
      setUser(null)
      setIsLoading(false)
    }

    keycloak.onAuthLogout = () => {
      setIsAuthenticated(false)
      setUser(null)
      setIsLoading(false)
    }

    if (!keycloak.authenticated && !keycloak.loginRequired) {
      const checkAuth = () => {
        if (keycloak.authenticated || keycloak.loginRequired) {
          updateAuthState()
        } else {
          setTimeout(checkAuth, 100)
        }
      }
      checkAuth()
    }

    return () => {
      keycloak.onAuthSuccess = undefined
      keycloak.onAuthError = undefined
      keycloak.onAuthLogout = undefined
    }
  }, [])

  return {
    isAuthenticated,
    isLoading,
    user,
  }
}
