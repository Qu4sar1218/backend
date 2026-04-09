'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('raw_timelogs', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
      },
      device_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'timelog_devices',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      source_type: {
        type: Sequelize.ENUM('DEVICE', 'MANUAL', 'MOBILE_APP', 'WEB_PORTAL', 'IMPORT', 'API'),
        allowNull: false
      },
      student_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'students',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      student_number: {
        type: Sequelize.STRING(20),
        allowNull: true
      },
      credential_reference: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      log_datetime: {
        type: Sequelize.DATE,
        allowNull: false
      },
      log_type: {
        type: Sequelize.ENUM('TIME_IN', 'TIME_OUT', 'BREAK_OUT', 'BREAK_IN', 'AUTO'),
        allowNull: false,
        defaultValue: 'AUTO'
      },
      location_name: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      latitude: {
        type: Sequelize.DECIMAL(10, 8),
        allowNull: true
      },
      longitude: {
        type: Sequelize.DECIMAL(11, 8),
        allowNull: true
      },
      verification_method: {
        type: Sequelize.ENUM('FINGERPRINT', 'FACE', 'RFID', 'QR_CODE', 'PIN', 'CARD', 'MANUAL'),
        allowNull: false
      },
      verification_score: {
        type: Sequelize.DECIMAL(5, 2),
        allowNull: true
      },
      raw_data: {
        type: Sequelize.JSON,
        allowNull: true
      },
      device_log_id: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      processing_status: {
        type: Sequelize.ENUM('PENDING', 'PROCESSED', 'MATCHED', 'UNMATCHED', 'DUPLICATE', 'ERROR', 'IGNORED'),
        allowNull: false,
        defaultValue: 'PENDING'
      },
      error_message: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      matched_attendance_id: {
        type: Sequelize.UUID,
        allowNull: true
      },
      matched_by: {
        type: Sequelize.UUID,
        allowNull: true
      },
      matched_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      imported_by: {
        type: Sequelize.UUID,
        allowNull: true
      },
      imported_date: {
        type: Sequelize.DATE,
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
      'raw_timelogs',
      ['student_id', 'device_id', 'log_datetime', 'processing_status', 'source_type'],
      {
        name: 'idx_raw_timelogs_student_device_datetime_status_source'
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('raw_timelogs');
  }
};
