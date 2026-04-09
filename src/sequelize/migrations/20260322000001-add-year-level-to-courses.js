'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('courses', 'year_level', {
      type: Sequelize.ENUM('Year 1', 'Year 2', 'Year 3', 'Year 4', 'Year 5', 'Year 6'),
      allowNull: false,
      defaultValue: 'Year 1'
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('courses', 'year_level');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_courses_year_level";');
  }
};
