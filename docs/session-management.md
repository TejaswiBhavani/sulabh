# Session and Cookie Management Implementation

## Overview

This implementation adds comprehensive session and cookie management to the SULABH Grievance System, providing an alternative authentication method alongside Supabase authentication.

## Features

### Backend Features
- **Express Session Management**: Using `express-session` with MongoDB store
- **Secure Cookie Configuration**: HTTP-only, secure cookies with CSRF protection
- **Session Persistence**: Sessions stored in MongoDB with configurable expiration
- **Rate Limiting**: Protection against brute force login attempts
- **Password Security**: Bcrypt hashing with salt rounds
- **Session Tracking**: Track active sessions per user with cleanup

### Frontend Features
- **Automatic Fallback**: Seamlessly falls back from Supabase to session-based auth
- **Session Detection**: Automatically detects available authentication methods
- **Persistent Sessions**: Support for "Remember Me" functionality
- **Cross-tab Synchronization**: Session state shared across browser tabs

## Architecture

### Backend Structure
```
├── models/
│   └── User.js              # User model with session tracking
├── middleware/
│   └── auth.js              # Authentication middleware
├── routes/
│   └── auth.js              # Authentication endpoints
└── server.js                # Express server with session config
```

### Frontend Structure
```
├── src/lib/
│   └── sessionAuth.ts       # Session authentication service
├── src/contexts/
│   └── AuthContext.tsx      # Updated auth context with session support
└── src/test/
    └── sessionAuth.test.ts  # Session authentication tests
```

## Configuration

### Environment Variables
```bash
# Required for production
SESSION_SECRET=your-secure-session-secret
MONGO_URL=mongodb://localhost:27017/team48db
FRONTEND_URL=http://localhost:5173
NODE_ENV=production
```

### Session Configuration
- **Default Session Duration**: 24 hours
- **Remember Me Duration**: 30 days
- **Cookie Security**: 
  - `httpOnly: true` (prevents XSS)
  - `secure: true` in production (HTTPS only)
  - `sameSite: 'lax'` (CSRF protection)
- **Session Store**: MongoDB with automatic cleanup

## API Endpoints

### Authentication Routes (`/api/auth/`)

#### POST `/register`
Register a new user account.
```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "securepassword",
  "firstName": "First",
  "lastName": "Last",
  "phone": "1234567890"
}
```

#### POST `/login`
Login with email/username and password.
```json
{
  "identifier": "user@example.com",
  "password": "securepassword",
  "rememberMe": false
}
```

#### POST `/logout`
Logout and destroy session (requires authentication).

#### GET `/profile`
Get current user profile (requires authentication).

#### GET `/session`
Check current session status.

### Health Check
#### GET `/api/health`
Returns server status including session configuration.

## Security Features

### Rate Limiting
- **Max Attempts**: 5 failed login attempts
- **Lockout Duration**: 15 minutes
- **Per IP/Email**: Individual limits per identifier

### Password Security
- **Hashing**: Bcrypt with 12 salt rounds
- **Validation**: Minimum 6 characters (configurable)
- **Storage**: Never stored in plain text

### Session Security
- **Session ID**: Cryptographically secure random IDs
- **Rotation**: New session ID on login
- **Cleanup**: Automatic expired session removal
- **Tracking**: Active session monitoring per user

### Cookie Security
- **HTTP-Only**: Prevents client-side access
- **Secure**: HTTPS-only in production
- **SameSite**: CSRF protection
- **Custom Name**: `sulabh.sid` (security through obscurity)

## Frontend Integration

### AuthContext Updates
The AuthContext automatically detects and uses session-based authentication when Supabase is not configured:

```typescript
// Automatic fallback priority:
1. Supabase authentication (if configured)
2. Session-based authentication (if available)
3. Demo mode (localStorage fallback)
```

### Session Service Usage
```typescript
import { sessionAuthService } from '../lib/sessionAuth'

// Check availability
const available = await sessionAuthService.isAvailable()

// Login
const result = await sessionAuthService.login({
  identifier: 'user@example.com',
  password: 'password',
  rememberMe: true
})

// Get profile
const profile = await sessionAuthService.getProfile()

// Logout
await sessionAuthService.logout()
```

## Testing

Run the session authentication test:
```bash
node test-session.js
```

This tests:
- Server startup with session configuration
- Health endpoint with session info
- User registration
- User login
- Session status checking

## Production Deployment

### Requirements
- MongoDB instance for session storage
- HTTPS certificate for secure cookies
- Environment variables configured
- Redis (optional, for scalable session store)

### Recommended Setup
1. Use Redis for session store in multi-server deployments
2. Configure session secret as environment variable
3. Enable HTTPS for secure cookies
4. Set up MongoDB indexes for session cleanup
5. Configure CORS for frontend domain

### MongoDB Session Store
Sessions are automatically stored in the `sessions` collection with TTL (time-to-live) indexing for automatic cleanup.

## Benefits

1. **Independence**: Reduces dependency on external services
2. **Performance**: Local session validation is faster than API calls
3. **Reliability**: Works even if external auth services are down
4. **Security**: Industry-standard session management practices
5. **Scalability**: Can be scaled with Redis session store
6. **Compliance**: Easier to meet data residency requirements

## Migration Notes

This implementation is designed to work alongside existing Supabase authentication without breaking changes. Users can continue using Supabase auth while new users can use session-based auth if preferred.

The system automatically detects the best available authentication method and falls back gracefully, ensuring a seamless user experience regardless of the backend configuration.