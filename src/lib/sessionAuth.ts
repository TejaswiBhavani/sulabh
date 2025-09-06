import { User } from '../types'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

export interface LoginData {
  identifier: string
  password: string
  rememberMe?: boolean
}

export interface RegisterData {
  email: string
  username: string
  password: string
  firstName: string
  lastName: string
  phone?: string
}

export interface AuthResponse {
  message: string
  user: User
}

export interface SessionResponse {
  authenticated: boolean
  sessionId: string
  userId: string | null
}

class SessionAuthService {
  private baseURL: string

  constructor() {
    this.baseURL = API_BASE_URL
  }

  // Configure fetch with credentials for session cookies
  private async fetchWithCredentials(url: string, options: RequestInit = {}) {
    const response = await fetch(`${this.baseURL}${url}`, {
      ...options,
      credentials: 'include', // Include cookies
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
    }

    return response.json()
  }

  // Register new user
  async register(userData: RegisterData): Promise<AuthResponse> {
    return this.fetchWithCredentials('/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData),
    })
  }

  // Login user
  async login(loginData: LoginData): Promise<AuthResponse> {
    return this.fetchWithCredentials('/auth/login', {
      method: 'POST',
      body: JSON.stringify(loginData),
    })
  }

  // Logout user
  async logout(): Promise<{ message: string }> {
    return this.fetchWithCredentials('/auth/logout', {
      method: 'POST',
    })
  }

  // Get current user profile
  async getProfile(): Promise<{ user: User }> {
    return this.fetchWithCredentials('/auth/profile')
  }

  // Check session status
  async checkSession(): Promise<SessionResponse> {
    return this.fetchWithCredentials('/auth/session')
  }

  // Check if session-based auth is available
  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/health`, {
        credentials: 'include'
      })
      if (!response.ok) return false
      
      const data = await response.json()
      return data.session?.configured === true
    } catch {
      return false
    }
  }
}

export const sessionAuthService = new SessionAuthService()