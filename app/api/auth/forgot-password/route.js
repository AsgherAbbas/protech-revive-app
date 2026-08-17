import { getDb } from '../../../../lib/db';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, newPassword, company, resetToken } = body;

    if (!email || !newPassword || !company || !resetToken) {
      return Response.json(
        { error: 'Email, new password, company, and reset token are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return Response.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    const db = await getDb();

    const companyData = await new Promise((resolve, reject) => {
      db.get(
        `SELECT id FROM companies WHERE name = ?`,
        [company],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!companyData) {
      return Response.json(
        { error: 'Invalid company' },
        { status: 400 }
      );
    }

    const tokenRecord = await new Promise((resolve, reject) => {
      db.get(
        `SELECT reset_token, expires_at FROM password_reset_tokens
         WHERE email = ? AND company_id = ?`,
        [email, companyData.id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!tokenRecord) {
      return Response.json(
        { error: 'Password reset verification is required. Verify OTP first.' },
        { status: 401 }
      );
    }

    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime > tokenRecord.expires_at) {
      await new Promise((resolve, reject) => {
        db.run(
          'DELETE FROM password_reset_tokens WHERE email = ? AND company_id = ?',
          [email, companyData.id],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      return Response.json(
        { error: 'Reset session expired. Please verify OTP again.' },
        { status: 401 }
      );
    }

    if (tokenRecord.reset_token !== resetToken) {
      return Response.json(
        { error: 'Invalid reset session. Please verify OTP again.' },
        { status: 401 }
      );
    }

    const user = await new Promise((resolve, reject) => {
      db.get(
        `SELECT id FROM users WHERE email = ? AND company_id = ?`,
        [email, companyData.id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!user) {
      return Response.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    await new Promise((resolve, reject) => {
      db.run(
        `UPDATE users SET password = ? WHERE email = ? AND company_id = ?`,
        [newPassword, email, companyData.id],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    await new Promise((resolve, reject) => {
      db.run(
        'DELETE FROM password_reset_tokens WHERE email = ? AND company_id = ?',
        [email, companyData.id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    return Response.json({
      success: true,
      message: 'Password reset successfully'
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
