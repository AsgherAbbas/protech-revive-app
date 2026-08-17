import crypto from 'crypto';
import { getDb } from '../../../../../lib/db';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, company, otp } = body;

    if (!email || !company || !otp) {
      return Response.json({ error: 'Email, company, and OTP are required' }, { status: 400 });
    }

    if (otp.length !== 6 || Number.isNaN(Number(otp))) {
      return Response.json({ error: 'Invalid OTP format' }, { status: 400 });
    }

    const db = await getDb();

    const companyData = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id FROM companies WHERE name = ?',
        [company],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!companyData) {
      return Response.json({ error: 'Invalid company' }, { status: 400 });
    }

    const otpRecord = await new Promise((resolve, reject) => {
      db.get(
        `SELECT otp_code, expires_at FROM otp_tokens
         WHERE email = ? AND company_id = ?`,
        [email, companyData.id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!otpRecord) {
      return Response.json({ error: 'Verification code not found. Request a new code.' }, { status: 400 });
    }

    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime > otpRecord.expires_at) {
      await new Promise((resolve, reject) => {
        db.run(
          'DELETE FROM otp_tokens WHERE email = ? AND company_id = ?',
          [email, companyData.id],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      return Response.json({ error: 'Verification code expired. Request a new code.' }, { status: 400 });
    }

    if (otpRecord.otp_code !== otp) {
      return Response.json({ error: 'Invalid verification code' }, { status: 401 });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpiry = Math.floor(Date.now() / 1000) + 600;

    await new Promise((resolve, reject) => {
      db.run(
        `INSERT OR REPLACE INTO password_reset_tokens (email, company_id, reset_token, expires_at)
         VALUES (?, ?, ?, ?)`,
        [email, companyData.id, resetToken, resetExpiry],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    await new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM otp_tokens WHERE email = ? AND company_id = ?',
        [email, companyData.id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    return Response.json({
      success: true,
      resetToken,
      message: 'OTP verified successfully'
    });
  } catch (error) {
    console.error('Forgot password verify OTP error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
