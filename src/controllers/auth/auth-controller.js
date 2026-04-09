const authService = require('../../services/auth.service');

const authController = {
  login: async (req, res) => {
    try {
      const { username, password } = req.body;
      if (!username || !password) {
        return res.status(400).json({ 
          message: 'Username and password are required',
          code: 'MISSING_CREDENTIALS'
        });
      }
      
      const result = await authService.login(username, password);
      res.json(result);
    } catch (error) {
      const statusCode = error.message.includes('locked') ? 423 : 401;
      res.status(statusCode).json({ 
        message: error.message,
        code: error.message.includes('locked') ? 'ACCOUNT_LOCKED' : 'INVALID_CREDENTIALS'
      });
    }
  },

  refreshToken: async (req, res) => {
    try {
      const { refreshToken } = req.body;
      if (!refreshToken) {
        return res.status(400).json({ 
          message: 'Refresh token is required',
          code: 'MISSING_REFRESH_TOKEN'
        });
      }
      
      const result = await authService.refreshToken(refreshToken);
      res.json(result);
    } catch (error) {
      res.status(401).json({ 
        message: error.message,
        code: 'INVALID_REFRESH_TOKEN'
      });
    }
  },

  logout: async (req, res) => {
    try {
      await authService.logout(req.user.id);
      res.json({ 
        message: 'Logged out successfully',
        code: 'LOGOUT_SUCCESS'
      });
    } catch (error) {
      res.status(500).json({ 
        message: error.message,
        code: 'LOGOUT_ERROR'
      });
    }
  },

  logoutAll: async (req, res) => {
    try {
      await authService.logoutAll(req.user.id);
      res.json({ 
        message: 'Logged out from all devices successfully',
        code: 'LOGOUT_ALL_SUCCESS'
      });
    } catch (error) {
      res.status(500).json({ 
        message: error.message,
        code: 'LOGOUT_ALL_ERROR'
      });
    }
  },

  validateToken: async (req, res) => {
    try {
      const { token, userId } = req.body;
      
      if (!token || !userId) {
        return res.status(400).json({ 
          message: 'Token and userId are required',
          isValid: false,
          code: 'MISSING_PARAMETERS'
        });
      }

      const isValid = await authService.validateToken(token, userId);
      res.json({ 
        isValid,
        code: 'VALIDATION_SUCCESS'
      });
    } catch (error) {
      res.status(401).json({ 
        message: error.message,
        isValid: false,
        code: 'VALIDATION_FAILED'
      });
    }
  },

  changePassword: async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ 
          message: 'Current password and new password are required',
          code: 'MISSING_PASSWORDS'
        });
      }

      await authService.changePassword(req.user.id, currentPassword, newPassword);
      res.json({ 
        message: 'Password changed successfully',
        code: 'PASSWORD_CHANGED'
      });
    } catch (error) {
      const statusCode = error.message.includes('Current password') ? 400 : 500;
      res.status(statusCode).json({ 
        message: error.message,
        code: error.message.includes('Current password') ? 'INVALID_CURRENT_PASSWORD' : 'PASSWORD_CHANGE_ERROR'
      });
    }
  },

  updateProfile: async (req, res) => {
    try {
      const data = { ...req.body };
      if (req.file) {
        data.imageUrl = `/uploads/useruploads/${req.file.filename}`;
      }
      const user = await authService.updateProfile(req.user.id, data);
      res.json(user);
    } catch (error) {
      res.status(400).json({
        message: error.message,
        code: 'PROFILE_UPDATE_ERROR'
      });
    }
  },

  getCurrentUser: async (req, res) => {
    try {
      const user = await authService.getCurrentUser(req.user.id);
      res.json(user);
    } catch (error) {
      res.status(500).json({ 
        message: error.message,
        code: 'USER_INFO_ERROR'
      });
    }
  }
};

module.exports = authController;
