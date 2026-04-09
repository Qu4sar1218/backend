const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'your-refresh-secret-key';
const ACCESS_TOKEN_EXPIRY = process.env.ACCESS_TOKEN_EXPIRY || '15m'; // Short-lived access token
const REFRESH_TOKEN_EXPIRY = process.env.REFRESH_TOKEN_EXPIRY || '7d'; // Long-lived refresh token

// In-memory blacklist (in production, use Redis or database)
const tokenBlacklist = new Set();

const generateTokens = (user) => {
  const payload = {
    id: user.id,
    username: user.username,
    roleId: user.roleId,
    schoolId: user.schoolId,
    iat: Math.floor(Date.now() / 1000)
  };
  
  const accessToken = jwt.sign(payload, JWT_SECRET, { 
    expiresIn: ACCESS_TOKEN_EXPIRY,
    issuer: 'ac-backend-api',
    audience: 'ac-frontend'
  });

  const refreshToken = jwt.sign(
    { id: user.id, tokenVersion: user.tokenVersion || 0 }, 
    JWT_REFRESH_SECRET, 
    { 
      expiresIn: REFRESH_TOKEN_EXPIRY,
      issuer: 'ac-backend-api',
      audience: 'ac-frontend'
    }
  );
  
  return { accessToken, refreshToken };
};

// Backward compatibility - keep the old method name
const generateToken = (user) => {
  const { accessToken } = generateTokens(user);
  return accessToken;
};

const verifyToken = (token, isRefreshToken = false) => {
  try {
    // Check if token is blacklisted
    if (tokenBlacklist.has(token)) {
      return null;
    }

    const secret = isRefreshToken ? JWT_REFRESH_SECRET : JWT_SECRET;
    return jwt.verify(token, secret, {
      issuer: 'ac-backend-api',
      audience: 'ac-frontend'
    });
  } catch (error) {
    console.error('Token verification error:', error.message);
    return null;
  }
};

const blacklistToken = (token) => {
  tokenBlacklist.add(token);
  
  // Clean up expired tokens from blacklist periodically
  setTimeout(() => {
    try {
      const decoded = jwt.decode(token);
      if (decoded && decoded.exp && decoded.exp * 1000 < Date.now()) {
        tokenBlacklist.delete(token);
      }
    } catch (error) {
      // Token is malformed, safe to remove
      tokenBlacklist.delete(token);
    }
  }, 60000); // Check after 1 minute
};

const getTokenInfo = (token) => {
  try {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded) return null;
    
    return {
      header: decoded.header,
      payload: decoded.payload,
      isExpired: decoded.payload.exp * 1000 < Date.now(),
      expiresAt: new Date(decoded.payload.exp * 1000),
      issuedAt: new Date(decoded.payload.iat * 1000)
    };
  } catch (error) {
    return null;
  }
};

const isTokenExpiringSoon = (token, minutesThreshold = 5) => {
  try {
    const decoded = jwt.decode(token);
    if (!decoded || !decoded.exp) return true;
    
    const expiryTime = decoded.exp * 1000;
    const thresholdTime = Date.now() + (minutesThreshold * 60 * 1000);
    
    return expiryTime <= thresholdTime;
  } catch (error) {
    return true;
  }
};

module.exports = { 
  generateToken, 
  generateTokens,
  verifyToken, 
  blacklistToken,
  getTokenInfo,
  isTokenExpiringSoon,
  ACCESS_TOKEN_EXPIRY,
  REFRESH_TOKEN_EXPIRY
}; 