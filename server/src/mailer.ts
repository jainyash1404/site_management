import nodemailer from 'nodemailer';
import { config } from './config.js';

export const outbox: { to: string; subject: string; text: string }[] = []; // used when SMTP is not configured (and by tests)
const s = config.smtp;
const transport = s ? nodemailer.createTransport({ host: s.host, port: s.port, secure: s.secure, auth: s.user ? { user: s.user, pass: s.pass } : undefined }) : null;

export async function sendMail(to: string, subject: string, text: string): Promise<boolean> {
  if (!transport) {
    outbox.push({ to, subject, text }); if (outbox.length > 50) outbox.shift();
    if (!config.isProd) console.log(`[SMTP not configured – email not sent] To: ${to}\n${text}\n`);
    return false;
  }
  await transport.sendMail({ from: config.mailFrom, to, subject, text });
  return true;
}
