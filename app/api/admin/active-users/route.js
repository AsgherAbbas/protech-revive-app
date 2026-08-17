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

    await execute(
      db,
      `UPDATE login_sessions
       SET is_active = 0
       WHERE is_active = 1
         AND datetime(COALESCE(last_seen_at, login_timestamp)) < datetime('now', '-2 minutes')`,
      []
    );

    const { searchParams } = new URL(request.url);
    const company = searchParams.get('company');
    const companyClause = company && company !== 'ALL' ? ' AND ls.company_name = ?' : '';
    const params = company && company !== 'ALL' ? [company] : [];
    const users = await queryAll(
      db,
      `SELECT ls.id,
              ls.user_id,
              ls.session_token,
              ls.user_email,
              ls.user_name,
              ls.company_name,
              ls.role,
              ls.login_timestamp,
              ls.last_seen_at
       FROM login_sessions ls
       WHERE ls.is_active = 1
         AND datetime(COALESCE(ls.last_seen_at, ls.login_timestamp)) >= datetime('now', '-2 minutes')
         ${companyClause}
       ORDER BY datetime(COALESCE(ls.last_seen_at, ls.login_timestamp)) DESC
       LIMIT 100`,
      params
    );

    return Response.json({ users });
  } catch (error) {
    console.error('Active users GET error:', error);
    return Response.json({ error: 'Internal server error' }, { status: 500 });
  }
}
