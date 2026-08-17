const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

let db = null;

async function getDb() {
  if (db) return db;

  return new Promise((resolve, reject) => {
    const dbDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }

    const dbPath = path.join(dbDir, 'sqlite.db');
    db = new sqlite3.Database(dbPath, async (err) => {
      if (err) {
        reject(err);
      } else {
        try {
          await initializeTables();
          resolve(db);
        } catch (error) {
          reject(error);
        }
      }
    });
  });
}

async function getTableColumns(tableName) {
  return new Promise((resolve, reject) => {
    db.all(`PRAGMA table_info(${tableName})`, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
}

async function ensureTableColumn(tableName, columnName, columnType) {
  const existingColumns = await getTableColumns(tableName);
  if (existingColumns.some((column) => column.name === columnName)) {
    return;
  }

  await new Promise((resolve, reject) => {
    db.run(`ALTER TABLE ${tableName} ADD COLUMN ${columnName} ${columnType}`, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

async function ensureLoginSessionsTable() {
  const columns = await getTableColumns('login_sessions');

  if (columns.length === 0) {
    await new Promise((resolve, reject) => {
      db.run(`
        CREATE TABLE login_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          session_token TEXT,
          email TEXT,
          company TEXT,
          user_email TEXT,
          company_name TEXT,
          user_name TEXT,
          role TEXT,
          login_timestamp DATETIME,
          last_seen_at DATETIME,
          logged_out_at DATETIME,
          is_active INTEGER DEFAULT 1
        );
      `, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  const requiredColumns = [
    ['user_id', 'INTEGER'],
    ['session_token', 'TEXT'],
    ['email', 'TEXT'],
    ['company', 'TEXT'],
    ['user_email', 'TEXT'],
    ['company_name', 'TEXT'],
    ['user_name', 'TEXT'],
    ['role', 'TEXT'],
    ['login_timestamp', 'DATETIME'],
    ['last_seen_at', 'DATETIME'],
    ['logged_out_at', 'DATETIME'],
    ['is_active', 'INTEGER DEFAULT 1']
  ];

  const currentColumns = await getTableColumns('login_sessions');
  const existingNames = new Set(currentColumns.map((column) => column.name));

  for (const [columnName, columnType] of requiredColumns) {
    if (!existingNames.has(columnName)) {
      await ensureTableColumn('login_sessions', columnName, columnType);
    }
  }

  await new Promise((resolve, reject) => {
    db.run(
      `UPDATE login_sessions
       SET email = COALESCE(email, user_email),
           user_email = COALESCE(user_email, email),
           company = COALESCE(company, company_name),
           company_name = COALESCE(company_name, company),
           login_timestamp = COALESCE(login_timestamp, datetime('now')),
           last_seen_at = COALESCE(last_seen_at, login_timestamp)
       WHERE email IS NULL OR company IS NULL OR login_timestamp IS NULL OR last_seen_at IS NULL`,
      (err) => {
        if (err) reject(err);
        else resolve();
      }
    );
  });
}

async function ensureInvoiceAttachmentColumns() {
  const requiredColumns = [
    ['invoice_type', "TEXT DEFAULT 'generated'"],
    ['attachment_name', 'TEXT'],
    ['attachment_type', 'TEXT'],
    ['attachment_data', 'TEXT']
  ];

  for (const [columnName, columnType] of requiredColumns) {
    await ensureTableColumn('invoices', columnName, columnType);
  }
}

async function initializeTables() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(`
        CREATE TABLE IF NOT EXISTS companies (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL UNIQUE
        );
      `, (err) => {
        if (err) reject(err);
      });

      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          email TEXT NOT NULL,
          password TEXT DEFAULT '123456',
          company_id INTEGER NOT NULL,
          role TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'approved',
          UNIQUE(email, company_id),
          FOREIGN KEY (company_id) REFERENCES companies(id)
        );
      `, (err) => {
        if (err) reject(err);
      });

      db.run(`
        CREATE TABLE IF NOT EXISTS otp_tokens (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT NOT NULL,
          company_id INTEGER NOT NULL,
          otp_code TEXT NOT NULL,
          expires_at INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(email, company_id),
          FOREIGN KEY (company_id) REFERENCES companies(id)
        );
      `, (err) => {
        if (err) reject(err);
      });

      db.run(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email TEXT NOT NULL,
          company_id INTEGER NOT NULL,
          reset_token TEXT NOT NULL,
          expires_at INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          UNIQUE(email, company_id),
          FOREIGN KEY (company_id) REFERENCES companies(id)
        );
      `, (err) => {
        if (err) reject(err);
      });

      db.run(`
        CREATE TABLE IF NOT EXISTS prices (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          item_name TEXT NOT NULL,
          price REAL NOT NULL,
          updated_by INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (updated_by) REFERENCES users(id)
        );
      `, (err) => {
        if (err) reject(err);
      });

      db.run(`
        CREATE TABLE IF NOT EXISTS sales (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          company_id INTEGER NOT NULL,
          item_name TEXT NOT NULL,
          quantity INTEGER NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('incoming', 'outgoing')),
          created_by INTEGER,
          date DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES companies(id),
          FOREIGN KEY (created_by) REFERENCES users(id)
        );
      `, (err) => {
        if (err) reject(err);
      });

      db.run(`
        CREATE TABLE IF NOT EXISTS attendance (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          status TEXT NOT NULL CHECK(status IN ('Present', 'Absent')),
          date DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        );
      `, (err) => {
        if (err) reject(err);
      });

      db.run(`
        CREATE TABLE IF NOT EXISTS staff_output (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          task_description TEXT NOT NULL,
          metric_score REAL,
          date DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        );
      `, (err) => {
        if (err) reject(err);
      });

      db.run(`
        CREATE TABLE IF NOT EXISTS invoices (
          id TEXT PRIMARY KEY,
          company_name TEXT NOT NULL,
          invoice_number TEXT NOT NULL,
          client_name TEXT NOT NULL,
          client_email TEXT,
          client_phone TEXT,
          client_address TEXT,
          invoice_date DATE,
          due_date DATE,
          po_number TEXT,
          items TEXT,
          notes TEXT,
          subtotal REAL DEFAULT 0,
          tax REAL DEFAULT 0,
          tax_rate REAL DEFAULT 5,
          total REAL DEFAULT 0,
          status TEXT DEFAULT 'draft',
          logo TEXT,
          invoice_type TEXT DEFAULT 'generated',
          attachment_name TEXT,
          attachment_type TEXT,
          attachment_data TEXT,
          created_by TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
      `, (err) => {
        if (err) reject(err);
      });

      db.run(`
        CREATE TABLE IF NOT EXISTS activity_logs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          company_name TEXT NOT NULL,
          user_name TEXT NOT NULL,
          action_description TEXT NOT NULL,
          status TEXT NOT NULL,
          action_type TEXT,
          details TEXT
        );
      `, (err) => {
        if (err) reject(err);
      });

      db.run(`
        CREATE TABLE IF NOT EXISTS login_sessions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER,
          session_token TEXT,
          email TEXT,
          company TEXT,
          user_email TEXT,
          company_name TEXT,
          user_name TEXT,
          role TEXT,
          login_timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
          last_seen_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          logged_out_at DATETIME,
          is_active INTEGER NOT NULL DEFAULT 1
        );
      `, async (err) => {
        if (err) {
          reject(err);
          return;
        }

        try {
          await ensureLoginSessionsTable();
                  await ensureInvoiceAttachmentColumns();
          await new Promise((resolveUsers, rejectUsers) => {
            db.run(`
              ALTER TABLE users ADD COLUMN password TEXT DEFAULT '123456';
            `, (alterErr) => {
              if (alterErr) {
                // Column already exists, ignore error
              }

              db.run(`
                ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'approved';
              `, (statusErr) => {
                if (statusErr) {
                  // Column already exists, ignore error
                }

                db.run(
                  `UPDATE users
                   SET status = 'approved'
                   WHERE status IS NULL
                      OR TRIM(status) = ''
                      OR LOWER(TRIM(status)) = 'active'`,
                  (updateErr) => {
                    if (updateErr) {
                      rejectUsers(updateErr);
                      return;
                    }
                    resolveUsers();
                  }
                );
              });
            });
          });

          resolve();
        } catch (error) {
          reject(error);
        }
      });
    });
  });
}

function getUserByEmail(email, companyId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT u.id, u.name, u.email, u.password, u.role, u.status, u.company_id, c.name as company_name
       FROM users u
       JOIN companies c ON u.company_id = c.id
       WHERE u.email = ? AND u.company_id = ?`,
      [email, companyId],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
}

function getCompanyByName(name) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT id, name FROM companies WHERE name = ?`,
      [name],
      (err, row) => {
        if (err) reject(err);
        else resolve(row);
      }
    );
  });
}

function createUser(name, email, password, companyId, role) {
  return new Promise((resolve, reject) => {
    db.run(
      `INSERT INTO users (name, email, password, company_id, role) VALUES (?, ?, ?, ?, ?)`,
      [name, email, password, companyId, role],
      function(err) {
        if (err) reject(err);
        else resolve({ id: this.lastID });
      }
    );
  });
}

function checkUserExists(email, companyId) {
  return new Promise((resolve, reject) => {
    db.get(
      `SELECT id FROM users WHERE email = ? AND company_id = ?`,
      [email, companyId],
      (err, row) => {
        if (err) reject(err);
        else resolve(!!row);
      }
    );
  });
}

function updateUserPassword(email, companyId, newPassword) {
  return new Promise((resolve, reject) => {
    db.run(
      `UPDATE users SET password = ? WHERE email = ? AND company_id = ?`,
      [newPassword, email, companyId],
      function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes });
      }
    );
  });
}

function runAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function(err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function getAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

function allAsync(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

async function insertActivityLog({ companyName, userName, actionDescription, status, actionType = null, details = null, timestamp = null }) {
  await getDb();
  return runAsync(
    `INSERT INTO activity_logs (timestamp, company_name, user_name, action_description, status, action_type, details)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [timestamp || new Date().toISOString(), companyName, userName, actionDescription, status, actionType, details]
  );
}

async function listActivityLogs({ companyName = null, limit = 100 } = {}) {
  await getDb();
  const safeLimit = Math.max(1, Math.min(Number(limit) || 100, 500));

  if (companyName) {
    return allAsync(
      `SELECT id, timestamp, company_name, user_name, action_description, status, action_type, details
       FROM activity_logs
       WHERE company_name = ?
       ORDER BY datetime(timestamp) DESC
       LIMIT ?`,
      [companyName, safeLimit]
    );
  }

  return allAsync(
    `SELECT id, timestamp, company_name, user_name, action_description, status, action_type, details
     FROM activity_logs
     ORDER BY datetime(timestamp) DESC
     LIMIT ?`,
    [safeLimit]
  );
}

module.exports = {
  getDb,
  getUserByEmail,
  getCompanyByName,
  createUser,
  checkUserExists,
  updateUserPassword,
  runAsync,
  getAsync,
  allAsync,
  insertActivityLog,
  listActivityLogs
};
