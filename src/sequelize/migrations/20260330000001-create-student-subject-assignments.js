'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('student_subject_assignments', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
      },
      student_enrollment_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'student_enrollments',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      assignment_type: {
        type: Sequelize.ENUM('ADD', 'REMOVE', 'REPLACE'),
        allowNull: false
      },
      base_section_subject_teacher_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'section_subject_teachers',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      section_subject_teacher_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'section_subject_teachers',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      subject_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'subjects',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      teacher_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      section_id: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: 'sections',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      days_of_week: {
        type: Sequelize.JSON,
        allowNull: true
      },
      start_time: {
        type: Sequelize.TIME,
        allowNull: true
      },
      end_time: {
        type: Sequelize.TIME,
        allowNull: true
      },
      effective_from: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      effective_to: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      remarks: {
        type: Sequelize.STRING,
        allowNull: true
      },
      modified_by: {
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

    await queryInterface.addIndex('student_subject_assignments', ['student_enrollment_id'], {
      name: 'student_subject_assignments_enrollment_idx'
    });
    await queryInterface.addIndex('student_subject_assignments', ['active'], {
      name: 'student_subject_assignments_active_idx'
    });
    await queryInterface.addIndex('student_subject_assignments', ['student_enrollment_id', 'active'], {
      name: 'student_subject_assignments_enrollment_active_idx'
    });
    await queryInterface.addIndex('student_subject_assignments', ['base_section_subject_teacher_id'], {
      name: 'student_subject_assignments_base_assignment_idx'
    });
    await queryInterface.addIndex('student_subject_assignments', ['section_subject_teacher_id'], {
      name: 'student_subject_assignments_assignment_idx'
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable('student_subject_assignments');
    if (queryInterface.sequelize.getDialect() === 'postgres') {
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_student_subject_assignments_assignment_type";');
    }
  }
};
