'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('section_subject_teachers', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
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

    await queryInterface.addConstraint('section_subject_teachers', {
      fields: ['section_id', 'subject_id', 'teacher_id'],
      type: 'unique',
      name: 'section_subject_teachers_section_id_subject_id_teacher_id_unique'
    });

    await queryInterface.addIndex('section_subject_teachers', ['section_id']);
    await queryInterface.addIndex('section_subject_teachers', ['subject_id']);
    await queryInterface.addIndex('section_subject_teachers', ['teacher_id']);
    await queryInterface.addIndex('section_subject_teachers', ['section_id', 'active']);
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint(
      'section_subject_teachers',
      'section_subject_teachers_section_id_subject_id_teacher_id_unique'
    );
    await queryInterface.dropTable('section_subject_teachers');
  }
};
