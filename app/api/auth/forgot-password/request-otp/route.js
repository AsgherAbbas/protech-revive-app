import nodemailer from 'nodemailer';
import { getDb } from '../../../../../lib/db';

const companyDomains = {
  PROtech: '@protechfzco.ae',
  Revive: '@revivetech.ae'
};

const mailTransporters = new Map();

function getCompanySmtpConfig(company) {
  if (company === 'PROtech') {
    return {
      host: process.env.PROTECH_SMTP_HOST,
      port: process.env.PROTECH_SMTP_PORT,
      user: process.env.PROTECH_SMTP_USER,
      pass: process.env.PROTECH_SMTP_PASS
    };
  }

  if (company === 'Revive') {
    return {
      host: process.env.REVIVE_SMTP_HOST,
      port: process.env.REVIVE_SMTP_PORT,
      user: process.env.REVIVE_SMTP_USER,
      pass: process.env.REVIVE_SMTP_PASS
    };
  }

  return null;
}

function initializeMailer(company) {
  if (mailTransporters.has(company)) {
    return mailTransporters.get(company);
  }

  const smtpConfig = getCompanySmtpConfig(company);

  if (!smtpConfig?.host || !smtpConfig?.user || !smtpConfig?.pass) {
    return null;
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.titan.email',
    port: 465,
    secure: true,
    auth: {
      user: smtpConfig.user,
      pass: smtpConfig.pass
    }
  });

  mailTransporters.set(company, transporter);
  return transporter;
}

function getFromAddress(company) {
  if (company === 'PROtech') {
    return '"PROtech Support" <support@protechfzco.ae>';
  }

  if (company === 'Revive') {
    return '"Revive Support" <support@revivetech.ae>';
  }

  throw new Error(`Unsupported company: ${company}`);
}

async function sendOtpEmail(email, otp, name, company) {
  const mailer = initializeMailer(company);

  if (!mailer) {
    throw new Error(`SMTP configuration is missing for ${company}`);
  }

  await mailer.sendMail({
    from: getFromAddress(company),
    to: email,
    subject: 'Password Reset Verification Code',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1f2937;">
        <h2 style="margin: 0 0 16px; color: #111827;">Password Reset Verification</h2>
        <p style="margin: 0 0 12px;">Hello ${name || 'User'},</p>
        <p style="margin: 0 0 16px;">Use this 6-digit code to verify your password reset request:</p>
        <div style="background-color: #f3f4f6; border: 1px solid #e5e7eb; padding: 20px; text-align: center; margin: 20px 0; border-radius: 10px;">
          <div style="font-size: 32px; letter-spacing: 8px; font-weight: 700; color: #111827;">${otp}</div>
        </div>
        <p style="margin: 0 0 12px;">This code expires in 10 minutes.</p>
        <p style="margin: 0 0 20px;">If you did not request a password reset, you can safely ignore this email.</p>
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;">
        <p style="margin: 0; color: #6b7280; font-size: 12px;">This is an automated message. Please do not reply.</p>
      </div>
    `
  });
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, company } = body;

    if (!email || !company) {
      return Response.json({ error: 'Email and company are required' }, { status: 400 });
    }

    const expectedDomain = companyDomains[company];
    if (!expectedDomain || !email.endsWith(expectedDomain)) {
      return Response.json({ error: 'Only official company domain emails are allowed.' }, { status: 400 });
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

    const user = await new Promise((resolve, reject) => {
      db.get(
        'SELECT id, name FROM users WHERE email = ? AND company_id = ?',
        [email, companyData.id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!user) {
      return Response.json({ error: 'User not found for this company' }, { status: 404 });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiryTime = Math.floor(Date.now() / 1000) + 600;

    await new Promise((resolve, reject) => {
      db.run(
        `INSERT OR REPLACE INTO otp_tokens (email, company_id, otp_code, expires_at)
         VALUES (?, ?, ?, ?)`,
        [email, companyData.id, otp, expiryTime],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    await sendOtpEmail(email, otp, user.name, company);

    return Response.json({
      success: true,
      message: 'Verification code sent successfully'
    });
  } catch (error) {
    console.error('Forgot password request OTP error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
