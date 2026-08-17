import { getDb } from '../../../../lib/db';

export async function POST(request) {
  try {
    const body = await request.json();
    const { name, email, password, company, role, otp } = body;
    const normalizedEmail = (email || '').trim().toLowerCase();

    if (!name || !email || !password || !company || !role || !otp) {
      return Response.json(
        { error: 'All fields including verification code are required' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return Response.json(
        { error: 'Password must be at least 6 characters' },
        { status: 400 }
      );
    }

    if (otp.length !== 6 || isNaN(otp)) {
      return Response.json(
        { error: 'Invalid verification code format' },
        { status: 400 }
      );
    }

    const companyDomains = {
      PROtech: '@protechfzco.ae',
      Revive: '@revivetech.ae'
    };

    const expectedDomain = companyDomains[company];
    if (!normalizedEmail.endsWith(expectedDomain)) {
      return Response.json(
        { error: 'Only official company domain emails are allowed.' },
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

    const otpRecord = await new Promise((resolve, reject) => {
      db.get(
        `SELECT otp_code, expires_at FROM otp_tokens
         WHERE email = ? AND company_id = ?`,
        [normalizedEmail, companyData.id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!otpRecord) {
      return Response.json(
        { error: 'Verification code not found. Please request a new one.' },
        { status: 400 }
      );
    }

    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime > otpRecord.expires_at) {
      await new Promise((resolve, reject) => {
        db.run(
          `DELETE FROM otp_tokens WHERE email = ? AND company_id = ?`,
          [normalizedEmail, companyData.id],
          function(err) {
            if (err) reject(err);
            else resolve();
          }
        );
      });

      return Response.json(
        { error: 'Verification code expired. Please request a new one.' },
        { status: 400 }
      );
    }

    if (otpRecord.otp_code !== otp) {
      return Response.json(
        { error: 'Invalid verification code' },
        { status: 401 }
      );
    }

    const userExists = await new Promise((resolve, reject) => {
      db.get(
        `SELECT id FROM users WHERE email = ? AND company_id = ?`,
        [normalizedEmail, companyData.id],
        (err, row) => {
          if (err) reject(err);
          else resolve(!!row);
        }
      );
    });

    if (userExists) {
      return Response.json(
        { error: 'Email already registered in this company' },
        { status: 409 }
      );
    }

    await new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO users (name, email, password, company_id, role, status)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [name, normalizedEmail, password, companyData.id, role, 'pending'],
        function(err) {
          if (err) reject(err);
          else resolve({ id: this.lastID });
        }
      );
    });

    await new Promise((resolve, reject) => {
      db.run(
        `DELETE FROM otp_tokens WHERE email = ? AND company_id = ?`,
        [normalizedEmail, companyData.id],
        function(err) {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    return Response.json({
      success: true,
      message: 'Account created and pending super admin approval'
    });

  } catch (error) {
    console.error('Registration error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
