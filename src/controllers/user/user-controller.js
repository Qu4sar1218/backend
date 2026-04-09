const userUseCases = require('../../use-cases/user/user-use-cases');

const userController = {
  createUser: async (req, res) => {
    try {
      const userData = {
        ...req.body,
        createdById: req.user.id
      };
      
      if (req.file) {
        userData.imageUrl = `/uploads/useruploads/${req.file.filename}`;
      }
      
      const newUser = await userUseCases.createUser(userData);
      res.status(201).json(newUser);
    } catch (error) {
      console.error('Controller error:', error);
      res.status(400).json({ error: error.message });
    }
  },

  getUsers: async (req, res) => {
    try {
      const users = await userUseCases.getUsers();
      res.status(200).json(users);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  },

  getUserById: async (req, res) => {
    try {
      const userId = req.params.id;
      const user = await userUseCases.getUserById(userId);
      res.status(200).json(user);
    } catch (error) {
      res.status(404).json({ error: error.message });
    }
  },

  updateUser: async (req, res) => {
    try {
      const userId = req.params.id;
      const userData = {
        ...req.body,
        modifiedById: req.user.id
      };
      
      if (req.file) {
        userData.imageUrl = `/uploads/useruploads/${req.file.filename}`;
      }
      
      const updatedUser = await userUseCases.updateUser(userId, userData);
      res.status(200).json(updatedUser);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
};

module.exports = userController; 