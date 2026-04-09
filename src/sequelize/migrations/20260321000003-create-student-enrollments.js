'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('student_enrollments', {
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
      course_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'courses',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
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
      school_year: {
        type: Sequelize.STRING,
        allowNull: false
      },
      year_level: {
        type: Sequelize.ENUM('Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6'),
        allowNull: false
      },
      enrolled_date: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      status: {
        type: Sequelize.ENUM('enrolled', 'dropped', 'graduated'),
        allowNull: false,
        defaultValue: 'enrolled'
      },
      active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      remarks: {
        type: Sequelize.STRING
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

    await queryInterface.addIndex('student_enrollments', ['student_id']);
    await queryInterface.addIndex('student_enrollments', ['course_id']);
    await queryInterface.addIndex('student_enrollments', ['section_id']);
    await queryInterface.addIndex('student_enrollments', ['student_id', 'active']);
  },

  async down(queryInterface) {
    await queryInterface.dropTable('student_enrollments');
  }
};
