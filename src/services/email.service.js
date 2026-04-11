'use strict';

const nodemailer = require('nodemailer');

let transporter = null;
let verifyPromise = null;
const dns = require("dns");
dns.setDefaultResultOrder("ipv4first");


function getAppPassword() {
  const raw = process.env.GOOGLE_APP_PASS || '';
  return String(raw).replace(/\s+/g, '');
}

function getTransporter() {
  if (transporter) return transporter;

  const user = process.env.SMTP_USER;
  const pass = getAppPassword();

  if (!user || !pass) {
    console.warn('[Email] SMTP_USER or GOOGLE_APP_PASS missing — outbound email disabled');
    return null;
  }

transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  family: 4,
  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
  auth: { user, pass }
});

  return transporter;
}

/** Verify SMTP once at startup (non-blocking). */
function verifySmtpConnection() {
  const t = getTransporter();
  if (!t) return;
  if (verifyPromise) return verifyPromise;

  verifyPromise = t
    .verify()
    .then(() => {
      console.log('[Email] SMTP connection verified (Gmail)');
    })
    .catch((err) => {
      console.error('[Email] SMTP verify failed:', err.message);
    });

  return verifyPromise;
}

/**
 * @param {{ to: string; subject: string; html: string; text?: string; from?: string }} opts
 * @returns {Promise<import('nodemailer').SentMessageInfo>}
 */
async function sendMail({ to, subject, html, text, from }) {
  const t = getTransporter();
  if (!t) {
    throw new Error('Email is not configured (missing SMTP_USER or GOOGLE_APP_PASS)');
  }

  const defaultFrom = process.env.SMTP_FROM || `"InterACTS" <${process.env.SMTP_USER}>`;

  return t.sendMail({
    from: from || defaultFrom,
    to,
    subject,
    html,
    text: text || undefined
  });
}

module.exports = {
  getTransporter,
  verifySmtpConnection,
  sendMail
};
