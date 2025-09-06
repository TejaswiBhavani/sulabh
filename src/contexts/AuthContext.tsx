import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { User as SupabaseUser, Session } from '@supabase/supabase-js'
import { supabase, getCurrentUserProfile, isSupabaseConfigured } from '../lib/supabase'
import { sessionAuthService } from '../lib/sessionAuth'
import { User, AuthContextType, RegisterData } from '../types'
import toast from 'react-hot-toast'

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        if (isSupabaseConfigured) {
          // Only attempt to get session if Supabase is configured
          const { data: { session } } = await supabase.auth.getSession()
          setSession(session)
          
          if (session?.user) {
            await loadUserProfile(session.user)
          } else {
            setUser(null)
          }
        } else {
          // Check for session-based authentication
          const sessionAvailable = await sessionAuthService.isAvailable()
          if (sessionAvailable) {
            try {
              const sessionStatus = await sessionAuthService.checkSession()
              if (sessionStatus.authenticated) {
                const profile = await sessionAuthService.getProfile()
                setUser(profile.user)
                console.log('Session-based authentication active')
                return
              }
            } catch (error) {
              console.log('No active session-based authentication')
            }
          }

          // Fallback to demo session
          const demoSession = localStorage.getItem('demo_session')
          if (demoSession) {
            const session = JSON.parse(demoSession)
            if (session.expires_at > Date.now()) {
              setUser(session.user)
            } else {
              localStorage.removeItem('demo_session')
              localStorage.removeItem('demo_user')
            }
          }
          setSession(null)
        }
      } catch (error) {
        console.error('Error getting initial session:', error)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession()

    // Only set up auth state listener if Supabase is configured
    let subscription: any = null
    if (isSupabaseConfigured) {
      // Listen for auth changes
      const { data: { subscription: authSubscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        setSession(session)
        
        if (event === 'SIGNED_IN' && session?.user) {
          await loadUserProfile(session.user)
        } else if (event === 'SIGNED_OUT') {
          setUser(null)
        } else if (event === 'USER_UPDATED' && session?.user) {
          await loadUserProfile(session.user)
        }
        // According to the TS error (TS2367), 'USER_DELETED' is not a recognized AuthChangeEvent here.
        // Handling for user deletion, if necessary via auth events, would require the event type to support it.
        // For now, SIGNED_OUT should cover the user becoming null.
      })
      subscription = authSubscription
    }

    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, [])

  const loadUserProfile = async (supabaseUser: SupabaseUser) => {
    try {
      const profile = await getCurrentUserProfile()
      
      if (profile) {
        setUser({
          id: profile.id,
          email: profile.email,
          username: profile.username || '',
          firstName: profile.first_name,
          lastName: profile.last_name,
          phone: profile.phone || undefined,
          role: profile.role,
          department: profile.department || undefined,
          isVerified: profile.is_verified || false,
          createdAt: new Date(profile.created_at),
          updatedAt: new Date(profile.updated_at)
        })
      } else {
        // If profile doesn't exist yet (e.g., during signup), create minimal user object
        setUser({
          id: supabaseUser.id,
          email: supabaseUser.email || '',
          username: '',
          firstName: supabaseUser.user_metadata.first_name || '',
          lastName: supabaseUser.user_metadata.last_name || '',
          role: 'citizen',
          createdAt: new Date(),
          updatedAt: new Date()
        })
      }
    } catch (error) {
      console.error('Error loading user profile:', error)
      setUser(null)
    }
  }

  const login = async (identifier: string, password: string, rememberMe: boolean = false): Promise<void> => {
    setLoading(true)
    try {
      // Check if Supabase is properly configured
      if (!isSupabaseConfigured) {
        // Try session-based authentication first
        const sessionAvailable = await sessionAuthService.isAvailable()
        if (sessionAvailable) {
          try {
            const response = await sessionAuthService.login({ identifier, password, rememberMe })
            setUser(response.user)
            toast.success('Login successful!')
            return
          } catch (error: any) {
            // If session auth fails, fall back to demo mode
            console.log('Session authentication failed, trying demo mode:', error.message)
          }
        }

        // Fallback to demo mode
        const demoUser = localStorage.getItem('demo_user')
        if (demoUser && (identifier === JSON.parse(demoUser).email || identifier === JSON.parse(demoUser).username)) {
          const user = JSON.parse(demoUser)
          setUser(user)
          localStorage.setItem('demo_session', JSON.stringify({ user, expires_at: Date.now() + 24 * 60 * 60 * 1000 }))
          toast.success('Demo login successful! (Connect to Supabase for full functionality)')
          return
        } else {
          throw new Error('Login failed. Please check your credentials or connect to Supabase.')
        }
      }
      
      // Determine if the identifier is an email or username
      const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(identifier)
      
      let authResponse
      
      if (isEmail) {
        // Login with email
        authResponse = await supabase.auth.signInWithPassword({
          email: identifier,
          password
        })
      } else {
        // Login with username - first get the email associated with the username
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('email')
          .eq('username', identifier)
        
        // Check if profile data exists and has at least one record
        if (profileError || !profileData || profileData.length === 0) {
          throw new Error('Invalid username or password')
        }
        
        // Then login with the email
        authResponse = await supabase.auth.signInWithPassword({
          email: profileData[0].email,
          password
        })
      }
      
      const { error: signInError } = authResponse
      
      if (signInError) {
        if (signInError.message.includes('Email not confirmed')) {
          throw new Error('Please verify your email address before logging in.')
        }
        throw signInError
      }
      
      // Set session persistence based on "Remember me" option
      if (!rememberMe) {
        // If "Remember me" is not checked, set session expiry to 1 day
        await supabase.auth.updateUser({
          data: { session_expiry: '1d' }
        })
      }
      
      toast.success('Logged in successfully!')
    } catch (error: any) {
      console.error('Login error:', error)
      throw new Error(error.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  const register = async (userData: RegisterData): Promise<void> => {
    setLoading(true)
    try {
      // Check if Supabase is properly configured
      if (!isSupabaseConfigured) {
        // Try session-based registration first
        const sessionAvailable = await sessionAuthService.isAvailable()
        if (sessionAvailable) {
          try {
            await sessionAuthService.register(userData)
            // Don't set user immediately for registration, let them login
            toast.success('Account created successfully! Please log in.')
            return
          } catch (error: any) {
            console.log('Session registration failed, trying demo mode:', error.message)
          }
        }

        // Fallback to demo mode
        console.log('Demo mode: Simulating user registration for:', userData.email)
        
        // Create a mock user for demo purposes
        const mockUser: User = {
          id: `demo-${Date.now()}`,
          email: userData.email,
          username: userData.username,
          firstName: userData.firstName,
          lastName: userData.lastName,
          phone: userData.phone,
          role: 'citizen',
          isVerified: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
        
        // Store in localStorage for demo persistence
        localStorage.setItem('demo_user', JSON.stringify(mockUser))
        localStorage.setItem('demo_session', JSON.stringify({ user: mockUser, expires_at: Date.now() + 24 * 60 * 60 * 1000 }))
        
        setUser(mockUser)
        toast.success('Demo account created successfully! (Connect to Supabase for full functionality)')
        return
      }
      
      // Check if username already exists
      const { data: existingUsers, error: usernameCheckError } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', userData.username)
        .limit(1)

      if (usernameCheckError) {
        // If it's an RLS error, we can't check existing usernames before signup
        // This is expected behavior when RLS is properly configured
        console.log('Username check error (expected with RLS):', usernameCheckError.message)
        // Continue with signup - the profile creation will handle username uniqueness via constraints
      } else if (existingUsers && existingUsers.length > 0) {
        throw new Error('Username is already taken. Please choose another one.')
      }

      // Sign up with Supabase Auth
      const { data, error } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
        options: {
          data: {
            first_name: userData.firstName,
            last_name: userData.lastName,
            username: userData.username,
            phone: userData.phone || null
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      })

      if (error) {
        // Enhanced error handling for user already exists scenarios
        const errorMessage = error.message?.toLowerCase() || ''
        const errorCode = (error as any).code || ''
        
        // Check for various forms of "user already exists" errors
        if (errorCode === 'user_already_exists' || 
            errorMessage.includes('user already registered') || 
            errorMessage.includes('user already exists') ||
            errorMessage.includes('already registered') ||
            errorMessage.includes('email address is already registered')) {
          throw new Error('This email is already registered. Please log in or use a different email.')
        }
        
        throw error
      }

      if (data.user) {
        // Create profile with user information
        const { error: profileError } = await supabase
          .from('profiles')
          .insert({
            id: data.user.id,
            email: userData.email,
            username: userData.username,
            first_name: userData.firstName,
            last_name: userData.lastName,
            phone: userData.phone || null,
            role: 'citizen'
          })

        if (profileError) throw profileError

        toast.success('Account created successfully! Please check your email to verify your account.')
      }
    } catch (error: any) {
      // Re-throw the specific error message if it's our custom one
      if (error.message?.includes('Username is already taken') || 
          error.message?.includes('This email is already registered')) {
        throw error
      }
      
      // Handle any other registration errors with a user-friendly message
      const errorMessage = error.message || 'Registration failed'
      throw new Error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const logout = async () => {
    try {
      if (isSupabaseConfigured) {
        await supabase.auth.signOut()
      } else {
        // Try session-based logout first
        const sessionAvailable = await sessionAuthService.isAvailable()
        if (sessionAvailable) {
          try {
            await sessionAuthService.logout()
          } catch (error) {
            console.log('Session logout failed, clearing local state')
          }
        }
        
        // Clear demo session
        localStorage.removeItem('demo_session')
        localStorage.removeItem('demo_user')
      }
      setUser(null)
      toast.success('Logged out successfully')
    } catch (error) {
      console.error('Error logging out:', error)
      toast.error('Failed to log out')
    }
  }

  const resetPassword = async (email: string): Promise<void> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`
      })
      
      if (error) throw error
      
      toast.success('Password reset email sent!')
    } catch (error: any) {
      console.error('Password reset error:', error)
      throw new Error(error.message || 'Failed to send password reset email')
    }
  }

  const updatePassword = async (password: string): Promise<void> => {
    try {
      const { error } = await supabase.auth.updateUser({ password })
      
      if (error) throw error
      
      toast.success('Password updated successfully!')
    } catch (error: any) {
      console.error('Update password error:', error)
      throw new Error(error.message || 'Failed to update password')
    }
  }

  const value: AuthContextType = {
    user,
    session,
    login,
    register,
    logout,
    resetPassword,
    updatePassword,
    loading
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}