const test = require('node:test');
const assert = require('node:assert/strict');

const paymentUseCases = require('../src/use-cases/payment/payment-use-cases');
const paymentDataAccess = require('../src/data-access/payment/payment-data-access');

const baseUser = { id: 'user-1', role: { name: 'Student' } };
const adminUser = { id: 'admin-1', role: { name: 'Admin' } };
const baseInput = {
  user: baseUser,
  amountRaw: '1200',
  purpose: 'Event fee',
  imageFile: { filename: 'receipt.jpg' },
  eventId: '550e8400-e29b-41d4-a716-446655440000'
};

function withStubs(stubs, fn) {
  const originals = {};
  for (const [key, value] of Object.entries(stubs)) {
    originals[key] = paymentDataAccess[key];
    paymentDataAccess[key] = value;
  }
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      for (const [key, value] of Object.entries(originals)) {
        paymentDataAccess[key] = value;
      }
    });
}

test('blocks create when verified payment exists for event', async () => {
  await withStubs(
    {
      findStudentByUserId: async () => ({ id: 'student-1' }),
      findEventById: async () => ({ id: baseInput.eventId }),
      listByStudentAndEvent: async () => [{ status: 'verified' }]
    },
    async () => {
      await assert.rejects(
        () => paymentUseCases.createPayment(baseInput),
        (err) => err.message === 'Payment already verified for this event'
      );
    }
  );
});

test('blocks create when pending payment exists for event', async () => {
  await withStubs(
    {
      findStudentByUserId: async () => ({ id: 'student-1' }),
      findEventById: async () => ({ id: baseInput.eventId }),
      listByStudentAndEvent: async () => [{ status: 'pending' }]
    },
    async () => {
      await assert.rejects(
        () => paymentUseCases.createPayment(baseInput),
        (err) => err.message === 'A pending payment already exists for this event'
      );
    }
  );
});

test('allows new pending submission when previous status is rejected', async () => {
  await withStubs(
    {
      findStudentByUserId: async () => ({ id: 'student-1' }),
      findEventById: async () => ({ id: baseInput.eventId }),
      listByStudentAndEvent: async () => [{ status: 'rejected' }],
      createPayment: async (payload) => payload
    },
    async () => {
      const result = await paymentUseCases.createPayment(baseInput);
      assert.equal(result.studentId, 'student-1');
      assert.equal(result.eventId, baseInput.eventId);
      assert.equal(result.purpose, 'Event fee');
      assert.equal(result.imageUrl, '/uploads/paymentproofs/receipt.jpg');
    }
  );
});

test('listAllPayments rejects non-admin', async () => {
  await assert.rejects(
    () => paymentUseCases.listAllPayments(baseUser, {}),
    (err) => err.message === 'Insufficient permissions'
  );
});

test('listAllPayments rejects invalid event_id filter', async () => {
  await assert.rejects(
    () => paymentUseCases.listAllPayments(adminUser, { eventId: 'not-a-uuid' }),
    (err) => err.message === 'Invalid event_id filter'
  );
});

test('listAllPayments rejects when event does not exist', async () => {
  await withStubs(
    {
      findEventById: async () => null
    },
    async () => {
      await assert.rejects(
        () =>
          paymentUseCases.listAllPayments(adminUser, {
            eventId: '550e8400-e29b-41d4-a716-446655440000'
          }),
        (err) => err.code === 'EVENT_NOT_FOUND'
      );
    }
  );
});

test('listAllPayments passes eventId to data access when event exists', async () => {
  let captured;
  await withStubs(
    {
      findEventById: async () => ({ id: '550e8400-e29b-41d4-a716-446655440000' }),
      listAll: async (opts) => {
        captured = opts;
        return [];
      }
    },
    async () => {
      await paymentUseCases.listAllPayments(adminUser, {
        eventId: '550e8400-e29b-41d4-a716-446655440000'
      });
      assert.equal(captured.eventId, '550e8400-e29b-41d4-a716-446655440000');
    }
  );
});
