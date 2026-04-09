'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1
          FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'enum_students_status'
            AND e.enumlabel = 'pending'
        ) THEN
          ALTER TYPE "enum_students_status" ADD VALUE 'pending';
        END IF;
      END $$;
    `);

    await queryInterface.sequelize.query(
      `ALTER TABLE "students" ALTER COLUMN "status" SET DEFAULT 'pending';`
    );
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `UPDATE "students" SET "status" = 'enrolled' WHERE "status" = 'pending';`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `ALTER TABLE "students" ALTER COLUMN "status" SET DEFAULT 'enrolled';`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `ALTER TYPE "enum_students_status" RENAME TO "enum_students_status_old";`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `CREATE TYPE "enum_students_status" AS ENUM ('enrolled', 'dropped', 'graduated');`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `
        ALTER TABLE "students"
        ALTER COLUMN "status" TYPE "enum_students_status"
        USING "status"::text::"enum_students_status";
        `,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `DROP TYPE "enum_students_status_old";`,
        { transaction }
      );
    });
  }
};
