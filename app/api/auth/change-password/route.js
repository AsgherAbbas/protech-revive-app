import { getDb } from '../../../../lib/db';

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, company, currentPassword, newPassword } = body;

    if (!email || !company || !currentPassword || !newPassword) {
      return Response.json(
        { error: 'Email, company, current password, and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return Response.json({ error: 'New password must be at least 6 characters' }, { status: 400 });
    }

    if (currentPassword === newPassword) {
      return Response.json({ error: 'New password must be different from current password' }, { status: 400 });
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
        'SELECT id, password FROM users WHERE email = ? AND company_id = ?',
        [email, companyData.id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });

    if (!user) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.password !== currentPassword) {
      return Response.json({ error: 'Current password is incorrect' }, { status: 401 });
    }

    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE users SET password = ? WHERE id = ?',
        [newPassword, user.id],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });

    return Response.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
