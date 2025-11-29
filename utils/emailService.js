const nodemailer = require('nodemailer');

let transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

async function sendMail({ to, subject, text, html }) {
  if (!process.env.SMTP_HOST) {
    console.log('Email disabled. Would send to:', to, subject);
    return;
  }
  return transporter.sendMail({ from: process.env.SMTP_USER, to, subject, text, html });
}

async function sendWelcome(user) {
  return sendMail({ to: user.email, subject: 'Welcome', text: `Hello ${user.name}, welcome!` });
}
async function sendRegistration(to, event) {
  return sendMail({ to, subject: `Registered: ${event.title}`, text: `You are registered for ${event.title} at ${event.start}` });
}
async function sendEventUpdated(to, event) {
  return sendMail({ to, subject: `Event updated: ${event.title}`, text: `Event updated. New time: ${event.start}` });
}
async function sendEventCancelled(to, event) {
  return sendMail({ to, subject: `Event cancelled: ${event.title}`, text: `Event ${event.title} has been cancelled` });
}

module.exports = { sendWelcome, sendRegistration, sendEventUpdated, sendEventCancelled };
