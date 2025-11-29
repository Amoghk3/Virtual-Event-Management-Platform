// utils/emailService.js
const nodemailer = require('nodemailer');


const DISABLE_EMAILS = process.env.DISABLE_EMAILS === '1';

if (DISABLE_EMAILS) {
  module.exports = {
    sendMail: async () => Promise.resolve(),
    sendWelcome: async () => Promise.resolve(),
    sendRegistration: async () => Promise.resolve()
  };
} else {
  let transporter = null;
  function getTransporter() {
    if (transporter) return transporter;
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    const port = Number(process.env.SMTP_PORT || 587);
    if (!host || !user || !pass) {
      // No SMTP configured — sendMail will be a no-op
      return null;
    }
    transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: { user, pass }
    });
    return transporter;
  }

  async function sendMail({ to, subject, text, html }) {
    const t = getTransporter();
    if (!t) return Promise.resolve();
    return t.sendMail({
      from: process.env.SMTP_USER,
      to,
      subject,
      text,
      html
    });
  }

  function sendWelcome(user) {
    return sendMail({
      to: user.email,
      subject: 'Welcome!',
      text: `Hi ${user.name || user.email},\n\nWelcome to the platform.\n\nThanks.`
    });
  }

  function sendRegistration(to, ev) {
    return sendMail({
      to,
      subject: `Registered: ${ev.title}`,
      text: `You are registered for ${ev.title} at ${ev.start}`
    });
  }

  module.exports = { sendMail, sendWelcome, sendRegistration };
}
