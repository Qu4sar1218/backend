const paymentDataAccess = require('../../data-access/payment/payment-data-access');

const isAdmin = (user) => user?.role?.name && String(user.role.name).toLowerCase() === 'admin';
const isStudent = (user) => user?.role?.name && String(user.role.name).toLowerCase() === 'student';
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const parseAmountOptional = (value) => {
  if (value === undefined || value === null || value === '') return 0;
  const n = typeof value === 'number' ? value : parseFloat(String(value).replace(/,/g, ''));
  if (Number.isNaN(n) || n < 0) return 0;
  return n;
};

const paymentUseCases = {
  createPayment: async ({ user, amountRaw, purpose, imageFile, eventId }) => {
    if (!isStudent(user)) {
      throw new Error('Only students can submit payment receipts');
    }
    const student = await paymentDataAccess.findStudentByUserId(user.id);
    if (!student) {
      const err = new Error('Student profile is not linked to this account');
      err.code = 'NO_STUDENT_PROFILE';
      throw err;
    }
    if (!purpose || !String(purpose).trim()) {
      throw new Error('purpose is required');
    }
    if (!imageFile) {
      throw new Error('receipt image is required');
    }
    if (!eventId) {
      throw new Error('event_id is required');
    }
    if (!UUID_REGEX.test(String(eventId))) {
      throw new Error('event_id must be a valid UUID');
    }
    const event = await paymentDataAccess.findEventById(String(eventId));
    if (!event) {
      const err = new Error('Event not found');
      err.code = 'EVENT_NOT_FOUND';
      throw err;
    }
    const existingForEvent = await paymentDataAccess.listByStudentAndEvent(student.id, String(eventId));
    if (existingForEvent.some((p) => p.status === 'verified')) {
      const err = new Error('Payment already verified for this event');
      err.code = 'PAYMENT_ALREADY_VERIFIED_FOR_EVENT';
      throw err;
    }
    if (existingForEvent.some((p) => p.status === 'pending')) {
      const err = new Error('A pending payment already exists for this event');
      err.code = 'PAYMENT_PENDING_EXISTS_FOR_EVENT';
      throw err;
    }
    const amount = parseAmountOptional(amountRaw);
    const imageUrl = `/uploads/paymentproofs/${imageFile.filename}`;
    return paymentDataAccess.createPayment({
      studentId: student.id,
      eventId: String(eventId),
      amount,
      purpose: String(purpose).trim(),
      imageUrl
    });
  },

  listMyPayments: async (user) => {
    if (!isStudent(user)) {
      throw new Error('Only students can list their payments');
    }
    const student = await paymentDataAccess.findStudentByUserId(user.id);
    if (!student) {
      const err = new Error('Student profile is not linked to this account');
      err.code = 'NO_STUDENT_PROFILE';
      throw err;
    }
    return paymentDataAccess.listByStudentId(student.id);
  },

  listAllPayments: async (user, { status, eventId } = {}) => {
    if (!isAdmin(user)) {
      throw new Error('Insufficient permissions');
    }
    if (status && !['pending', 'rejected', 'verified'].includes(status)) {
      throw new Error('Invalid status filter');
    }
    if (eventId !== undefined && eventId !== null && eventId !== '') {
      if (!UUID_REGEX.test(String(eventId))) {
        throw new Error('Invalid event_id filter');
      }
      const event = await paymentDataAccess.findEventById(String(eventId));
      if (!event) {
        const err = new Error('Event not found');
        err.code = 'EVENT_NOT_FOUND';
        throw err;
      }
    }
    return paymentDataAccess.listAll({
      status,
      eventId: eventId ? String(eventId) : undefined
    });
  },

  getPaymentById: async (user, id) => {
    const payment = await paymentDataAccess.findById(id);
    if (!payment) {
      const err = new Error('Payment not found');
      err.code = 'NOT_FOUND';
      throw err;
    }
    if (isAdmin(user)) {
      return paymentDataAccess.toPaymentResponse(payment, { includeStudent: true });
    }
    if (!isStudent(user)) {
      throw new Error('Insufficient permissions');
    }
    const student = await paymentDataAccess.findStudentByUserId(user.id);
    if (!student || payment.studentId !== student.id) {
      throw new Error('Insufficient permissions');
    }
    return paymentDataAccess.toPaymentResponse(payment, { includeStudent: false });
  },

  updatePaymentAdmin: async (user, id, { status, remarks }) => {
    if (!isAdmin(user)) {
      throw new Error('Insufficient permissions');
    }
    const payment = await paymentDataAccess.findById(id);
    if (!payment) {
      const err = new Error('Payment not found');
      err.code = 'NOT_FOUND';
      throw err;
    }
    const updates = {};
    if (status !== undefined) {
      if (!['pending', 'rejected', 'verified'].includes(status)) {
        throw new Error('Invalid status');
      }
      updates.status = status;
    }
    if (remarks !== undefined) {
      updates.remarks = remarks === null || remarks === '' ? null : String(remarks);
    }
    if (Object.keys(updates).length === 0) {
      throw new Error('No valid fields to update');
    }
    return paymentDataAccess.updatePayment(id, updates);
  }
};

module.exports = paymentUseCases;
