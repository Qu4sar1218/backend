'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('attendance_policies', {
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
      section_subject_teacher_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'section_subject_teachers',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      on_time_grace_minutes: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 10
      },
      late_until_minutes: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 30
      },
      absent_after_late_window: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
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

    await queryInterface.addIndex('attendance_policies', ['school_id', 'active'], {
      name: 'attendance_policies_school_id_active_idx'
    });
    await queryInterface.addIndex('attendance_policies', ['section_subject_teacher_id', 'active'], {
      name: 'attendance_policies_assignment_active_idx'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('attendance_policies');
  }
};
