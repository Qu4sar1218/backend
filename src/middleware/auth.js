const { User, Role } = require('../sequelize/models');
const { verifyToken, blacklistToken } = require('../utils/jwt');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ 
        message: 'Access token required',
        code: 'NO_TOKEN'
      });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(403).json({ 
        message: 'Invalid or expired token',
        code: 'INVALID_TOKEN'
      });
    }

    const user = await User.findByPk(decoded.id, {
      include: [{
        model: Role,
        as: 'role',
        attributes: ['id', 'name']
      }]
    });
    if (!user || !user.active) {
      return res.status(403).json({ 
        message: 'User not found or inactive',
        code: 'USER_INACTIVE'
      });
    }

    // Check if stored token matches (prevents token reuse after logout)
    if (user.token !== token) {
      return res.status(403).json({ 
        message: 'Token has been invalidated',
        code: 'TOKEN_INVALIDATED'
      });
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      return res.status(403).json({ 
        message: 'Account is temporarily locked',
        code: 'ACCOUNT_LOCKED'
      });
    }

    // Add security headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');

    req.user = user;
    req.token = token;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ 
      message: 'Error authenticating user',
      code: 'AUTH_ERROR'
    });
  }
};

const authorizeRole = (allowedRoleNames) => {
  const allowedNormalized = allowedRoleNames.map((n) => String(n).toLowerCase());

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        message: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    const roleName = req.user.role?.name;
    if (!roleName) {
      return res.status(403).json({ 
        message: 'User has no assigned role',
        code: 'ROLE_NOT_FOUND',
        required: allowedRoleNames,
        current: null
      });
    }

    if (!allowedNormalized.includes(roleName.toLowerCase())) {
      return res.status(403).json({ 
        message: 'Insufficient permissions',
        code: 'INSUFFICIENT_PERMISSIONS',
        required: allowedRoleNames,
        current: roleName
      });
    }
    next();
  };
};

const authorizePermission = (requiredModule, requiredAction) => {
  return async (req, res, next) => {
    try {
      if (!req.user) {
        return res.status(401).json({ 
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      // Load user with role and permissions if not already loaded
      if (!req.user.role || !req.user.role.AccessRights) {
        const userWithPermissions = await User.findByPk(req.user.id, {
          include: [{
            model: require('../sequelize/models').Role,
            as: 'role',
            include: [{
              model: require('../sequelize/models').AccessRight,
              include: [{
                model: require('../sequelize/models').Action,
                include: [{
                  model: require('../sequelize/models').Module
                }]
              }]
            }]
          }]
        });

        if (!userWithPermissions) {
          return res.status(403).json({ 
            message: 'User permissions not found',
            code: 'PERMISSIONS_NOT_FOUND'
          });
        }

        req.user = userWithPermissions;
      }

      // Check if user has the required permission
      const hasPermission = req.user.role.AccessRights.some(accessRight => 
        accessRight.Action.Module.name === requiredModule && 
        accessRight.Action.name === requiredAction
      );

      if (!hasPermission) {
        return res.status(403).json({ 
          message: `Permission denied: ${requiredAction} on ${requiredModule}`,
          code: 'PERMISSION_DENIED',
          required: { module: requiredModule, action: requiredAction }
        });
      }

      next();
    } catch (error) {
      console.error('Authorization error:', error);
      return res.status(500).json({ 
        message: 'Error checking permissions',
        code: 'PERMISSION_CHECK_ERROR'
      });
    }
  };
};

// Middleware to blacklist token on logout
const blacklistTokenMiddleware = (req, res, next) => {
  if (req.token) {
    blacklistToken(req.token);
  }
  next();
};

module.exports = { 
  authenticateToken, 
  authorizeRole, 
  authorizePermission,
  blacklistTokenMiddleware
}; 