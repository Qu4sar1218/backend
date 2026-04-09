const { Payment, Student, User, Event } = require('../../sequelize/models');

const studentIncludeForAdmin = {
  model: Student,
  as: 'student',
  attributes: ['id', 'firstName', 'lastName', 'studentIdNumber', 'email'],
  include: [
    {
      model: User,
      as: 'user',
      attributes: ['id', 'imageUrl']
    }
  ]
};

const eventInclude = {
  model: Event,
  as: 'event',
  attributes: ['id', 'name', 'eventDate', 'startDate', 'endDate', 'timeStart', 'timeEnd', 'status']
};

const toStudentSnippet = (student) => {
  if (!student) return null;
  const s = student.toJSON ? student.toJSON() : student;
  return {
    id: s.id,
    first_name: s.firstName,
    last_name: s.lastName,
    student_id_number: s.studentIdNumber,
    email: s.email,
    user: s.user
      ? {
          id: s.user.id,
          image_url: s.user.imageUrl
        }
      : null
  };
};

const toPaymentResponse = (payment, { includeStudent = false } = {}) => {
  const raw = payment.toJSON();
  const base = {
    id: raw.id,
    student_id: raw.studentId,
    event_id: raw.eventId,
    amount: raw.amount,
    purpose: raw.purpose,
    image_url: raw.imageUrl,
    status: raw.status,
    remarks: raw.remarks,
    created_at: raw.createdAt,
    updated_at: raw.updatedAt
  };
  if (includeStudent && raw.student) {
    base.student = toStudentSnippet(raw.student);
  }
  if (raw.event) {
    base.event = {
      id: raw.event.id,
      name: raw.event.name,
      event_date: raw.event.eventDate,
      start_date: raw.event.startDate,
      end_date: raw.event.endDate,
      time_start: raw.event.timeStart,
      time_end: raw.event.timeEnd,
      status: raw.event.status
    };
  }
  return base;
};

const paymentDataAccess = {
  findStudentByUserId: async (userId) => {
    return Student.findOne({
      where: { userId },
      attributes: ['id', 'userId']
    });
  },

  findEventById: async (eventId) => {
    return Event.findByPk(eventId);
  },

  listByStudentAndEvent: async (studentId, eventId) => {
    return Payment.findAll({
      where: { studentId, eventId },
      order: [['createdAt', 'DESC']]
    });
  },

  hasVerifiedPaymentForStudentEvent: async (studentId, eventId) => {
    const count = await Payment.count({
      where: {
        studentId,
        eventId,
        status: 'verified'
      }
    });
    return count > 0;
  },

  createPayment: async ({ studentId, eventId, amount, purpose, imageUrl }) => {
    const created = await Payment.create({
      studentId,
      eventId,
      amount,
      purpose,
      imageUrl,
      status: 'pending',
      remarks: null
    });
    const withStudent = await Payment.findByPk(created.id, {
      include: [studentIncludeForAdmin, eventInclude]
    });
    return toPaymentResponse(withStudent, { includeStudent: true });
  },

  listByStudentId: async (studentId) => {
    const rows = await Payment.findAll({
      where: { studentId },
      include: [eventInclude],
      order: [['createdAt', 'DESC']]
    });
    return rows.map((p) => toPaymentResponse(p));
  },

  listAll: async ({ status, eventId } = {}) => {
    const where = {};
    if (status && ['pending', 'rejected', 'verified'].includes(status)) {
      where.status = status;
    }
    if (eventId) {
      where.eventId = eventId;
    }
    const rows = await Payment.findAll({
      where,
      include: [studentIncludeForAdmin, eventInclude],
      order: [['createdAt', 'DESC']]
    });
    return rows.map((p) => toPaymentResponse(p, { includeStudent: true }));
  },

  findById: async (id) => {
    return Payment.findByPk(id, {
      include: [studentIncludeForAdmin, eventInclude]
    });
  },

  updatePayment: async (id, { status, remarks }) => {
    const payment = await Payment.findByPk(id, {
      include: [studentIncludeForAdmin, eventInclude]
    });
    if (!payment) return null;
    const updates = {};
    if (status !== undefined) updates.status = status;
    if (remarks !== undefined) updates.remarks = remarks;
    await payment.update(updates);
    await payment.reload({ include: [studentIncludeForAdmin, eventInclude] });
    return toPaymentResponse(payment, { includeStudent: true });
  }
};

paymentDataAccess.toPaymentResponse = toPaymentResponse;

module.exports = paymentDataAccess;
