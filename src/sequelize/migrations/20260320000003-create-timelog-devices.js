'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('timelog_devices', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
      },
      school_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'schools',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      device_type_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'device_types',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      code: {
        type: Sequelize.STRING(50),
        allowNull: false,
        unique: true
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      serial_number: {
        type: Sequelize.STRING(100),
        allowNull: true,
        unique: true
      },
      mac_address: {
        type: Sequelize.STRING(17),
        allowNull: true
      },
      ip_address: {
        type: Sequelize.STRING(45),
        allowNull: true
      },
      location_name: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      department_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'departments',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      address: {
        type: Sequelize.TEXT,
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
      timezone: {
        type: Sequelize.STRING(50),
        allowNull: false,
        defaultValue: 'Asia/Manila'
      },
      is_entry_only: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      is_exit_only: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false
      },
      status: {
        type: Sequelize.ENUM('Active', 'Inactive', 'Maintenance', 'Offline'),
        allowNull: false,
        defaultValue: 'Active'
      },
      last_sync_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      last_online_date: {
        type: Sequelize.DATE,
        allowNull: true
      },
      settings: {
        type: Sequelize.JSON,
        allowNull: true
      },
      remarks: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      installed_date: {
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
      'timelog_devices',
      ['school_id', 'device_type_id', 'department_id', 'status'],
      {
        name: 'idx_timelog_devices_school_type_dept_status'
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable('timelog_devices');
  }
};
