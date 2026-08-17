import { getDb } from '../../../../lib/db';

const SUPER_ADMIN_EMAILS = new Set([
  'boss@protechfzco.ae',
  'boss@revivetech.ae'
]);

const SUPER_ADMIN_ACCOUNTS = [
  { name: 'Boss PROtech', email: 'boss@protechfzco.ae', company: 'PROtech' },
  { name: 'Boss Revive', email: 'boss@revivetech.ae', company: 'Revive' }
];

async function queryOne(db, sql, params) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

async function execute(db, sql, params) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function markUserActiveSession(db, user) {
  const sessionToken = crypto.randomUUID();

  const columns = await new Promise((resolve, reject) => {
    db.all('PRAGMA table_info(login_sessions)', (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });

  const columnNames = new Set(columns.map((column) => column.name));
  const insertPairs = [];

  const pushIfPresent = (column, value, literal = false) => {
    if (columnNames.has(column)) {
      insertPairs.push({ column, value, literal });
    }
  };

  pushIfPresent('user_id', user.id);
  pushIfPresent('session_token', sessionToken);
  pushIfPresent('email', user.email);
  pushIfPresent('company', user.company_name);
  pushIfPresent('user_email', user.email);
  pushIfPresent('company_name', user.company_name);
  pushIfPresent('user_name', user.name);
  pushIfPresent('role', user.role);
  pushIfPresent('login_timestamp', 'CURRENT_TIMESTAMP', true);
  pushIfPresent('last_seen_at', 'CURRENT_TIMESTAMP', true);
  pushIfPresent('logged_out_at', null);
  pushIfPresent('is_active', 1);

  await execute(
    db,
    `UPDATE login_sessions SET is_active = 0 WHERE user_id = ? AND is_active = 1`,
    [user.id]
  );

  const sql = `INSERT INTO login_sessions (${insertPairs.map((pair) => pair.column).join(', ')}) VALUES (${insertPairs.map((pair) => (pair.literal ? pair.value : '?')).join(', ')})`;
  const params = insertPairs.filter((pair) => !pair.literal).map((pair) => pair.value);

  await execute(db, sql, params);

  return sessionToken;
}

async function ensureSuperAdminAccounts(db) {
  for (const account of SUPER_ADMIN_ACCOUNTS) {
    const companyRow = await queryOne(
      db,
      'SELECT id FROM companies WHERE name = ?',
      [account.company]
    );

    if (!companyRow?.id) {
      continue;
    }

    const existing = await queryOne(
      db,
      'SELECT id FROM users WHERE email = ? AND company_id = ?',
      [account.email, companyRow.id]
    );

    if (existing?.id) {
      await execute(
        db,
        'UPDATE users SET name = ?, password = ?, role = ?, status = ? WHERE id = ?',
        [account.name, 'abcd@123', 'super_admin', 'approved', existing.id]
      );
      continue;
    }

    await execute(
      db,
      'INSERT INTO users (name, email, password, company_id, role, status) VALUES (?, ?, ?, ?, ?, ?)',
      [account.name, account.email, 'abcd@123', companyRow.id, 'super_admin', 'approved']
    );
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { email, password, company } = body;
    const normalizedEmail = (email || '').trim().toLowerCase();

    if (!email || !password || !company) {
      return Response.json(
        { error: 'Email, password, and company are required' },
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

    await ensureSuperAdminAccounts(db);

    let user = await queryOne(
      db,
      `SELECT u.id, u.name, u.email, u.password, u.role, u.status, u.company_id, c.name as company_name
       FROM users u
       JOIN companies c ON u.company_id = c.id
       WHERE u.email = ? AND u.company_id = ?`,
      [normalizedEmail, companyData.id]
    );

    if (!user && SUPER_ADMIN_EMAILS.has(normalizedEmail)) {
      user = await queryOne(
        db,
        `SELECT u.id, u.name, u.email, u.password, u.role, u.status, u.company_id, c.name as company_name
         FROM users u
         JOIN companies c ON u.company_id = c.id
         WHERE u.email = ? AND u.role = ?`,
        [normalizedEmail, 'super_admin']
      );
    }

    if (!user) {
      return Response.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    if (user.password !== password) {
      return Response.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }

    const accountStatus = (user.status || '').toLowerCase();
    if (accountStatus === 'pending') {
      return Response.json(
        { error: 'Your account is waiting for Super Admin approval.' },
        { status: 403 }
      );
    }

    if (accountStatus === 'rejected') {
      return Response.json(
        { error: 'Your account has been rejected.' },
        { status: 403 }
      );
    }

    if (accountStatus !== 'approved') {
      return Response.json(
        { error: 'Your account is not approved for login.' },
        { status: 403 }
      );
    }

    const sessionToken = await markUserActiveSession(db, user);

    return Response.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        session_token: sessionToken,
        company_id: user.company_id,
        company_name: user.company_name
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return Response.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
