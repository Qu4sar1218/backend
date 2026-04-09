'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.addColumn(
        'payments',
        'event_id',
        {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: 'events',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        { transaction }
      );

      const countRows = await queryInterface.sequelize.query(
        'SELECT COUNT(*)::int AS count FROM payments',
        { type: Sequelize.QueryTypes.SELECT, transaction }
      );
      const totalPayments = Number(countRows?.[0]?.count || 0);

      if (totalPayments > 0) {
        const fallbackEvents = await queryInterface.sequelize.query(
          'SELECT id FROM events ORDER BY created_at ASC NULLS LAST LIMIT 1',
          { type: Sequelize.QueryTypes.SELECT, transaction }
        );
        const fallbackEventId = fallbackEvents?.[0]?.id;
        if (!fallbackEventId) {
          throw new Error(
            'Cannot migrate payments.event_id: existing payment rows exist but the events table is empty. ' +
              'Create at least one event, or delete legacy payment rows, then re-run the migration.'
          );
        }
        await queryInterface.sequelize.query(
          `UPDATE payments SET event_id = :eventId WHERE event_id IS NULL`,
          {
            replacements: { eventId: fallbackEventId },
            transaction
          }
        );
      }

      await queryInterface.changeColumn(
        'payments',
        'event_id',
        {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: 'events',
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'RESTRICT'
        },
        { transaction }
      );

      await queryInterface.addIndex('payments', ['event_id'], {
        name: 'idx_payments_event_id',
        transaction
      });

      await queryInterface.addIndex('payments', ['student_id', 'event_id', 'status'], {
        name: 'idx_payments_student_event_status',
        transaction
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeIndex('payments', 'idx_payments_student_event_status', { transaction });
      await queryInterface.removeIndex('payments', 'idx_payments_event_id', { transaction });
      await queryInterface.removeColumn('payments', 'event_id', { transaction });
    });
  }
};
