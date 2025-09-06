const express = require('express');
const User = require('../models/User');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

// Rate limiting for login attempts
const loginAttempts = new Map();
const MAX_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

const checkRateLimit = (identifier) => {
  const now = Date.now();
  const attempts = loginAttempts.get(identifier);
  
  if (!attempts) {
    loginAttempts.set(identifier, { count: 1, timestamp: now });
    return true;
  }
  
  if (attempts.count >= MAX_ATTEMPTS && now - attempts.timestamp < LOCKOUT_TIME) {
    return false;
  }
  
  if (now - attempts.timestamp >= LOCKOUT_TIME) {
    loginAttempts.set(identifier, { count: 1, timestamp: now });
    return true;
  }
  
  attempts.count++;
  attempts.timestamp = now;
  return attempts.count <= MAX_ATTEMPTS;
};

// Register new user
router.post('/register', async (req, res) => {
  try {
    const { email, username, password, firstName, lastName, phone } = req.body;

    // Validate required fields
    if (!email || !username || !password || !firstName || !lastName) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Email, username, password, first name, and last name are required'
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.status(409).json({
        error: 'User already exists',
        message: existingUser.email === email 
          ? 'This email is already registered' 
          : 'Username is already taken'
      });
    }

    // Create new user
    const user = new User({
      email,
      username,
      password,
      firstName,
      lastName,
      phone,
      isVerified: true // Auto-verify for demo purposes
    });

    await user.save();

    res.status(201).json({
      message: 'User registered successfully',
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: 'Registration failed',
      message: error.message || 'Internal server error'
    });
  }
});

// Login user
router.post('/login', async (req, res) => {
  try {
    const { identifier, password, rememberMe = false } = req.body;

    // Validate input
    if (!identifier || !password) {
      return res.status(400).json({
        error: 'Missing credentials',
        message: 'Email/username and password are required'
      });
    }

    // Check rate limiting
    if (!checkRateLimit(identifier)) {
      return res.status(429).json({
        error: 'Too many attempts',
        message: 'Too many failed login attempts. Please try again in 15 minutes.'
      });
    }

    // Find user by email or username
    const user = await User.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { username: identifier }
      ]
    });

    if (!user) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Invalid email/username or password'
      });
    }

    // Check password
    const isValidPassword = await user.comparePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({
        error: 'Invalid credentials',
        message: 'Invalid email/username or password'
      });
    }

    // Clear expired sessions and add new session
    await user.cleanExpiredSessions();
    await user.addSession(req.sessionID);

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Set session
    req.session.userId = user._id;
    req.session.rememberMe = rememberMe;

    // Set session expiry based on remember me
    if (rememberMe) {
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    } else {
      req.session.cookie.maxAge = 24 * 60 * 60 * 1000; // 1 day
    }

    // Clear rate limit on successful login
    loginAttempts.delete(identifier);

    res.json({
      message: 'Login successful',
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: 'Internal server error'
    });
  }
});

// Logout user
router.post('/logout', requireAuth, async (req, res) => {
  try {
    // Remove session from user's sessions array
    const user = await User.findById(req.user.id);
    if (user) {
      await user.removeSession(req.sessionID);
    }

    // Destroy session
    req.session.destroy((err) => {
      if (err) {
        console.error('Session destruction error:', err);
        return res.status(500).json({
          error: 'Logout failed',
          message: 'Failed to destroy session'
        });
      }

      res.clearCookie('connect.sid'); // Clear session cookie
      res.json({ message: 'Logout successful' });
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      error: 'Logout failed',
      message: 'Internal server error'
    });
  }
});

// Get current user profile
router.get('/profile', requireAuth, (req, res) => {
  res.json({
    user: req.user
  });
});

// Check session status
router.get('/session', (req, res) => {
  res.json({
    authenticated: !!req.session?.userId,
    sessionId: req.sessionID,
    userId: req.session?.userId || null
  });
});

module.exports = router;