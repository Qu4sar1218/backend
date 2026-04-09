const userDataAccess = require('../../data-access/user/user-data-access');
const jwt = require('jsonwebtoken');

const userUseCases = {
  createUser: async (userData) => {
    try {
      // Check for required fields
      const requiredFields = ['firstName', 'lastName', 'username', 'email', 'password', 'roleId', 'schoolId'];
      for (const field of requiredFields) {
        if (!userData[field]) {
          throw new Error(`${field} is required`);
        }
      }

      // Set default values
      const defaultValues = {
        active: true,
        birthday: userData.birthday || null,
        middleName: userData.middleName || null,
        phoneNumber: userData.phoneNumber || null,
        address: userData.address || null,
        imageUrl: userData.imageUrl || null
      };

      const newUser = await userDataAccess.createUser({
        ...userData,
        ...defaultValues
      });

      const token = jwt.sign(
        { id: newUser.id, username: newUser.username },
        process.env.JWT_SECRET,
        { expiresIn: '1d' }
      );

      return { ...newUser, token };
    } catch (error) {
      throw new Error(`Failed to create user: ${error.message}`);
    }
  },

  getUsers: async () => {
    try {
      const users = await userDataAccess.getUsers();
      return users;
    } catch (error) {
      throw new Error(`Failed to fetch users: ${error.message}`);
    }
  },

  getUserById: async (userId) => {
    try {
      const user = await userDataAccess.getUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }
      return user;
    } catch (error) {
      throw new Error(`Failed to fetch user: ${error.message}`);
    }
  },

  updateUser: async (userId, userData) => {
    try {
      // Normalize boolean-like values from request payloads
      if (userData.active !== undefined) {
        userData.active = userData.active === true || userData.active === 'true';
      }

      const updatedUser = await userDataAccess.updateUser(userId, userData);
      return updatedUser;
    } catch (error) {
      throw new Error(`Failed to update user: ${error.message}`);
    }
  }
};

module.exports = userUseCases; 