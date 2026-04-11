const router = require('express').Router();
const emailService = require('../../services/email.service');

router.get('/test', async (req, res) => {
  try {
    const info = await emailService.sendMail({
      to: "abduldbdev@gmail.com",
      subject: "TEST EMAIL - InterACTS",
      html: "<h1>✅ Email System Working</h1>"
    });

    res.json({ success: true, messageId: info.messageId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;