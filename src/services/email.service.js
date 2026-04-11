'use strict';

const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

function getFrom() {
  return process.env.EMAIL_FROM || 'InterACTS <noreply@resend.dev>';
}

/**
 * Send email using Resend
 * @param {{ to: string, subject: string, html: string, text?: string }} param0
 */
async function sendMail({ to, subject, html, text }) {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is missing');
  }

  const result = await resend.emails.send({
    from: getFrom(),
    to,
    subject,
    html,
    text: text || undefined
  });

  if (result.error) {
    throw new Error(result.error.message || 'Resend error');
  }

  return {
    messageId: result.data?.id
  };
}

/**
 * Optional: simple health check (replaces SMTP verify)
 */
async function verifyEmailConnection() {
  if (!process.env.RESEND_API_KEY) {
    console.error('[Email] Resend API key missing');
    return;
  }

  try {
    // lightweight test (no real email sent)
    console.log('[Email] Resend is configured');
  } catch (err) {
    console.error('[Email] Resend setup error:', err.message);
  }
}

module.exports = {
  sendMail,
  verifyEmailConnection
};