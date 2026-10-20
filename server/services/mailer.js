import { env, isMailConfigured, isProd } from '../config/env.js';
import { RESET_TTL_MINUTES } from '../utils/resetToken.js';

/** "DreamVerse AI <me@example.com>" or "me@example.com" -> { name, email } */
export function parseSender(from) {
  const text = String(from || '').trim();
  const m = text.match(/^(.*?)\s*<([^<>\s]+)>$/);
  if (m) return { name: m[1].replace(/^"|"$/g, '').trim() || undefined, email: m[2] };
  return { email: text };
}

const escapeHtml = (t) =>
  String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/** Plain text -> simple HTML (Brevo wants an HTML body): escaped, links clickable, line breaks kept. */
export function textToHtml(text) {
  const body = escapeHtml(text)
    .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1">$1</a>')
    .replace(/\r?\n/g, '<br>');
  return `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.5">${body}</div>`;
}

/**
 * Creates the object that sends email. Everything it needs is passed in, so tests can use fakes.
 *  - "brevo": real delivery through Brevo's HTTPS API (works on hosts that block SMTP ports).
 *  - "console": nothing is sent. In development the message is printed in the server terminal;
 *    in production nothing is printed, because logs must never contain working reset links.
 */
export function createMailer({ mail, production, log = console.log, fetchImpl = globalThis.fetch }) {
  const mode = isMailConfigured(mail) ? 'brevo' : 'console';

  async function sendBrevo({ to, subject, text }) {
    let res;
    try {
      res = await fetchImpl('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': mail.brevoApiKey, 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({ sender: parseSender(mail.from), to: [{ email: to }], subject, htmlContent: textToHtml(text), textContent: text }),
        signal: AbortSignal.timeout(15000),
      });
    } catch (err) {
      throw new Error(`Brevo could not be reached: ${err.message}`);
    }
    if (!res.ok) {
      // The provider's own explanation (for example an unverified sender) helps; the key is never in it.
      const detail = (await res.text().catch(() => '')).slice(0, 300);
      throw new Error(`Brevo refused the email (HTTP ${res.status}) ${detail}`.trim());
    }
  }

  async function send(message) {
    if (mode === 'brevo') return sendBrevo(message);
    if (production) {
      log('[mail] Email is not configured, so a message to a user was not sent.');
    } else {
      log(`[mail] Email is not configured, so nothing was sent. Message for ${message.to}:\n${message.subject}\n\n${message.text}`);
    }
    return undefined;
  }

  return { mode, send };
}

let override = null;
let current = null;
export const setMailerForTests = (fake) => {
  override = fake;
};
export const getMailer = () => override || (current ||= createMailer({ mail: env.mail, production: isProd }));
export const mailMode = () => getMailer().mode;

/** What the website may say about delivery: "email", "console" (development only) or "none". */
export const deliveryHint = () => {
  if (mailMode() !== 'console') return 'email';
  return isProd ? 'none' : 'console';
};

/** The reset message. The link is the only secret in it. */
export function buildResetEmail({ name, link, minutes = RESET_TTL_MINUTES }) {
  const first = String(name || '').trim().split(/\s+/)[0] || 'there';
  return {
    subject: 'Reset your DreamVerse AI password',
    text: [
      `Hi ${first},`,
      '',
      `Someone asked to reset the password for your DreamVerse AI account. To choose a new password, open this link within ${minutes} minutes:`,
      '',
      link,
      '',
      'If you did not ask for this, you can ignore this email. Your password will not change.',
    ].join('\n'),
  };
}
