'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('section_subject_teachers', 'days_of_week', {
      type: Sequelize.JSONB,
      allowNull: true
    });
    await queryInterface.addColumn('section_subject_teachers', 'start_time', {
      type: Sequelize.TIME,
      allowNull: true
    });
    await queryInterface.addColumn('section_subject_teachers', 'end_time', {
      type: Sequelize.TIME,
      allowNull: true
    });
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('section_subject_teachers', 'end_time');
    await queryInterface.removeColumn('section_subject_teachers', 'start_time');
    await queryInterface.removeColumn('section_subject_teachers', 'days_of_week');
  }
};
