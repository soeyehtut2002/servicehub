/**
 * emailService.js
 * Sends transactional emails via Gmail SMTP (nodemailer).
 *
 * Required .env variables:
 *   GMAIL_USER=youraddress@gmail.com
 *   GMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx   ← 16-char Google App Password
 *   CLIENT_URL=http://localhost:5173
 *
 * If credentials are missing, emails are skipped with a console warning.
 */

const nodemailer = require('nodemailer');

const ENABLED = !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD);

let transporter;
if (ENABLED) {
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
} else {
  console.warn('⚠️  Email disabled — set GMAIL_USER and GMAIL_APP_PASSWORD in .env to enable');
}

const APP_NAME = 'ServiceHub';
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// ── HTML email wrapper ────────────────────────────────────────────────────────
function wrap(title, body) {
  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
  body{font-family:Arial,sans-serif;background:#0f0e17;color:#fffffe;margin:0;padding:0}
  .container{max-width:600px;margin:40px auto;background:#1a1830;border-radius:12px;overflow:hidden}
  .header{background:linear-gradient(135deg,#6c63ff,#3ecfcf);padding:32px 40px;text-align:center}
  .header h1{color:#fff;margin:0;font-size:24px}
  .body{padding:32px 40px}
  .card{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:20px;margin:20px 0}
  .label{font-size:12px;color:#a89ec9;text-transform:uppercase;letter-spacing:.05em}
  .value{font-size:15px;color:#fffffe;margin:4px 0 12px}
  .btn{display:inline-block;background:#6c63ff;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;margin-top:16px}
  .footer{text-align:center;padding:20px 40px;font-size:12px;color:#a89ec9;border-top:1px solid rgba(255,255,255,.07)}
</style></head>
<body>
  <div class="container">
    <div class="header"><h1>🔧 ${APP_NAME}</h1></div>
    <div class="body">
      <h2 style="color:#fffffe;margin-top:0">${title}</h2>
      ${body}
      <a class="btn" href="${CLIENT_URL}">Open ${APP_NAME}</a>
    </div>
    <div class="footer">© ${new Date().getFullYear()} ${APP_NAME}. You received this because you have an account with us.</div>
  </div>
</body></html>`;
}

// ── Send helper ───────────────────────────────────────────────────────────────
async function send(to, subject, html) {
  if (!ENABLED) return;
  try {
    await transporter.sendMail({
      from: `"${APP_NAME}" <${process.env.GMAIL_USER}>`,
      to, subject, html,
    });
  } catch (err) {
    console.error('Email send error:', err.message);
  }
}

// ── Templates ─────────────────────────────────────────────────────────────────

/** Customer: booking confirmed */
async function bookingConfirmed({ to, customerName, serviceTitle, bookingDate, providerName, bookingId }) {
  const html = wrap('Your Booking is Confirmed! 🎉', `
    <p>Hi ${customerName}, your booking has been received and is awaiting confirmation.</p>
    <div class="card">
      <div class="label">Service</div><div class="value">${serviceTitle}</div>
      <div class="label">Provider</div><div class="value">${providerName}</div>
      <div class="label">Date &amp; Time</div><div class="value">${bookingDate}</div>
      <div class="label">Booking ID</div><div class="value">#${bookingId}</div>
    </div>
    <p style="color:#a89ec9;font-size:14px">You will be notified once the provider confirms your booking.</p>
  `);
  await send(to, `Booking Confirmed — ${serviceTitle}`, html);
}

/** Provider: new booking received */
async function newBookingReceived({ to, providerName, customerName, serviceTitle, bookingDate, bookingId }) {
  const html = wrap('New Booking Request 📅', `
    <p>Hi ${providerName}, you have a new booking request!</p>
    <div class="card">
      <div class="label">Customer</div><div class="value">${customerName}</div>
      <div class="label">Service</div><div class="value">${serviceTitle}</div>
      <div class="label">Date &amp; Time</div><div class="value">${bookingDate}</div>
      <div class="label">Booking ID</div><div class="value">#${bookingId}</div>
    </div>
    <p style="color:#a89ec9;font-size:14px">Log in to confirm or manage this booking.</p>
  `);
  await send(to, `New Booking — ${serviceTitle}`, html);
}

/** Customer: booking status update */
async function bookingStatusUpdated({ to, customerName, serviceTitle, status, bookingDate, bookingId, reason }) {
  const statusLabel = {
    confirmed:  '✅ Confirmed',
    cancelled:  '❌ Cancelled',
    completed:  '🏁 Completed',
    paused:     '⏸️ Paused',
  }[status] || status;

  const html = wrap(`Booking ${statusLabel}`, `
    <p>Hi ${customerName}, the status of your booking has been updated.</p>
    <div class="card">
      <div class="label">Service</div><div class="value">${serviceTitle}</div>
      <div class="label">Date &amp; Time</div><div class="value">${bookingDate}</div>
      <div class="label">New Status</div><div class="value" style="color:#6c63ff;font-weight:700">${statusLabel}</div>
      ${reason ? `<div class="label">Reason</div><div class="value">${reason}</div>` : ''}
      <div class="label">Booking ID</div><div class="value">#${bookingId}</div>
    </div>
  `);
  await send(to, `Booking Update — ${serviceTitle}`, html);
}

/** Provider: customer cancelled */
async function bookingCancelledByCustomer({ to, providerName, customerName, serviceTitle, bookingDate, bookingId, reason }) {
  const html = wrap('Booking Cancelled by Customer', `
    <p>Hi ${providerName}, a customer has cancelled their booking.</p>
    <div class="card">
      <div class="label">Customer</div><div class="value">${customerName}</div>
      <div class="label">Service</div><div class="value">${serviceTitle}</div>
      <div class="label">Date &amp; Time</div><div class="value">${bookingDate}</div>
      ${reason ? `<div class="label">Reason</div><div class="value">${reason}</div>` : ''}
      <div class="label">Booking ID</div><div class="value">#${bookingId}</div>
    </div>
    <p style="color:#a89ec9;font-size:14px">The time slot has been freed up.</p>
  `);
  await send(to, `Booking Cancelled — ${serviceTitle}`, html);
}

/** User: send password reset OTP */
async function sendPasswordResetOtp({ to, userName, otp }) {
  const html = wrap('Password Reset Request 🔑', `
    <p>Hi ${userName},</p>
    <p>We received a request to reset your password. Please use the following 6-digit One-Time Password (OTP) to complete the reset:</p>
    <div class="card" style="text-align:center;padding:20px 0;">
      <div class="label" style="margin-bottom:8px;">Your OTP Code</div>
      <div style="font-size:32px;font-weight:bold;letter-spacing:6px;color:#3ecfcf;margin:8px 0;">${otp}</div>
      <div style="font-size:12px;color:#a89ec9;">This OTP is valid for 15 minutes.</div>
    </div>
    <p>If you did not request this password reset, please ignore this email.</p>
  `);
  await send(to, 'Password Reset OTP — ServiceHub', html);
}

module.exports = {
  bookingConfirmed,
  newBookingReceived,
  bookingStatusUpdated,
  bookingCancelledByCustomer,
  sendPasswordResetOtp,
};
