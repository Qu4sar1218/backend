'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('email_logs', {
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
      raw_timelog_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'raw_timelogs',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      recipient_email: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      email_type: {
        type: Sequelize.ENUM('HALLWAY_CHECKOUT'),
        allowNull: false,
        defaultValue: 'HALLWAY_CHECKOUT'
      },
      subject: {
        type: Sequelize.STRING(500),
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('PENDING', 'SENT', 'FAILED'),
        allowNull: false,
        defaultValue: 'PENDING'
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      email_content: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      smtp_response: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      message_id: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      attendance_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      sent_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    await queryInterface.addIndex('email_logs', ['student_id', 'attendance_date', 'email_type'], {
      name: 'email_logs_student_date_type_idx'
    });
    await queryInterface.addIndex('email_logs', ['status'], { name: 'email_logs_status_idx' });
    await queryInterface.addIndex('email_logs', ['created_at'], { name: 'email_logs_created_at_idx' });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('email_logs');
  }
};
