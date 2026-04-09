const paymentUseCases = require('../../use-cases/payment/payment-use-cases');

const mapErrorStatus = (error) => {
  if (error.code === 'NOT_FOUND') return 404;
  if (error.code === 'EVENT_NOT_FOUND') return 404;
  if (error.code === 'NO_STUDENT_PROFILE') return 403;
  if (error.code === 'PAYMENT_ALREADY_VERIFIED_FOR_EVENT') return 409;
  if (error.code === 'PAYMENT_PENDING_EXISTS_FOR_EVENT') return 409;
  if (error.message === 'Insufficient permissions') return 403;
  if (error.message === 'Only students can submit payment receipts') return 403;
  if (error.message === 'Only students can list their payments') return 403;
  if (error.message === 'Payment not found') return 404;
  return 400;
};

const paymentController = {
  create: async (req, res) => {
    try {
      const result = await paymentUseCases.createPayment({
        user: req.user,
        amountRaw: req.body.amount,
        purpose: req.body.purpose,
        imageFile: req.file,
        eventId: req.body.event_id
      });
      res.status(201).json(result);
    } catch (error) {
      const status = mapErrorStatus(error);
      res.status(status).json({ error: error.message });
    }
  },

  listMine: async (req, res) => {
    try {
      const rows = await paymentUseCases.listMyPayments(req.user);
      res.status(200).json(rows);
    } catch (error) {
      const status = mapErrorStatus(error);
      res.status(status).json({ error: error.message });
    }
  },

  listAll: async (req, res) => {
    try {
      const statusFilter = req.query.status;
      const eventIdFilter = req.query.event_id;
      const rows = await paymentUseCases.listAllPayments(req.user, {
        status: statusFilter,
        eventId: eventIdFilter
      });
      res.status(200).json(rows);
    } catch (error) {
      const status = mapErrorStatus(error);
      res.status(status).json({ error: error.message });
    }
  },

  getById: async (req, res) => {
    try {
      const row = await paymentUseCases.getPaymentById(req.user, req.params.id);
      res.status(200).json(row);
    } catch (error) {
      const status = mapErrorStatus(error);
      res.status(status).json({ error: error.message });
    }
  },

  update: async (req, res) => {
    try {
      const row = await paymentUseCases.updatePaymentAdmin(req.user, req.params.id, {
        status: req.body.status,
        remarks: req.body.remarks
      });
      res.status(200).json(row);
    } catch (error) {
      const status = mapErrorStatus(error);
      res.status(status).json({ error: error.message });
    }
  }
};

module.exports = paymentController;
