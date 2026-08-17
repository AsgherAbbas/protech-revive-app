import { getDb, insertActivityLog } from './db.js';

function getPacketTimestamp() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Karachi',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false
  }).formatToParts(new Date()).reduce((result, part) => ({ ...result, [part.type]: part.value }), {});
  return `${parts.year}-${parts.month}-${parts.day} ${parts.hour}:${parts.minute}:${parts.second}`;
}

const DEFAULT_COLLECTIONS = [
  'invoices',
  'attendance',
  'prices',
  'sales',
  'inventory',
  'staffOutput',
  'activityLogs'
];

const PERSISTED_COLLECTIONS = ['invoices', 'attendance', 'prices', 'sales'];

function normalizeCompany(company = 'PROtech') {
  return company === 'Revive' || company === 'revive' ? 'Revive' : 'PROtech';
}

export function assertSupportedCompany(company) {
  if (company !== 'PROtech' && company !== 'protech' && company !== 'Revive' && company !== 'revive') {
    throw new Error('Unsupported company');
  }

  return company === 'Revive' || company === 'revive' ? 'Revive' : 'PROtech';
}

function getStorageKey(company = 'PROtech') {
  return normalizeCompany(company) === 'Revive' ? 'company_revive_data' : 'company_protech_data';
}

export function ensureDashboardStore() {
  global.dashboardData = global.dashboardData || {};
  return global.dashboardData;
}

export function ensureCompanyCollection(company = 'PROtech') {
  const dashboard = ensureDashboardStore();
  const storageKey = getStorageKey(company);

  if (!dashboard[storageKey]) {
    dashboard[storageKey] = {};
  }

  for (const collection of DEFAULT_COLLECTIONS) {
    if (!Array.isArray(dashboard[storageKey][collection])) {
      dashboard[storageKey][collection] = [];
    }
  }

  return dashboard[storageKey];
}

export function getCollection(company, collection) {
  const bucket = ensureCompanyCollection(company);
  return Array.isArray(bucket[collection]) ? bucket[collection] : [];
}

async function ensureAttendanceRecordsTable(db) {
  await new Promise((resolve, reject) => {
    db.run(
      `CREATE TABLE IF NOT EXISTS dashboard_attendance (
        id TEXT NOT NULL,
        company_name TEXT NOT NULL,
        data TEXT NOT NULL,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id, company_name)
      )`,
      (error) => (error ? reject(error) : resolve())
    );
  });
}

export async function getPersistedAttendance(company) {
  const normalizedCompany = normalizeCompany(company);
  const db = await getDb();
  await ensureAttendanceRecordsTable(db);

  const rows = await new Promise((resolve, reject) => {
    db.all(
      'SELECT data FROM dashboard_attendance WHERE company_name = ? ORDER BY updated_at DESC',
      [normalizedCompany],
      (error, result) => (error ? reject(error) : resolve(result || []))
    );
  });

  const records = rows.flatMap(({ data }) => {
    try {
      return [JSON.parse(data)];
    } catch {
      return [];
    }
  });

  ensureCompanyCollection(normalizedCompany).attendance = records;
  return records;
}

export async function persistAttendanceRecord(company, record) {
  const normalizedCompany = normalizeCompany(company);
  const recordId = record?.id || record?._id;
  if (!recordId) {
    throw new Error('Attendance record ID is required');
  }

  const db = await getDb();
  await ensureAttendanceRecordsTable(db);
  await new Promise((resolve, reject) => {
    db.run(
      `INSERT OR REPLACE INTO dashboard_attendance (id, company_name, data, updated_at)
       VALUES (?, ?, ?, CURRENT_TIMESTAMP)`,
      [recordId, normalizedCompany, JSON.stringify(record)],
      (error) => (error ? reject(error) : resolve())
    );
  });
}

export async function deletePersistedAttendance(company, id) {
  const normalizedCompany = normalizeCompany(company);
  const bucket = ensureCompanyCollection(normalizedCompany);
  const existingItem = (bucket.attendance || []).find(
    (item) => String(item.id || item._id) === String(id)
  );
  const db = await getDb();
  await ensureAttendanceRecordsTable(db);

  const changes = await new Promise((resolve, reject) => {
    db.run(
      'DELETE FROM dashboard_attendance WHERE id = ? AND company_name = ?',
      [id, normalizedCompany],
      function onDelete(error) {
        if (error) reject(error);
        else resolve(this.changes);
      }
    );
  });

  bucket.attendance = (bucket.attendance || []).filter(
    (item) => String(item.id || item._id) !== String(id)
  );
  return existingItem || (changes > 0 ? { id } : null);
}

export function upsertCollectionItem(company, collection, record) {
  const bucket = ensureCompanyCollection(company);
  const items = bucket[collection] || [];

  if (!record || (!record.id && !record._id)) {
    const newRecord = { ...record, id: `item-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` };
    items.push(newRecord);
    bucket[collection] = items;
    
    // Persist insert to database for synced collections
    if (PERSISTED_COLLECTIONS.includes(collection)) {
      persistInsertToDatabase(company, collection, newRecord).catch((err) => {
        console.error(`Failed to persist insert for ${collection}:`, err);
      });
    }
    
    return newRecord;
  }

  const recordId = record.id || record._id;
  const itemIndex = items.findIndex((item) => String(item.id || item._id) === String(recordId));

  if (itemIndex >= 0) {
    const updatedRecord = { ...items[itemIndex], ...record, updatedAt: new Date().toISOString() };
    items[itemIndex] = updatedRecord;
    bucket[collection] = items;
    
    // Persist update to database for synced collections
    if (PERSISTED_COLLECTIONS.includes(collection)) {
      persistUpdateToDatabase(company, collection, updatedRecord).catch((err) => {
        console.error(`Failed to persist update for ${collection}:`, err);
      });
    }
    
    return updatedRecord;
  }

  const createdRecord = { ...record, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  items.push(createdRecord);
  bucket[collection] = items;
  
  // Persist insert to database for synced collections
  if (PERSISTED_COLLECTIONS.includes(collection)) {
    persistInsertToDatabase(company, collection, createdRecord).catch((err) => {
      console.error(`Failed to persist insert for ${collection}:`, err);
    });
  }
  
  return createdRecord;
}

async function persistInsertToDatabase(company, collection, record) {
  try {
    const db = await getDb();
    const normalizedCompany = normalizeCompany(company);
    
    if (collection === 'invoices') {
      const itemsJson = JSON.stringify(record.items || []);
      await new Promise((resolve, reject) => {
        db.run(
          `INSERT OR IGNORE INTO invoices 
           (id, company_name, invoice_number, client_name, client_email, client_phone, client_address, 
            invoice_date, due_date, po_number, items, notes, subtotal, tax, tax_rate, total, status, logo,
            invoice_type, attachment_name, attachment_type, attachment_data, created_by, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` ,
          [
            record.id,
            normalizedCompany,
            record.invoiceNumber || '',
            record.clientName || '',
            record.clientEmail || '',
            record.clientPhone || '',
            record.clientAddress || '',
            record.invoiceDate || null,
            record.dueDate || null,
            record.poNumber || '',
            itemsJson,
            record.notes || '',
            record.subtotal || 0,
            record.tax || 0,
            record.taxRate || 5,
            record.total || 0,
            record.status || 'draft',
            record.logo || '',
            record.invoiceType || 'generated',
            record.attachmentName || '',
            record.attachmentType || '',
            record.attachmentData || '',
            record.createdBy || 'System',
            record.createdAt || new Date().toISOString(),
            record.updatedAt || new Date().toISOString()
          ],
          function(err) {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    } else if (collection === 'attendance') {
      await persistAttendanceRecord(company, record);
    }
  } catch (error) {
    console.error('Error persisting insert to database:', error);
  }
}

async function persistUpdateToDatabase(company, collection, record) {
  try {
    const db = await getDb();
    const normalizedCompany = normalizeCompany(company);
    
    if (collection === 'invoices') {
      const itemsJson = JSON.stringify(record.items || []);
      await new Promise((resolve, reject) => {
        db.run(
          `UPDATE invoices SET 
           client_name = ?, client_email = ?, client_phone = ?, client_address = ?,
           invoice_date = ?, due_date = ?, po_number = ?, items = ?, notes = ?,
           subtotal = ?, tax = ?, tax_rate = ?, total = ?, status = ?, logo = ?, invoice_type = ?,
           attachment_name = ?, attachment_type = ?, attachment_data = ?, updated_at = ?
           WHERE id = ? AND company_name = ?`,
          [
            record.clientName || '',
            record.clientEmail || '',
            record.clientPhone || '',
            record.clientAddress || '',
            record.invoiceDate || null,
            record.dueDate || null,
            record.poNumber || '',
            itemsJson,
            record.notes || '',
            record.subtotal || 0,
            record.tax || 0,
            record.taxRate || 5,
            record.total || 0,
            record.status || 'draft',
            record.logo || '',
            record.invoiceType || 'generated',
            record.attachmentName || '',
            record.attachmentType || '',
            record.attachmentData || '',
            new Date().toISOString(),
            record.id,
            normalizedCompany
          ],
          function(err) {
            if (err) reject(err);
            else resolve();
          }
        );
      });
    } else if (collection === 'attendance') {
      await persistAttendanceRecord(company, record);
    }
  } catch (error) {
    console.error('Error persisting update to database:', error);
  }
}

export function deleteCollectionItem(company, collection, id) {
  const bucket = ensureCompanyCollection(company);
  const items = bucket[collection] || [];
  const existingItem = items.find((item) => String(item.id || item._id) === String(id));

  if (!existingItem) {
    return null;
  }

  bucket[collection] = items.filter((item) => String(item.id || item._id) !== String(id));
  
  // Persist delete to database for synced collections
  if (PERSISTED_COLLECTIONS.includes(collection)) {
    persistDeleteToDatabase(company, collection, id).catch((err) => {
      console.error(`Failed to persist delete for ${collection}:`, err);
    });
  }
  
  return existingItem;
}

export async function deletePersistedInvoice(company, id) {
  const normalizedCompany = normalizeCompany(company);
  const bucket = ensureCompanyCollection(normalizedCompany);
  const existingItem = (bucket.invoices || []).find(
    (item) => String(item.id || item._id) === String(id)
  );
  const db = await getDb();

  const changes = await new Promise((resolve, reject) => {
    db.run(
      'DELETE FROM invoices WHERE id = ? AND company_name = ?',
      [id, normalizedCompany],
      function onDelete(error) {
        if (error) reject(error);
        else resolve(this.changes);
      }
    );
  });

  if (!existingItem && changes === 0) {
    return null;
  }

  bucket.invoices = (bucket.invoices || []).filter(
    (item) => String(item.id || item._id) !== String(id)
  );
  return existingItem || { id };
}

async function persistDeleteToDatabase(company, collection, id) {
  try {
    const db = await getDb();
    const normalizedCompany = normalizeCompany(company);
    
    if (collection === 'invoices') {
      await new Promise((resolve, reject) => {
        db.run('DELETE FROM invoices WHERE id = ? AND company_name = ?', [id, normalizedCompany], function(err) {
          if (err) reject(err);
          else resolve();
        });
      });
    }
  } catch (error) {
    console.error('Error persisting delete to database:', error);
  }
}

export async function pushActivityLog({
  company = 'PROtech',
  userName = 'System',
  actionDescription = 'Updated record',
  actionType = 'general',
  details = '',
  status = 'Completed'
} = {}) {
  const bucket = ensureCompanyCollection(company);
  const entry = {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    company: normalizeCompany(company),
    userName,
    actionDescription,
    actionType,
    details,
    status,
    timestamp: new Date().toISOString(),
    createdAt: new Date().toISOString()
  };

  bucket.activityLogs = [entry, ...(bucket.activityLogs || [])].slice(0, 500);
  await insertActivityLog({
    companyName: entry.company,
    userName: entry.userName,
    actionDescription: entry.actionDescription,
    actionType: entry.actionType,
    details: entry.details,
    status: entry.status,
    timestamp: getPacketTimestamp()
  });
  return entry;
}

export { normalizeCompany, getStorageKey };
