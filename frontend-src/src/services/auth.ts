/**
 * Authentication Service
 * Handles Warden authentication with username/password
 */

export interface User {
  id: number
  accountCode: string
  username: string
  email?: string
  isAdmin: boolean
  playfabId?: string
  pathcompanionUsername?: string
  pathCompanionConnectedAt?: string
  discordUserId?: string
}

const API_URL = import.meta.env.VITE_API_URL || ''

class AuthService {
  private user: User | null = null

  /**
   * Login with username and password
   */
  async login(username: string, password: string): Promise<User> {
    const response = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include', // Important for session cookies
      body: JSON.stringify({ username, password }),
    })

    if (!response.ok) {
      // Try to parse as JSON first, fall back to text
      let errorMessage = 'Login failed'
      const contentType = response.headers.get('content-type')
      
      try {
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json()
          errorMessage = error.error || errorMessage
        } else {
          // Plain text error (e.g., rate limiting)
          errorMessage = await response.text()
        }
      } catch {
        // If parsing fails, use the default message
      }
      
      throw new Error(errorMessage)
    }

    const data = await response.json()
    this.user = data.user
    if (!this.user) {
      throw new Error('No user returned from login')
    }
    return this.user
  }

  /**
   * Register a new user
   */
  async register(username: string, password: string, email?: string): Promise<User> {
    const response = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ username, password, email }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || 'Registration failed')
    }

    const data = await response.json()
    this.user = data.user
    if (!this.user) {
      throw new Error('No user returned from registration')
    }
    return this.user
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    await fetch(`${API_URL}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    })
    this.user = null
  }

  /**
   * Get current user from session
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const response = await fetch(`${API_URL}/api/auth/me`, {
        credentials: 'include',
      })

      if (!response.ok) {
        this.user = null
        return null
      }

      const data = await response.json()
      this.user = data.user // Extract user from response wrapper
      return this.user
    } catch {
      this.user = null
      return null
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.user !== null
  }

  /**
   * Get the current user
   */
  getUser(): User | null {
    return this.user
  }

  /**
   * Get access token - returns null since Warden uses session cookies
   * @deprecated Warden uses session-based auth, not tokens
   */
  getToken(): string | null {
    return null
  }

  /**
   * Get access token - returns null since Warden uses session cookies
   * @deprecated Warden uses session-based auth, not tokens
   */
  getAccessToken(): string | null {
    return null
  }
}

export const authService = new AuthService()

