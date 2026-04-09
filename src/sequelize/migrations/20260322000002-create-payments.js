'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('payments', {
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
      amount: {
        type: Sequelize.DECIMAL(12, 2),
        allowNull: false
      },
      purpose: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      image_url: {
        type: Sequelize.STRING(500),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('pending', 'rejected', 'verified'),
        allowNull: false,
        defaultValue: 'pending'
      },
      remarks: {
        type: Sequelize.TEXT,
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

    await queryInterface.addIndex('payments', ['student_id'], {
      name: 'idx_payments_student_id'
    });
    await queryInterface.addIndex('payments', ['status'], {
      name: 'idx_payments_status'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('payments');
  }
};
