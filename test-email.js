const emailService = require('./services/email.service');

async function test() {
  try {
    const res = await emailService.sendMail({
      to: "abduldbdev@gmail.com", // 👈 PUT YOUR EMAIL HERE
      subject: "Test Email - InterACTS",
      html: "<h1>Test successful ✅</h1><p>Your email system is working.</p>",
      text: "Test successful"
    });

    console.log("✅ Email sent:", res);
  } catch (err) {
    console.error("❌ Email failed:", err.message);
  }
}

test();