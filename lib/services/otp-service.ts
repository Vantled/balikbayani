// lib/services/otp-service.ts
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../database';
import { EmailService } from './email-service';

interface OtpRequestResult {
  success: boolean;
  error?: string;
  expiresAt?: Date;
  retryAfterSeconds?: number;
}

interface OtpVerificationResult {
  success: boolean;
  verificationToken?: string;
  error?: string;
  remainingAttempts?: number;
}

interface OtpConsumeResult {
  success: boolean;
  error?: string;
}

export class OtpService {
  private static readonly OTP_LENGTH = 6;
  private static readonly OTP_EXPIRY_MINUTES = 10;
  private static readonly RESEND_COOLDOWN_SECONDS = 60;
  private static readonly MAX_ATTEMPTS = 5;

  private static normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private static generateOtp(): string {
    return Array.from({ length: this.OTP_LENGTH }, () =>
      crypto.randomInt(0, 10).toString()
    ).join('');
  }

  private static hashOtp(otp: string): string {
    return crypto.createHash('sha256').update(otp).digest('hex');
  }

  static async requestOtp(rawEmail: string): Promise<OtpRequestResult> {
    try {
      const email = this.normalizeEmail(rawEmail);
      const code = this.generateOtp();
      const otpHash = this.hashOtp(code);
      const now = new Date();
      const expiresAt = new Date(now.getTime() + this.OTP_EXPIRY_MINUTES * 60 * 1000);

      const existing = await db.query(
        'SELECT id, last_sent_at FROM applicant_otps WHERE email = $1',
        [email]
      );

      if (existing.rows.length > 0) {
        const record = existing.rows[0];
        const lastSent = record.last_sent_at ? new Date(record.last_sent_at) : null;

        if (
          lastSent &&
          now.getTime() - lastSent.getTime() <
            this.RESEND_COOLDOWN_SECONDS * 1000
        ) {
          const retryAfterSeconds = Math.ceil(
            (this.RESEND_COOLDOWN_SECONDS * 1000 -
              (now.getTime() - lastSent.getTime())) /
              1000
          );

          return {
            success: false,
            error: `Please wait ${retryAfterSeconds} seconds before requesting another code.`,
            retryAfterSeconds
          };
        }

        await db.query(
          `UPDATE applicant_otps
           SET otp_hash = $1,
               expires_at = $2,
               attempts = 0,
               verified = false,
               verification_token = NULL,
               last_sent_at = $3,
               updated_at = $3,
               consumed_at = NULL
           WHERE id = $4`,
          [otpHash, expiresAt, now, record.id]
        );
      } else {
        await db.query(
          `INSERT INTO applicant_otps (email, otp_hash, expires_at, last_sent_at)
           VALUES ($1, $2, $3, $4)`,
          [email, otpHash, expiresAt, now]
        );
      }

      await EmailService.sendOtpEmail(email, code, expiresAt);

      return {
        success: true,
        expiresAt
      };
    } catch (error) {
      console.error('OTP request error:', error);
      return {
        success: false,
        error: 'Failed to send verification code. Please try again.'
      };
    }
  }

  static async verifyOtp(rawEmail: string, otp: string): Promise<OtpVerificationResult> {
    try {
      const email = this.normalizeEmail(rawEmail);
      const result = await db.query(
        'SELECT * FROM applicant_otps WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        return { success: false, error: 'Please request a verification code first.' };
      }

      const record = result.rows[0];
      const now = new Date();

      if (record.consumed_at) {
        return { success: false, error: 'This verification code has already been used.' };
      }

      if (new Date(record.expires_at) < now) {
        return { success: false, error: 'Your verification code has expired. Please request a new one.' };
      }

      if (record.attempts >= this.MAX_ATTEMPTS) {
        return { success: false, error: 'You have reached the maximum number of attempts. Please request a new code.' };
      }

      const hashedOtp = this.hashOtp(otp);

      if (hashedOtp !== record.otp_hash) {
        const attempts = record.attempts + 1;
        await db.query(
          `UPDATE applicant_otps
           SET attempts = attempts + 1,
               updated_at = $1
           WHERE id = $2`,
          [now, record.id]
        );

        const remainingAttempts = Math.max(this.MAX_ATTEMPTS - attempts, 0);

        return {
          success: false,
          error:
            remainingAttempts > 0
              ? `Invalid code. You have ${remainingAttempts} attempts left.`
              : 'Invalid code entered too many times. Please request a new code.',
          remainingAttempts
        };
      }

      const verificationToken = uuidv4();
      await db.query(
        `UPDATE applicant_otps
         SET verified = true,
             verification_token = $1,
             attempts = 0,
             updated_at = $2
         WHERE id = $3`,
        [verificationToken, now, record.id]
      );

      return { success: true, verificationToken };
    } catch (error) {
      console.error('OTP verification error:', error);
      return {
        success: false,
        error: 'Failed to verify code. Please try again.'
      };
    }
  }

  static async consumeVerificationToken(
    rawEmail: string,
    verificationToken: string
  ): Promise<OtpConsumeResult> {
    try {
      const email = this.normalizeEmail(rawEmail);
      const result = await db.query(
        `SELECT *
         FROM applicant_otps
         WHERE email = $1 AND verification_token = $2`,
        [email, verificationToken]
      );

      if (result.rows.length === 0) {
        return { success: false, error: 'Invalid or expired verification token.' };
      }

      const record = result.rows[0];
      const now = new Date();

      if (!record.verified) {
        return { success: false, error: 'Please verify the OTP code first.' };
      }

      if (record.consumed_at) {
        return { success: false, error: 'Verification token has already been used.' };
      }

      if (new Date(record.expires_at) < now) {
        return { success: false, error: 'Verification token expired. Please restart the verification process.' };
      }

      await db.query(
        `UPDATE applicant_otps
         SET consumed_at = $1,
             updated_at = $1
         WHERE id = $2`,
        [now, record.id]
      );

      return { success: true };
    } catch (error) {
      console.error('OTP consume error:', error);
      return {
        success: false,
        error: 'Unable to validate verification token.'
      };
    }
  }
}

export default OtpService;

