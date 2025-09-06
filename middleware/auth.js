const User = require('../models/User');

// Middleware to check if user is authenticated via session
const requireAuth = async (req, res, next) => {
  try {
    // Check if session exists and has user ID
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please log in to access this resource'
      });
    }

    // Find user and validate session
    const user = await User.findById(req.session.userId);
    if (!user) {
      // Clear invalid session
      req.session.destroy();
      return res.status(401).json({ 
        error: 'Invalid session',
        message: 'User not found, please log in again'
      });
    }

    // Check if session ID exists in user's active sessions
    const sessionExists = user.sessions.some(
      session => session.sessionId === req.sessionID && session.expiresAt > new Date()
    );

    if (!sessionExists) {
      // Clear invalid session
      req.session.destroy();
      return res.status(401).json({ 
        error: 'Session expired',
        message: 'Your session has expired, please log in again'
      });
    }

    // Attach user to request object (excluding password)
    req.user = {
      id: user._id,
      email: user.email,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      role: user.role,
      isVerified: user.isVerified,
      lastLogin: user.lastLogin
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ 
      error: 'Authentication error',
      message: 'Internal server error during authentication'
    });
  }
};

// Middleware to check if user has specific role
const requireRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please log in to access this resource'
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        message: `Access denied. Required role: ${roles.join(' or ')}`
      });
    }

    next();
  };
};

// Optional auth middleware - doesn't fail if no auth
const optionalAuth = async (req, res, next) => {
  try {
    if (req.session && req.session.userId) {
      const user = await User.findById(req.session.userId);
      if (user) {
        req.user = {
          id: user._id,
          email: user.email,
          username: user.username,
          firstName: user.firstName,
          lastName: user.lastName,
          phone: user.phone,
          role: user.role,
          isVerified: user.isVerified,
          lastLogin: user.lastLogin
        };
      }
    }
    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    // Continue without setting user
    next();
  }
};

module.exports = {
  requireAuth,
  requireRole,
  optionalAuth
};