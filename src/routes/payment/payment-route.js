const express = require('express');
const multer = require('multer');
const paymentController = require('../../controllers/payment/payment-controller');
const { authenticateToken, authorizeRole } = require('../../middleware/auth');
const { paymentProofUpload } = require('../../config/multer-config');

const router = express.Router();

router.use(authenticateToken);

const handlePaymentUpload = (req, res, next) => {
  paymentProofUpload.single('receipt')(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({
          error: 'File size limit exceeded. Maximum file size allowed is 5MB.'
        });
      }
      return res.status(400).json({ error: err.message });
    }
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
};

router.post('/', authorizeRole(['Student']), handlePaymentUpload, paymentController.create);
router.get('/me', authorizeRole(['Student']), paymentController.listMine);
router.get('/', authorizeRole(['Admin']), paymentController.listAll);
router.get('/:id', paymentController.getById);
router.patch('/:id', authorizeRole(['Admin']), paymentController.update);

module.exports = router;
