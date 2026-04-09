'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('attendances', 'student_subject_assignment_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'student_subject_assignments',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    await queryInterface.changeColumn('attendances', 'section_subject_teacher_id', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: 'section_subject_teachers',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });

    await queryInterface.addIndex('attendances', ['student_subject_assignment_id'], {
      name: 'attendances_student_subject_assignment_id_idx'
    });

    await queryInterface.addIndex(
      'attendances',
      ['student_id', 'attendance_date', 'student_subject_assignment_id'],
      {
        name: 'attendances_student_date_override_idx'
      }
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('attendances', 'attendances_student_date_override_idx');
    await queryInterface.removeIndex('attendances', 'attendances_student_subject_assignment_id_idx');

    await queryInterface.changeColumn('attendances', 'section_subject_teacher_id', {
      type: Sequelize.UUID,
      allowNull: false,
      references: {
        model: 'section_subject_teachers',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });

    await queryInterface.removeColumn('attendances', 'student_subject_assignment_id');
  }
};
