'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('attendances', {
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
      attendance_date: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      section_subject_teacher_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'section_subject_teachers',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      section_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'sections',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      subject_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'subjects',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      teacher_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      status: {
        type: Sequelize.ENUM('PRESENT', 'LATE', 'ABSENT', 'EXCUSED'),
        allowNull: false,
        defaultValue: 'PRESENT'
      },
      first_scan_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      last_scan_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      time_in: {
        type: Sequelize.DATE,
        allowNull: true
      },
      time_out: {
        type: Sequelize.DATE,
        allowNull: true
      },
      source: {
        type: Sequelize.ENUM('AUTO', 'MANUAL'),
        allowNull: false,
        defaultValue: 'AUTO'
      },
      derived_from_raw_timelog_ids: {
        type: Sequelize.JSON,
        allowNull: true
      },
      note: {
        type: Sequelize.STRING,
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

    await queryInterface.addConstraint('attendances', {
      fields: ['student_id', 'attendance_date', 'section_subject_teacher_id'],
      type: 'unique',
      name: 'attendances_student_date_assignment_unique'
    });

    await queryInterface.addIndex('attendances', ['teacher_id', 'attendance_date'], {
      name: 'attendances_teacher_date_idx'
    });
    await queryInterface.addIndex('attendances', ['section_id', 'attendance_date'], {
      name: 'attendances_section_date_idx'
    });
    await queryInterface.addIndex('attendances', ['subject_id', 'attendance_date'], {
      name: 'attendances_subject_date_idx'
    });
    await queryInterface.addIndex('attendances', ['student_id', 'attendance_date'], {
      name: 'attendances_student_date_idx'
    });
    await queryInterface.addIndex('attendances', ['status'], {
      name: 'attendances_status_idx'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint('attendances', 'attendances_student_date_assignment_unique');
    await queryInterface.dropTable('attendances');
  }
};
