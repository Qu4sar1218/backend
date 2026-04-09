'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('sections', {
      id: {
        allowNull: false,
        primaryKey: true,
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      code: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      description: {
        type: Sequelize.STRING
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
      year_level: {
        type: Sequelize.ENUM('Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6'),
        allowNull: false
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

    await queryInterface.addIndex('sections', ['course_id']);
    await queryInterface.addIndex('sections', ['course_id', 'year_level']);
    await queryInterface.addConstraint('sections', {
      fields: ['course_id', 'name', 'year_level'],
      type: 'unique',
      name: 'sections_course_id_name_year_level_unique'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint('sections', 'sections_course_id_name_year_level_unique');
    await queryInterface.dropTable('sections');
  }
};
