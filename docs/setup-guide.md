# SULABH Session Management Setup Guide

## Quick Start

### 1. Install Dependencies
All required dependencies are already included in `package.json`:
```bash
npm install
```

### 2. Configure Environment (Optional)
Create a `.env` file for production settings:
```bash
SESSION_SECRET=your-very-secure-session-secret-here
MONGO_URL=mongodb://localhost:27017/team48db
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

### 3. Start MongoDB (for production)
```bash
# Using Docker
docker run -d -p 27017:27017 --name mongodb mongo:latest

# Or install MongoDB locally
# https://www.mongodb.com/docs/manual/installation/
```

### 4. Start the Backend Server
```bash
node server.js
```

### 5. Start the Frontend (in another terminal)
```bash
npm run dev
```

## Testing Session Management

### Test Backend Only
```bash
node test-session.js
```

### Test Full Integration
1. Start both backend and frontend
2. Open the application in browser
3. Try registering a new account
4. Try logging in/out
5. Check browser developer tools for session cookies

## Authentication Flow

The system automatically detects the best authentication method:

1. **Supabase Available** → Uses Supabase authentication
2. **Session Backend Available** → Uses session-based authentication  
3. **Neither Available** → Falls back to demo mode

## Features

✅ **Session Management**: Express sessions with MongoDB store  
✅ **Cookie Security**: HTTP-only, secure cookies  
✅ **Rate Limiting**: Protection against brute force attacks  
✅ **Password Security**: Bcrypt hashing  
✅ **Automatic Fallback**: Graceful degradation  
✅ **Cross-tab Sync**: Session state shared across tabs  
✅ **Remember Me**: Persistent login option  

## API Endpoints

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/profile` - Get user profile
- `GET /api/auth/session` - Check session status
- `GET /api/health` - Server health check

## Security Features

- **Rate Limiting**: 5 failed attempts = 15 minute lockout
- **Password Hashing**: Bcrypt with 12 salt rounds
- **Session Security**: Secure, HTTP-only cookies
- **CSRF Protection**: SameSite cookie attribute
- **Session Tracking**: Monitor active sessions per user

## Production Notes

- Set `SESSION_SECRET` to a strong, random value
- Use HTTPS in production for secure cookies
- Consider Redis for session store in multi-server setups
- Configure CORS for your frontend domain
- Set up MongoDB with proper authentication

## Troubleshooting

### "MongoDB connection error"
- Ensure MongoDB is running
- Check MONGO_URL environment variable
- Verify network connectivity

### "Session not available"
- Check if backend server is running on port 3001
- Verify CORS configuration
- Check browser network tab for blocked requests

### "Authentication failed"
- Verify username/password
- Check for rate limiting (wait 15 minutes)
- Ensure user is registered

For more details, see `docs/session-management.md`