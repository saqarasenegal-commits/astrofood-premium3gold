// lib/email.js
import sgMail from '@sendgrid/mail';
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export async function sendEmail({ to, subject, html }) {
  if (!process.env.SENDGRID_API_KEY) {
    console.warn('SENDGRID_API_KEY not set — email not sent.');
    return;
  }
  const msg = {
    to,
    from: process.env.EMAIL_FROM || 'no-reply@yourdomain.com',
    subject,
    html
  };
  return sgMail.send(msg);
}
