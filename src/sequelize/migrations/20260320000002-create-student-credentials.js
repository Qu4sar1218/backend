'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('student_credentials', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
      },
      student_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'students',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      credential_type: {
        type: Sequelize.ENUM('FINGERPRINT', 'FACE', 'RFID', 'QR_CODE', 'PIN', 'CARD'),
        allowNull: false
      },
      credential_data: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      credential_reference: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      is_primary: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      enrolled_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      expiry_date: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      created_by: {
        type: Sequelize.UUID,
        allowNull: true
      },
      updated_by: {
        type: Sequelize.UUID,
        allowNull: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.NOW
      }
    });

    await queryInterface.addIndex(
      'student_credentials',
      ['student_id', 'credential_type', 'is_active'],
      {
        name: 'idx_student_credentials_student_type_active'
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('student_credentials');
  }
};
