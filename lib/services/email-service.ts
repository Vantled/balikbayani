// lib/services/email-service.ts
import nodemailer, { Transporter } from 'nodemailer';

let cachedTransporter: Transporter | null = null;

const isEmailConfigured = () =>
  Boolean(
    process.env.SMTP_HOST &&
    process.env.SMTP_PORT &&
    process.env.SMTP_USER &&
    process.env.SMTP_PASS
  );

async function getTransporter(): Promise<Transporter> {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  if (!isEmailConfigured()) {
    throw new Error('SMTP credentials are not configured');
  }

  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  return cachedTransporter;
}

export class EmailService {
  static async sendOtpEmail(
    recipient: string,
    code: string,
    expiresAt: Date
  ): Promise<void> {
    const formattedExpiry = expiresAt.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });

    const fromAddress =
      process.env.SMTP_FROM ||
      process.env.SMTP_USER ||
      'BalikBayani Portal <no-reply@balikbayani.local>';

    const subject = 'BalikBayani Portal Verification Code';
    const text = [
      'Dear Applicant,',
      '',
      `Your BalikBayani Portal verification code is: ${code}`,
      '',
      'For your security:',
      '- Do not share this code with anyone.',
      '- This code expires in 10 minutes.',
      '- If you did not request this code, please ignore this email.',
      '',
      `Expires at: ${formattedExpiry}`,
      '',
      'BalikBayani Portal Team'
    ].join('\n');

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.5;">
        <p>Dear Applicant,</p>
        <p>Your BalikBayani Portal verification code is:</p>
        <p style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #0f62fe;">${code}</p>
        <p>This code expires in <strong>10 minutes</strong> (expires at ${formattedExpiry}).</p>
        <p style="margin-top: 24px;">For your security:</p>
        <ul>
          <li>Do not share this code with anyone.</li>
          <li>Only enter this code on the official BalikBayani Portal.</li>
          <li>If you did not request this code, please ignore this email.</li>
        </ul>
        <p style="margin-top: 32px;">BalikBayani Portal Team</p>
      </div>
    `;

    if (!isEmailConfigured()) {
      console.warn('[EmailService] SMTP not configured. OTP code logged for debugging only.');
      console.info(`[EmailService] OTP for ${recipient}: ${code}`);
      return;
    }

    const transporter = await getTransporter();
    await transporter.sendMail({
      from: fromAddress,
      to: recipient,
      subject,
      text,
      html
    });
  }
}

export default EmailService;

