import { sessionAuthService } from '../lib/sessionAuth'

// Test session authentication endpoints
export const testSessionAuth = async () => {
  const testResults = {
    healthCheck: false,
    registration: false,
    login: false,
    profile: false,
    logout: false
  }

  try {
    // Test 1: Check if session auth is available
    console.log('Testing session authentication availability...')
    testResults.healthCheck = await sessionAuthService.isAvailable()
    console.log('Session auth available:', testResults.healthCheck)

    if (!testResults.healthCheck) {
      console.log('Session authentication not available, skipping tests')
      return testResults
    }

    // Test 2: Test registration
    console.log('Testing registration...')
    try {
      await sessionAuthService.register({
        email: 'test@example.com',
        username: 'testuser',
        password: 'testpassword123',
        firstName: 'Test',
        lastName: 'User'
      })
      testResults.registration = true
      console.log('Registration: SUCCESS')
    } catch (error: any) {
      // Registration might fail if user exists, that's okay
      console.log('Registration:', error.message)
      testResults.registration = error.message.includes('already') || error.message.includes('exists')
    }

    // Test 3: Test login
    console.log('Testing login...')
    try {
      await sessionAuthService.login({
        identifier: 'test@example.com',
        password: 'testpassword123'
      })
      testResults.login = true
      console.log('Login: SUCCESS')
    } catch (error: any) {
      console.log('Login failed:', error.message)
    }

    // Test 4: Test profile access (only if login succeeded)
    if (testResults.login) {
      console.log('Testing profile access...')
      try {
        await sessionAuthService.getProfile()
        testResults.profile = true
        console.log('Profile access: SUCCESS')
      } catch (error: any) {
        console.log('Profile access failed:', error.message)
      }

      // Test 5: Test logout
      console.log('Testing logout...')
      try {
        await sessionAuthService.logout()
        testResults.logout = true
        console.log('Logout: SUCCESS')
      } catch (error: any) {
        console.log('Logout failed:', error.message)
      }
    }

    return testResults
  } catch (error) {
    console.error('Test suite error:', error)
    return testResults
  }
}