'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('course_subjects', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
      },
      course_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: 'courses',
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
      active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true
      },
      note: {
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

    await queryInterface.addConstraint('course_subjects', {
      fields: ['course_id', 'subject_id'],
      type: 'unique',
      name: 'course_subjects_course_id_subject_id_unique'
    });
    await queryInterface.addIndex('course_subjects', ['course_id']);
    await queryInterface.addIndex('course_subjects', ['subject_id']);
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint('course_subjects', 'course_subjects_course_id_subject_id_unique');
    await queryInterface.dropTable('course_subjects');
  }
};
