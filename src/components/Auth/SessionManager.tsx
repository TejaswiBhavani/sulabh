import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'

// Session timeout in milliseconds (30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000

const SessionManager: React.FC = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  
  useEffect(() => {
    if (!user) return
    
    let inactivityTimer: ReturnType<typeof setTimeout>
    let warningTimer: ReturnType<typeof setTimeout>
    
    const resetTimer = () => {
      clearTimeout(inactivityTimer)
      clearTimeout(warningTimer)
      
      // Set warning timer to show 1 minute before session expiry
      warningTimer = setTimeout(() => {
        toast.error('Your session is about to expire due to inactivity. Please save your work.', {
          duration: 10000, // 10 seconds
          id: 'session-warning'
        })
      }, SESSION_TIMEOUT - 60000)
      
      // Set inactivity timer
      inactivityTimer = setTimeout(async () => {
        toast.error('Your session has expired due to inactivity.', {
          id: 'session-expired'
        })
        await logout()
        navigate('/login', { state: { message: 'Your session has expired due to inactivity.' } })
      }, SESSION_TIMEOUT)
    }
    
    // Reset timer on user activity
    const activityEvents = ['mousedown', 'keypress', 'scroll', 'touchstart']
    
    const handleUserActivity = () => {
      resetTimer()
    }
    
    // Initialize timer
    resetTimer()
    
    // Add event listeners
    activityEvents.forEach(event => {
      window.addEventListener(event, handleUserActivity)
    })
    
    // Clean up
    return () => {
      clearTimeout(inactivityTimer)
      clearTimeout(warningTimer)
      activityEvents.forEach(event => {
        window.removeEventListener(event, handleUserActivity)
      })
    }
  }, [user, logout, navigate])
  
  // Listen for auth state changes from other tabs
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'supabase.auth.token' && event.newValue === null) {
        // User logged out in another tab
        window.location.reload()
      }
    }
    
    window.addEventListener('storage', handleStorageChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])
  
  return null
}

export default SessionManager