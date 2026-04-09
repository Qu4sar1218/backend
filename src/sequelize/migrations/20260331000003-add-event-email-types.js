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
          WHERE t.typname = 'enum_email_logs_email_type'
            AND e.enumlabel = 'EVENT_SCAN_TIME_IN'
        ) THEN
          ALTER TYPE "enum_email_logs_email_type" ADD VALUE 'EVENT_SCAN_TIME_IN';
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
          WHERE t.typname = 'enum_email_logs_email_type'
            AND e.enumlabel = 'EVENT_SCAN_TIME_OUT'
        ) THEN
          ALTER TYPE "enum_email_logs_email_type" ADD VALUE 'EVENT_SCAN_TIME_OUT';
        END IF;
      END $$;
    `);
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `
        UPDATE "email_logs"
        SET "email_type" = 'HALLWAY_CHECKOUT'
        WHERE "email_type" IN ('EVENT_SCAN_TIME_IN', 'EVENT_SCAN_TIME_OUT');
        `,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `ALTER TYPE "enum_email_logs_email_type" RENAME TO "enum_email_logs_email_type_old";`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `CREATE TYPE "enum_email_logs_email_type" AS ENUM ('HALLWAY_CHECKOUT');`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `
        ALTER TABLE "email_logs"
        ALTER COLUMN "email_type" TYPE "enum_email_logs_email_type"
        USING "email_type"::text::"enum_email_logs_email_type";
        `,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `DROP TYPE "enum_email_logs_email_type_old";`,
        { transaction }
      );
    });
  }
};
