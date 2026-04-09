'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('student_enrollments', 'student_type', {
      type: Sequelize.ENUM('regular', 'irregular'),
      allowNull: true
    });

    await queryInterface.sequelize.query(
      "UPDATE student_enrollments SET student_type = 'regular' WHERE student_type IS NULL"
    );

    await queryInterface.changeColumn('student_enrollments', 'student_type', {
      type: Sequelize.ENUM('regular', 'irregular'),
      allowNull: false
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('student_enrollments', 'student_type');

    if (queryInterface.sequelize.getDialect() === 'postgres') {
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_student_enrollments_student_type";');
    }
  }
};
