const { User, Role, School } = require('../../sequelize/models');
const bcrypt = require('bcryptjs');

const userDataAccess = {
  createUser: async (userData) => {
    try {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(userData.password, salt);

      const newUser = await User.create({
        ...userData,
        password: hashedPassword,
        birthday: userData.birthday ? userData.birthday.toISOString().split('T')[0] : null
      });

      const { password, ...userWithoutPassword } = newUser.toJSON();
      return userWithoutPassword;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },

  getUsers: async () => {
    try {
      const users = await User.findAll({
        include: [
          { 
            model: Role,
            as: 'role',
            attributes: ['id', 'name', 'description']
          },
          {
            model: School,
            as: 'school',
            attributes: ['id', 'name', 'schoolCode', 'address', 'contactNo1', 'email']
          }
        ]
      });
      
      return users.map(user => {
        const { 
          password, 
          token, 
          refreshToken, 
          tokenVersion, 
          failedLoginAttempts, 
          lockedUntil,
          ...userWithoutSensitiveData 
        } = user.toJSON();
        return userWithoutSensitiveData;
      });
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },

  getUserById: async (userId) => {
    try {
      const user = await User.findByPk(userId, {
        include: [
          { 
            model: Role,
            as: 'role',
            attributes: ['id', 'name', 'description']
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
      
      const { 
        password, 
        token, 
        refreshToken, 
        tokenVersion, 
        failedLoginAttempts, 
        lockedUntil,
        ...userWithoutSensitiveData 
      } = user.toJSON();
      return userWithoutSensitiveData;
    } catch (error) {
      console.error('Error fetching user by ID:', error);
      throw error;
    }
  },

  updateUser: async (userId, userData) => {
    try {
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const { username, password, ...updatableData } = userData;

      await user.update(updatableData);

      const updatedUser = await User.findByPk(userId, {
        include: [
          { 
            model: Role,
            as: 'role',
            attributes: ['id', 'name', 'description']
          },
          {
            model: School,
            as: 'school',
            attributes: ['id', 'name', 'schoolCode']
          }
        ]
      });

      const { 
        password: _, 
        token, 
        refreshToken, 
        tokenVersion, 
        failedLoginAttempts, 
        lockedUntil,
        ...userWithoutSensitiveData 
      } = updatedUser.toJSON();
      return userWithoutSensitiveData;
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  }
};

module.exports = userDataAccess; 