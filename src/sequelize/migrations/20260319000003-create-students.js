'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('students', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
      },

      user_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },

      first_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      middle_name: {
        type: Sequelize.STRING,
        allowNull: true
      },
      last_name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      birthday: {
        type: Sequelize.DATE,
        allowNull: true
      },
      address: {
        type: Sequelize.STRING,
        allowNull: true
      },
      contact_number: {
        type: Sequelize.STRING,
        allowNull: false
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },

      student_id_number: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },

      year_level: {
        type: Sequelize.ENUM('Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6'),
        allowNull: false
      },

      guardian_contact_number: {
        type: Sequelize.STRING,
        allowNull: false
      },
      guardian_email: {
        type: Sequelize.STRING,
        allowNull: false
      },

      active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      registered_date: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      enrolled_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      status: {
        type: Sequelize.ENUM('enrolled', 'dropped', 'graduated'),
        allowNull: false,
        defaultValue: 'enrolled'
      },

      modified_by: {
        type: Sequelize.UUID,
        allowNull: true
      },

      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('students');
  }
};

