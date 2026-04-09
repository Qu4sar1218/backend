const { User, Role, School } = require('../sequelize/models');
const { generateToken, generateTokens, verifyToken } = require('../utils/jwt');
const bcrypt = require('bcryptjs');

// Security configurations
const SALT_ROUNDS = 12;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

class AuthService {
  async login(username, password) {
    const user = await User.findOne({
      where: { username, active: true },
      include: [
        {
          model: Role,
          as: 'role'
        },
        {
          model: School,
          as: 'school',
          attributes: ['id', 'name', 'schoolCode', 'address', 'contactNo1', 'email']
        }
      ]
    });

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Check if account is locked
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const remainingTime = Math.ceil((user.lockedUntil - new Date()) / 60000);
      throw new Error(`Account locked. Try again in ${remainingTime} minutes`);
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      // Increment failed attempts
      const failedAttempts = (user.failedLoginAttempts || 0) + 1;
      const updateData = { failedLoginAttempts: failedAttempts };
      
      // Lock account if max attempts reached
      if (failedAttempts >= MAX_LOGIN_ATTEMPTS) {
        updateData.lockedUntil = new Date(Date.now() + LOCKOUT_TIME);
        updateData.failedLoginAttempts = 0;
      }
      
      await user.update(updateData);
      throw new Error('Invalid credentials');
    }

    // Reset failed attempts on successful login
    if (user.failedLoginAttempts > 0) {
      await user.update({ 
        failedLoginAttempts: 0, 
        lockedUntil: null,
        lastLoginAt: new Date()
      });
    } else {
      await user.update({ lastLoginAt: new Date() });
    }

    // Update token version for refresh token validation
    const tokenVersion = (user.tokenVersion || 0) + 1;
    
    // Generate both access and refresh tokens with the NEW token version
    const { accessToken, refreshToken } = generateTokens({
      ...user.toJSON(),
      tokenVersion: tokenVersion
    });
    
    await user.update({ 
      token: accessToken,
      refreshToken: refreshToken,
      tokenVersion: tokenVersion
    });

    const { password: _, failedLoginAttempts, lockedUntil, refreshToken: __, ...userWithoutSensitiveData } = user.toJSON();
    return {
      accessToken,
      refreshToken,
      user: userWithoutSensitiveData
    };
  }

  async refreshToken(refreshToken) {
    try {
      const decoded = verifyToken(refreshToken, true);
      if (!decoded) {
        throw new Error('Invalid refresh token');
      }

      const user = await User.findByPk(decoded.id);
      if (!user || !user.active) {
        throw new Error('User not found or inactive');
      }

      // Check if refresh token matches and token version is valid
      if (user.refreshToken !== refreshToken) {
        throw new Error('Refresh token has been invalidated - token mismatch');
      }

      if (user.tokenVersion !== decoded.tokenVersion) {
        throw new Error('Refresh token has been invalidated - version mismatch');
      }

      // Increment token version FIRST
      const newTokenVersion = (user.tokenVersion || 0) + 1;
      
      // Generate new tokens with the NEW token version (after incrementing)
      const { accessToken, refreshToken: newRefreshToken } = generateTokens({
        ...user.toJSON(),
        tokenVersion: newTokenVersion // Use incremented version for token generation
      });
      
      await user.update({ 
        token: accessToken,
        refreshToken: newRefreshToken,
        tokenVersion: newTokenVersion
      });

      return {
        accessToken,
        refreshToken: newRefreshToken
      };
    } catch (error) {
      console.error('Refresh token error:', error.message);
      throw new Error('Invalid refresh token');
    }
  }

  async logout(userId) {
    await User.update({ 
      token: null,
      refreshToken: null
    }, { where: { id: userId } });
  }

  async logoutAll(userId) {
    // Increment token version to invalidate all existing tokens
    const user = await User.findByPk(userId);
    if (user) {
      await user.update({ 
        token: null,
        refreshToken: null,
        tokenVersion: (user.tokenVersion || 0) + 1
      });
    }
  }

  async validateToken(token, userId) {
    try {
      // Verify JWT token
      const decoded = verifyToken(token);
      if (!decoded) {
        throw new Error('Invalid token');
      }

      // Check if user exists and is active
      const user = await User.findByPk(userId);
      if (!user || !user.active) {
        throw new Error('User not found or inactive');
      }

      // Check if token matches the one stored in database
      if (user.token !== token) {
        throw new Error('Token has been invalidated');
      }

      // Check if decoded user ID matches the provided user ID
      if (decoded.id !== userId) {
        throw new Error('Token does not match user');
      }

      return true;
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    // Verify current password
    const validCurrentPassword = await bcrypt.compare(currentPassword, user.password);
    if (!validCurrentPassword) {
      throw new Error('Current password is incorrect');
    }

    // Validate new password strength
    const passwordValidation = this.validatePasswordStrength(newPassword);
    if (!passwordValidation.isValid) {
      throw new Error(`Password requirements not met: ${passwordValidation.errors.join(', ')}`);
    }

    // Hash and update new password
    const hashedNewPassword = await this.hashPassword(newPassword);
    await user.update({ 
      password: hashedNewPassword,
      // Invalidate all existing tokens
      token: null,
      refreshToken: null,
      tokenVersion: (user.tokenVersion || 0) + 1
    });
  }

  async updateProfile(userId, data) {
    const user = await User.findByPk(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const allowedFields = ['firstName', 'lastName', 'email', 'phoneNumber', 'address', 'birthday', 'imageUrl'];
    const updateData = {};
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        updateData[field] = data[field];
      }
    }

    await user.update(updateData);
    return this.getCurrentUser(userId);
  }

  async getCurrentUser(userId) {
    const user = await User.findByPk(userId, {
      include: [
        {
          model: Role,
          as: 'role'
        },
        {
          model: School,
          as: 'school',
          attributes: ['id', 'name', 'schoolCode', 'address', 'contactNo1', 'email']
        }
      ]
    });

    if (!user) {
      throw new Error('User not found');
    }

    const { password, token, refreshToken, failedLoginAttempts, lockedUntil, tokenVersion, ...userWithoutSensitiveData } = user.toJSON();
    return userWithoutSensitiveData;
  }

  // New method for password hashing
  async hashPassword(password) {
    return await bcrypt.hash(password, SALT_ROUNDS);
  }

  // New method for password strength validation
  validatePasswordStrength(password) {
    const minLength = 8;
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    const errors = [];
    if (password.length < minLength) errors.push(`Password must be at least ${minLength} characters long`);
    if (!hasUpperCase) errors.push('Password must contain at least one uppercase letter');
    if (!hasLowerCase) errors.push('Password must contain at least one lowercase letter');
    if (!hasNumbers) errors.push('Password must contain at least one number');
    if (!hasSpecialChar) errors.push('Password must contain at least one special character');

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}

module.exports = new AuthService(); 