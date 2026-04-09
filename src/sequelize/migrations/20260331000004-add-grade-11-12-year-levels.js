'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const addYearLevelValue = (typname, label) =>
      queryInterface.sequelize.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1
            FROM pg_enum e
            JOIN pg_type t ON t.oid = e.enumtypid
            WHERE t.typname = '${typname}'
              AND e.enumlabel = '${label.replace(/'/g, "''")}'
          ) THEN
            ALTER TYPE "${typname}" ADD VALUE '${label.replace(/'/g, "''")}';
          END IF;
        END $$;
      `);

    for (const typ of [
      'enum_students_year_level',
      'enum_sections_year_level',
      'enum_student_enrollments_year_level',
      'enum_courses_year_level'
    ]) {
      await addYearLevelValue(typ, 'Grade 11');
      await addYearLevelValue(typ, 'Grade 12');
    }

    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'enum_subjects_year'
            AND e.enumlabel = 'grade_11'
        ) THEN
          ALTER TYPE "enum_subjects_year" ADD VALUE 'grade_11';
        END IF;
      END $$;
    `);
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'enum_subjects_year'
            AND e.enumlabel = 'grade_12'
        ) THEN
          ALTER TYPE "enum_subjects_year" ADD VALUE 'grade_12';
        END IF;
      END $$;
    `);
  },

  async down() {
    // PostgreSQL does not support removing ENUM values safely; no-op.
  }
};
