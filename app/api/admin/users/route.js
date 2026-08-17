import { getDb } from '../../../../lib/db';

const SUPER_ADMIN_EMAILS = new Set([
  'boss@protechfzco.ae',
  'boss@revivetech.ae'
]);

function normalizeEmail(email) {
  return (email || '').trim().toLowerCase();
}

function queryOne(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function queryAll(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

function execute(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function runCallback(err) {
      if (err) reject(err);
      else resolve({ changes: this.changes, lastID: this.lastID });
    });
  });
}

async function isSuperAdminRequest(db, request) {
  const headerEmail = normalizeEmail(request.headers.get('x-user-email'));

  if (SUPER_ADMIN_EMAILS.has(headerEmail)) {
    return true;
  }

  if (!headerEmail) {
    return false;
  }

  const row = await queryOne(
    db,
    `SELECT role FROM users WHERE email = ? ORDER BY id DESC LIMIT 1`,
    [headerEmail]
  );

  return row?.role === 'super_admin';
}

export async function GET(request) {
  try {
    const db = await getDb();

    if (!(await isSuperAdminRequest(db, request))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = (searchParams.get('status') || 'pending').toLowerCase();
    const company = searchParams.get('company');

    const filters = [];
    const params = [];

    if (status && status !== 'all') {
      filters.push('u.status = ?');
      params.push(status);
    }

    if (company && company !== 'ALL') {
      filters.push('c.name = ?');
      params.push(company);
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';

    const users = await queryAll(
      db,
      `SELECT u.id, u.name, u.email, u.role, u.status, u.company_id, c.name as company_name
       FROM users u
       JOIN companies c ON u.company_id = c.id
       ${whereClause}
       ORDER BY u.id DESC`,
      params
    );

    return Response.json({ users });
  } catch (error) {
    console.error('Admin users GET error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request) {
  try {
    const db = await getDb();

    if (!(await isSuperAdminRequest(db, request))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const userId = Number(body.userId);
    const nextStatus = (body.status || '').toLowerCase();

    if (!Number.isInteger(userId) || userId <= 0) {
      return Response.json({ error: 'Invalid userId' }, { status: 400 });
    }

    if (!['approved', 'rejected'].includes(nextStatus)) {
      return Response.json({ error: 'Invalid status transition' }, { status: 400 });
    }

    const existing = await queryOne(
      db,
      `SELECT id, role, status FROM users WHERE id = ?`,
      [userId]
    );

    if (!existing) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    if (existing.role === 'super_admin') {
      return Response.json({ error: 'Cannot modify super admin approval state' }, { status: 400 });
    }

    await execute(
      db,
      `UPDATE users SET status = ? WHERE id = ?`,
      [nextStatus, userId]
    );

    if (nextStatus !== 'approved') {
      await execute(
        db,
        `UPDATE login_sessions SET is_active = 0 WHERE user_id = ? AND is_active = 1`,
        [userId]
      );
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error('Admin users PATCH error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const db = await getDb();

    if (!(await isSuperAdminRequest(db, request))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const userId = Number(body.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
      return Response.json({ error: 'Invalid userId' }, { status: 400 });
    }

    const existing = await queryOne(
      db,
      `SELECT id, role FROM users WHERE id = ?`,
      [userId]
    );

    if (!existing) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    if (existing.role === 'super_admin') {
      return Response.json({ error: 'Cannot delete super admin account' }, { status: 400 });
    }

    await execute(db, `DELETE FROM login_sessions WHERE user_id = ?`, [userId]);
    await execute(db, `DELETE FROM users WHERE id = ?`, [userId]);

    return Response.json({ success: true });
  } catch (error) {
    console.error('Admin users DELETE error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
