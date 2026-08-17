'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';

const DashboardUserContext = createContext(null);
const DashboardDataContext = createContext(null);

const LEGACY_STORAGE_KEY = 'dashboard_live_data_v1';
const SHARED_EVENT_NAME = 'sharedDataEvent';
const STORAGE_KEYS = {
  PROtech: 'company_protech_data',
  Revive: 'company_revive_data'
};

const ENTITY_COLLECTION_KEYS = {
  invoice: 'invoices',
  attendance: 'attendance',
  price: 'prices',
  sales: 'sales',
  inventory: 'inventory',
  staff_output: 'staffOutput'
};

const EMPTY_COMPANY_DATA = {
  invoices: [],
  attendance: [],
  prices: [],
  sales: [],
  inventory: [],
  staffOutput: [],
  activityLogs: []
};

const SQLITE_ACTIVITY_TYPES = new Set([
  'attendance_mark',
  'attendance_update',
  'attendance_delete',
  'price_add',
  'price_update',
  'price_delete',
  'sales_record',
  'sales_update',
  'sales_delete',
  'staff_output_record',
  'staff_output_update',
  'staff_output_delete'
]);

function normalizeCompanyName(companyName) {
  if (companyName === 'Revive' || companyName === 'revive') {
    return 'Revive';
  }

  return 'PROtech';
}

function getSharedCompanyName(companyName) {
  return normalizeCompanyName(companyName) === 'Revive' ? 'revive' : 'protech';
}

function cloneCompanyData(data = EMPTY_COMPANY_DATA) {
  return {
    invoices: Array.isArray(data?.invoices) ? data.invoices : [],
    attendance: Array.isArray(data?.attendance) ? data.attendance : [],
    prices: Array.isArray(data?.prices) ? data.prices : Array.isArray(data?.priceEntries) ? data.priceEntries : [],
    sales: Array.isArray(data?.sales) ? data.sales : Array.isArray(data?.salesEntries) ? data.salesEntries : [],
    inventory: Array.isArray(data?.inventory) ? data.inventory : [],
    staffOutput: Array.isArray(data?.staffOutput) ? data.staffOutput : [],
    activityLogs: Array.isArray(data?.activityLogs) ? data.activityLogs : []
  };
}

function getStorageKey(companyName) {
  return STORAGE_KEYS[normalizeCompanyName(companyName)];
}

function readJsonStorage(key) {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const item = window.localStorage.getItem(key);
    return item ? JSON.parse(item) : null;
  } catch (error) {
    console.error(`Error reading from localStorage (${key}):`, error);
    return null;
  }
}

function writeJsonStorage(key, value) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error(`Error writing to localStorage (${key}):`, error);
  }
}

function areCompanyDataEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function migrateLegacyCompanyData(companyName, legacyStore) {
  const legacyData = legacyStore?.[normalizeCompanyName(companyName)];
  return cloneCompanyData(legacyData);
}

function getInitialCompanyData(companyName, legacyStore) {
  const storedData = readJsonStorage(getStorageKey(companyName));
  if (storedData && typeof storedData === 'object') {
    return cloneCompanyData(storedData);
  }

  return migrateLegacyCompanyData(companyName, legacyStore);
}

function buildLegacyStore(protechData, reviveData) {
  return {
    PROtech: {
      invoices: protechData.invoices,
      attendance: protechData.attendance,
      prices: protechData.prices,
      priceEntries: protechData.prices,
      sales: protechData.sales,
      salesEntries: protechData.sales,
      inventory: protechData.inventory,
      staffOutput: protechData.staffOutput,
      activityLogs: protechData.activityLogs
    },
    Revive: {
      invoices: reviveData.invoices,
      attendance: reviveData.attendance,
      prices: reviveData.prices,
      priceEntries: reviveData.prices,
      sales: reviveData.sales,
      salesEntries: reviveData.sales,
      inventory: reviveData.inventory,
      staffOutput: reviveData.staffOutput,
      activityLogs: reviveData.activityLogs
    }
  };
}

function createRecordId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function applyNextValue(currentValue, nextValue) {
  return typeof nextValue === 'function' ? nextValue(currentValue) : nextValue;
}

function buildCrudActions(companyName, collectionKey, options, mutateCompanyData, addActivityLog) {
  const { idPrefix, timestampField, buildCreatedLog, buildUpdatedLog, buildDeletedLog } = options;

  const add = (payload) => {
    const record = {
      ...payload,
      id: createRecordId(idPrefix),
      ...(timestampField ? { [timestampField]: new Date().toISOString() } : {})
    };

    mutateCompanyData(companyName, (current) => ({
      ...current,
      [collectionKey]: [record, ...current[collectionKey]]
    }));

    if (buildCreatedLog) {
      addActivityLog(companyName, buildCreatedLog(record, payload));
    }

    return record;
  };

  const update = (id, updates) => {
    let previousRecord = null;

    mutateCompanyData(companyName, (current) => ({
      ...current,
      [collectionKey]: current[collectionKey].map((record) => {
        if (record.id !== id) {
          return record;
        }

        previousRecord = record;
        return { ...record, ...updates };
      })
    }));

    if (previousRecord && buildUpdatedLog) {
      addActivityLog(companyName, buildUpdatedLog(previousRecord, updates));
    }
  };

  const remove = (id) => {
    let removedRecord = null;

    mutateCompanyData(companyName, (current) => ({
      ...current,
      [collectionKey]: current[collectionKey].filter((record) => {
        if (record.id === id) {
          removedRecord = record;
          return false;
        }

        return true;
      })
    }));

    if (removedRecord && buildDeletedLog) {
      addActivityLog(companyName, buildDeletedLog(removedRecord));
    }
  };

  return { add, update, remove };
}

function getDashboardStatsFromData(data) {
  return {
    totalInvoices: data.invoices.length,
    approvedInvoices: data.invoices.filter((item) => item.status === 'approved').reduce((sum, item) => sum + (Number(item.amount) || 0), 0),
    totalAttendance: data.attendance.length,
    presentToday: data.attendance.filter((item) => item.status === 'present').length,
    totalSales: data.sales.length,
    completedSales: data.sales.filter((item) => item.status === 'completed').length,
    totalSalesValue: data.sales.filter((item) => item.status === 'completed').reduce((sum, item) => sum + (Number(item.totalValue) || 0), 0),
    activeProducts: data.prices.filter((item) => item.status === 'active').length,
    activityLogs: data.activityLogs
  };
}

export function DashboardUserProvider({ user, children }) {
  return <DashboardUserContext.Provider value={user}>{children}</DashboardUserContext.Provider>;
}

export function DashboardProviders({ user, children }) {
  return (
    <DashboardUserProvider user={user}>
      <DashboardDataProvider user={user}>{children}</DashboardDataProvider>
    </DashboardUserProvider>
  );
}

export function DashboardDataProvider({ user, children }) {
  const [protechData, setProtechData] = useState(EMPTY_COMPANY_DATA);
  const [reviveData, setReviveData] = useState(EMPTY_COMPANY_DATA);
  const [hydrated, setHydrated] = useState(false);
  const subscribersRef = useRef({
    PROtech: new Set(),
    Revive: new Set()
  });

  useEffect(() => {
    const legacyStore = readJsonStorage(LEGACY_STORAGE_KEY);
    setProtechData(getInitialCompanyData('PROtech', legacyStore));
    setReviveData(getInitialCompanyData('Revive', legacyStore));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    writeJsonStorage(STORAGE_KEYS.PROtech, protechData);
    writeJsonStorage(STORAGE_KEYS.Revive, reviveData);
    writeJsonStorage(LEGACY_STORAGE_KEY, buildLegacyStore(protechData, reviveData));
  }, [hydrated, protechData, reviveData]);

  useEffect(() => {
    if (!hydrated) {
      return;
    }

    const handleStorage = (event) => {
      try {
        if (event.key === STORAGE_KEYS.PROtech && event.newValue) {
          const nextData = cloneCompanyData(JSON.parse(event.newValue));
          setProtechData((current) => (areCompanyDataEqual(current, nextData) ? current : nextData));
          return;
        }

        if (event.key === STORAGE_KEYS.Revive && event.newValue) {
          const nextData = cloneCompanyData(JSON.parse(event.newValue));
          setReviveData((current) => (areCompanyDataEqual(current, nextData) ? current : nextData));
          return;
        }

        if (event.key === LEGACY_STORAGE_KEY && event.newValue) {
          const legacyStore = JSON.parse(event.newValue);
          const nextProtechData = migrateLegacyCompanyData('PROtech', legacyStore);
          const nextReviveData = migrateLegacyCompanyData('Revive', legacyStore);
          setProtechData((current) => (areCompanyDataEqual(current, nextProtechData) ? current : nextProtechData));
          setReviveData((current) => (areCompanyDataEqual(current, nextReviveData) ? current : nextReviveData));
        }
      } catch (error) {
        console.error('Error syncing dashboard data:', error);
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      window.removeEventListener('storage', handleStorage);
    };
  }, [hydrated]);

  const mutateCompanyData = useCallback((companyName, updater) => {
    const normalizedCompany = normalizeCompanyName(companyName);
    const setCompanyData = normalizedCompany === 'Revive' ? setReviveData : setProtechData;
    setCompanyData((current) => cloneCompanyData(updater(current)));
  }, []);

  const notifySubscribers = useCallback((companyName, data) => {
    const normalizedCompany = normalizeCompanyName(companyName);
    subscribersRef.current[normalizedCompany].forEach((callback) => {
      callback(data);
    });
  }, []);

  const persistActivityLog = useCallback(async (companyName, logEntry) => {
    if (!logEntry || !SQLITE_ACTIVITY_TYPES.has(logEntry.actionType)) {
      return;
    }

    try {
      await fetch('/api/activity-logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: normalizeCompanyName(companyName),
          userName: logEntry.userName || user?.name || 'Unknown User',
          actionDescription: logEntry.action || 'Activity updated',
          status: logEntry.status || 'Completed',
          actionType: logEntry.actionType,
          details: logEntry.details || ''
        })
      });
    } catch (error) {
      console.error('Failed to persist activity log:', error);
    }
  }, [user?.name]);

  useEffect(() => {
    if (hydrated) {
      notifySubscribers('PROtech', protechData);
    }
  }, [hydrated, notifySubscribers, protechData]);

  useEffect(() => {
    if (hydrated) {
      notifySubscribers('Revive', reviveData);
    }
  }, [hydrated, notifySubscribers, reviveData]);

  const addActivityLog = useCallback((companyName, log) => {
    const normalizedCompany = normalizeCompanyName(companyName);
    mutateCompanyData(companyName, (current) => ({
      ...current,
      activityLogs: [
        {
          ...log,
          id: createRecordId('log'),
          timestamp: new Date().toISOString(),
          company: normalizedCompany
        },
        ...current.activityLogs
      ].slice(0, 500)
    }));

    persistActivityLog(normalizedCompany, log);
  }, [mutateCompanyData, persistActivityLog]);

  const applySharedEvent = useCallback((event) => {
    if (!event) {
      return;
    }

    const normalizedCompany = normalizeCompanyName(event.company);
    const collectionKey = ENTITY_COLLECTION_KEYS[event.entityType];

    if (!collectionKey) {
      return;
    }

    mutateCompanyData(normalizedCompany, (current) => {
      const payload = event.payload || {};
      let nextCollection = current[collectionKey];

      if (event.action === 'ADD' && payload.record) {
        nextCollection = [payload.record, ...current[collectionKey]];
      }

      if (event.action === 'UPDATE' && payload.id) {
        nextCollection = current[collectionKey].map((record) =>
          record.id === payload.id ? { ...record, ...payload.updates } : record
        );
      }

      if (event.action === 'DELETE' && payload.id) {
        nextCollection = current[collectionKey].filter((record) => record.id !== payload.id);
      }

      return {
        ...current,
        [collectionKey]: nextCollection,
        activityLogs: payload.logEntry ? [payload.logEntry, ...current.activityLogs].slice(0, 500) : current.activityLogs
      };
    });

    if (payload.logEntry) {
      persistActivityLog(normalizedCompany, payload.logEntry);
    }
  }, [mutateCompanyData, persistActivityLog]);

  useEffect(() => {
    if (!hydrated || typeof window === 'undefined') {
      return;
    }

    const handleSharedEvent = (event) => {
      applySharedEvent(event.detail);
    };

    window.addEventListener(SHARED_EVENT_NAME, handleSharedEvent);

    return () => {
      window.removeEventListener(SHARED_EVENT_NAME, handleSharedEvent);
    };
  }, [applySharedEvent, hydrated]);

  const setCollection = useCallback((companyName, collectionKey, nextValue) => {
    mutateCompanyData(companyName, (current) => ({
      ...current,
      [collectionKey]: applyNextValue(current[collectionKey], nextValue)
    }));
  }, [mutateCompanyData]);

  const subscribe = useCallback((companyName, callback) => {
    const normalizedCompany = normalizeCompanyName(companyName);
    subscribersRef.current[normalizedCompany].add(callback);

    return () => {
      subscribersRef.current[normalizedCompany].delete(callback);
    };
  }, []);

  const broadcast = useCallback((event) => {
    if (typeof window === 'undefined') {
      applySharedEvent(event);
      return;
    }

    window.dispatchEvent(new CustomEvent(SHARED_EVENT_NAME, { detail: event }));
  }, [applySharedEvent]);

  const activeCompany = normalizeCompanyName(user?.company_name);
  const activeCompanyData = activeCompany === 'Revive' ? reviveData : protechData;
  const getCompanyData = useCallback((companyName) => {
    return normalizeCompanyName(companyName) === 'Revive' ? reviveData : protechData;
  }, [protechData, reviveData]);

  const createSharedLog = useCallback((companyName, userId, userName, action, actionType, details, recordId) => ({
    id: createRecordId('log'),
    timestamp: new Date().toISOString(),
    userId,
    userName,
    company: getSharedCompanyName(companyName),
    action,
    actionType,
    details,
    recordId
  }), []);

  const setInvoices = useCallback((nextValue) => setCollection(activeCompany, 'invoices', nextValue), [activeCompany, setCollection]);
  const setAttendance = useCallback((nextValue) => setCollection(activeCompany, 'attendance', nextValue), [activeCompany, setCollection]);
  const setPrices = useCallback((nextValue) => setCollection(activeCompany, 'prices', nextValue), [activeCompany, setCollection]);
  const setSales = useCallback((nextValue) => setCollection(activeCompany, 'sales', nextValue), [activeCompany, setCollection]);
  const setInventory = useCallback((nextValue) => setCollection(activeCompany, 'inventory', nextValue), [activeCompany, setCollection]);
  const setStaffOutput = useCallback((nextValue) => setCollection(activeCompany, 'staffOutput', nextValue), [activeCompany, setCollection]);

  const addProtechInvoice = useMemo(() => buildCrudActions('PROtech', 'invoices', {
    idPrefix: 'inv',
    timestampField: 'uploadedAt',
    buildCreatedLog: (record) => ({ userId: record.uploadedBy, userName: record.uploadedBy, module: 'admin', action: `Uploaded invoice ${record.invoiceNumber}`, actionType: 'invoice_upload', details: `${record.vendor} - AED ${record.amount}`, recordId: record.id }),
    buildUpdatedLog: (record, updates) => ({ userId: updates.uploadedBy || record.uploadedBy, userName: updates.uploadedBy || record.uploadedBy, module: 'admin', action: `Updated invoice ${record.invoiceNumber}`, actionType: 'invoice_update', details: `Status: ${updates.status || record.status}`, recordId: record.id }),
    buildDeletedLog: (record) => ({ userId: 'admin', userName: 'Admin', module: 'admin', action: `Deleted invoice ${record.invoiceNumber}`, actionType: 'invoice_delete', details: record.vendor, recordId: record.id })
  }, mutateCompanyData, addActivityLog), [addActivityLog, mutateCompanyData]);

  const addProtechAttendance = useMemo(() => buildCrudActions('PROtech', 'attendance', {
    idPrefix: 'att',
    timestampField: 'recordedAt',
    buildCreatedLog: (record) => ({ userId: record.recordedBy, userName: record.recordedBy, module: 'admin', action: `Marked attendance for ${record.employeeName}`, actionType: 'attendance_mark', details: record.status, recordId: record.id }),
    buildUpdatedLog: (record, updates) => ({ userId: updates.recordedBy || record.recordedBy, userName: updates.recordedBy || record.recordedBy, module: 'admin', action: `Updated attendance for ${record.employeeName}`, actionType: 'attendance_update', details: updates.status || record.status, recordId: record.id }),
    buildDeletedLog: (record) => ({ userId: 'admin', userName: 'Admin', module: 'admin', action: `Deleted attendance for ${record.employeeName}`, actionType: 'attendance_delete', details: record.date, recordId: record.id })
  }, mutateCompanyData, addActivityLog), [addActivityLog, mutateCompanyData]);

  const addProtechPrice = useMemo(() => buildCrudActions('PROtech', 'prices', {
    idPrefix: 'price',
    buildCreatedLog: (record) => ({ userId: record.updatedBy, userName: record.updatedBy, module: 'price_manager', action: `Added price for ${record.productName}`, actionType: 'price_add', details: `AED ${record.newPrice}`, recordId: record.id }),
    buildUpdatedLog: (record, updates) => ({ userId: updates.updatedBy || record.updatedBy, userName: updates.updatedBy || record.updatedBy, module: 'price_manager', action: `Updated price for ${record.productName}`, actionType: 'price_update', details: `AED ${record.currentPrice} -> AED ${updates.newPrice || record.newPrice}`, recordId: record.id }),
    buildDeletedLog: (record) => ({ userId: 'admin', userName: 'Admin', module: 'price_manager', action: `Deleted price for ${record.productName}`, actionType: 'price_delete', details: `SKU: ${record.sku}`, recordId: record.id })
  }, mutateCompanyData, addActivityLog), [addActivityLog, mutateCompanyData]);

  const addProtechSales = useMemo(() => buildCrudActions('PROtech', 'sales', {
    idPrefix: 'sales',
    timestampField: 'recordedAt',
    buildCreatedLog: (record) => ({ userId: record.recordedBy, userName: record.salesperson, module: 'sales_manager', action: `Recorded ${record.type} sale for ${record.productName}`, actionType: 'sales_record', details: `${record.quantity} units - AED ${record.totalValue}`, recordId: record.id }),
    buildUpdatedLog: (record, updates) => ({ userId: updates.recordedBy || record.recordedBy, userName: record.salesperson, module: 'sales_manager', action: `Updated sales for ${record.productName}`, actionType: 'sales_update', details: `Status: ${updates.status || record.status}`, recordId: record.id }),
    buildDeletedLog: (record) => ({ userId: 'admin', userName: 'Admin', module: 'sales_manager', action: `Deleted sales for ${record.productName}`, actionType: 'sales_delete', details: `${record.quantity} units`, recordId: record.id })
  }, mutateCompanyData, addActivityLog), [addActivityLog, mutateCompanyData]);

  const addReviveInvoice = useMemo(() => buildCrudActions('Revive', 'invoices', {
    idPrefix: 'inv',
    timestampField: 'uploadedAt',
    buildCreatedLog: (record) => ({ userId: record.uploadedBy, userName: record.uploadedBy, module: 'admin', action: `Uploaded invoice ${record.invoiceNumber}`, actionType: 'invoice_upload', details: `${record.vendor} - AED ${record.amount}`, recordId: record.id }),
    buildUpdatedLog: (record, updates) => ({ userId: updates.uploadedBy || record.uploadedBy, userName: updates.uploadedBy || record.uploadedBy, module: 'admin', action: `Updated invoice ${record.invoiceNumber}`, actionType: 'invoice_update', details: `Status: ${updates.status || record.status}`, recordId: record.id }),
    buildDeletedLog: (record) => ({ userId: 'admin', userName: 'Admin', module: 'admin', action: `Deleted invoice ${record.invoiceNumber}`, actionType: 'invoice_delete', details: record.vendor, recordId: record.id })
  }, mutateCompanyData, addActivityLog), [addActivityLog, mutateCompanyData]);

  const addReviveAttendance = useMemo(() => buildCrudActions('Revive', 'attendance', {
    idPrefix: 'att',
    timestampField: 'recordedAt',
    buildCreatedLog: (record) => ({ userId: record.recordedBy, userName: record.recordedBy, module: 'admin', action: `Marked attendance for ${record.employeeName}`, actionType: 'attendance_mark', details: record.status, recordId: record.id }),
    buildUpdatedLog: (record, updates) => ({ userId: updates.recordedBy || record.recordedBy, userName: updates.recordedBy || record.recordedBy, module: 'admin', action: `Updated attendance for ${record.employeeName}`, actionType: 'attendance_update', details: updates.status || record.status, recordId: record.id }),
    buildDeletedLog: (record) => ({ userId: 'admin', userName: 'Admin', module: 'admin', action: `Deleted attendance for ${record.employeeName}`, actionType: 'attendance_delete', details: record.date, recordId: record.id })
  }, mutateCompanyData, addActivityLog), [addActivityLog, mutateCompanyData]);

  const addReviveSales = useMemo(() => buildCrudActions('Revive', 'sales', {
    idPrefix: 'sales',
    timestampField: 'recordedAt',
    buildCreatedLog: (record) => ({ userId: record.recordedBy, userName: record.salesperson, module: 'sales_inventory', action: `Recorded ${record.type} sale for ${record.productName}`, actionType: 'sales_record', details: `${record.quantity} units - AED ${record.totalValue}`, recordId: record.id }),
    buildUpdatedLog: (record, updates) => ({ userId: updates.recordedBy || record.recordedBy, userName: record.salesperson, module: 'sales_inventory', action: `Updated sales for ${record.productName}`, actionType: 'sales_update', details: `Status: ${updates.status || record.status}`, recordId: record.id }),
    buildDeletedLog: (record) => ({ userId: 'admin', userName: 'Admin', module: 'sales_inventory', action: `Deleted sales for ${record.productName}`, actionType: 'sales_delete', details: `${record.quantity} units`, recordId: record.id })
  }, mutateCompanyData, addActivityLog), [addActivityLog, mutateCompanyData]);

  const addReviveInventory = useMemo(() => buildCrudActions('Revive', 'inventory', {
    idPrefix: 'inventory',
    timestampField: 'updatedAt',
    buildCreatedLog: (record) => ({ userId: record.updatedBy, userName: record.updatedBy, module: 'sales_inventory', action: `Recorded ${record.type} inventory for ${record.productName}`, actionType: 'inventory_record', details: `${record.quantity} units - AED ${record.totalValue}`, recordId: record.id }),
    buildUpdatedLog: (record, updates) => ({ userId: updates.updatedBy || record.updatedBy, userName: updates.updatedBy || record.updatedBy, module: 'sales_inventory', action: `Updated inventory for ${record.productName}`, actionType: 'inventory_update', details: `Status: ${updates.status || record.status}`, recordId: record.id }),
    buildDeletedLog: (record) => ({ userId: 'admin', userName: 'Admin', module: 'sales_inventory', action: `Deleted inventory for ${record.productName}`, actionType: 'inventory_delete', details: `${record.quantity} units`, recordId: record.id })
  }, mutateCompanyData, addActivityLog), [addActivityLog, mutateCompanyData]);

  const addReviveStaffOutput = useMemo(() => buildCrudActions('Revive', 'staffOutput', {
    idPrefix: 'output',
    timestampField: 'recordedAt',
    buildCreatedLog: (record) => ({ userId: record.recordedBy, userName: record.recordedBy, module: 'staff_manager', action: `Recorded output for ${record.staffName}`, actionType: 'staff_output_record', details: `${record.tasksCompleted} tasks - Quality: ${record.qualityScore}%`, recordId: record.id }),
    buildUpdatedLog: (record, updates) => ({ userId: updates.recordedBy || record.recordedBy, userName: updates.recordedBy || record.recordedBy, module: 'staff_manager', action: `Updated output for ${record.staffName}`, actionType: 'staff_output_update', details: `Status: ${updates.status || record.status}`, recordId: record.id }),
    buildDeletedLog: (record) => ({ userId: 'admin', userName: 'Admin', module: 'staff_manager', action: `Deleted output for ${record.staffName}`, actionType: 'staff_output_delete', details: record.date, recordId: record.id })
  }, mutateCompanyData, addActivityLog), [addActivityLog, mutateCompanyData]);

  const clearActivityLogs = useCallback((companyName) => {
    mutateCompanyData(companyName, (current) => ({ ...current, activityLogs: [] }));
  }, [mutateCompanyData]);

  const addInvoice = useCallback((companyName, invoice, userId, userName) => {
    const record = {
      ...invoice,
      id: createRecordId('inv'),
      uploadedAt: new Date().toISOString(),
      uploadedBy: invoice.uploadedBy || userName
    };

    broadcast({
      id: createRecordId('evt'),
      company: getSharedCompanyName(companyName),
      entityType: 'invoice',
      action: 'ADD',
      payload: {
        record,
        logEntry: createSharedLog(companyName, userId, userName, `Uploaded invoice ${record.invoiceNumber}`, 'invoice_upload', `${record.vendor} - AED ${record.amount}`, record.id)
      },
      userId,
      userName,
      timestamp: new Date().toISOString()
    });
  }, [broadcast, createSharedLog]);

  const updateInvoice = useCallback((companyName, id, updates, userId, userName) => {
    const invoice = getCompanyData(companyName).invoices.find((item) => item.id === id);
    if (!invoice) {
      return;
    }

    broadcast({
      id: createRecordId('evt'),
      company: getSharedCompanyName(companyName),
      entityType: 'invoice',
      action: 'UPDATE',
      payload: {
        id,
        updates,
        logEntry: createSharedLog(companyName, userId, userName, `Updated invoice ${invoice.invoiceNumber}`, 'invoice_update', `Status: ${updates.status || invoice.status}`, id)
      },
      userId,
      userName,
      timestamp: new Date().toISOString()
    });
  }, [broadcast, createSharedLog, getCompanyData]);

  const deleteInvoice = useCallback((companyName, id, userId, userName) => {
    const invoice = getCompanyData(companyName).invoices.find((item) => item.id === id);
    if (!invoice) {
      return;
    }

    broadcast({
      id: createRecordId('evt'),
      company: getSharedCompanyName(companyName),
      entityType: 'invoice',
      action: 'DELETE',
      payload: {
        id,
        logEntry: createSharedLog(companyName, userId, userName, `Deleted invoice ${invoice.invoiceNumber}`, 'invoice_delete', invoice.vendor, id)
      },
      userId,
      userName,
      timestamp: new Date().toISOString()
    });
  }, [broadcast, createSharedLog, getCompanyData]);

  const addAttendance = useCallback((companyName, attendance, userId, userName) => {
    const record = {
      ...attendance,
      id: createRecordId('att'),
      recordedAt: new Date().toISOString(),
      recordedBy: attendance.recordedBy || userName
    };

    broadcast({
      id: createRecordId('evt'),
      company: getSharedCompanyName(companyName),
      entityType: 'attendance',
      action: 'ADD',
      payload: {
        record,
        logEntry: createSharedLog(companyName, userId, userName, `Marked attendance for ${record.employeeName}`, 'attendance_mark', record.status, record.id)
      },
      userId,
      userName,
      timestamp: new Date().toISOString()
    });
  }, [broadcast, createSharedLog]);

  const updateAttendance = useCallback((companyName, id, updates, userId, userName) => {
    const attendance = getCompanyData(companyName).attendance.find((item) => item.id === id);
    if (!attendance) {
      return;
    }

    broadcast({
      id: createRecordId('evt'),
      company: getSharedCompanyName(companyName),
      entityType: 'attendance',
      action: 'UPDATE',
      payload: {
        id,
        updates,
        logEntry: createSharedLog(companyName, userId, userName, `Updated attendance for ${attendance.employeeName}`, 'attendance_update', updates.status || attendance.status, id)
      },
      userId,
      userName,
      timestamp: new Date().toISOString()
    });
  }, [broadcast, createSharedLog, getCompanyData]);

  const deleteAttendance = useCallback((companyName, id, userId, userName) => {
    const attendance = getCompanyData(companyName).attendance.find((item) => item.id === id);
    if (!attendance) {
      return;
    }

    broadcast({
      id: createRecordId('evt'),
      company: getSharedCompanyName(companyName),
      entityType: 'attendance',
      action: 'DELETE',
      payload: {
        id,
        logEntry: createSharedLog(companyName, userId, userName, `Deleted attendance for ${attendance.employeeName}`, 'attendance_delete', attendance.date, id)
      },
      userId,
      userName,
      timestamp: new Date().toISOString()
    });
  }, [broadcast, createSharedLog, getCompanyData]);

  const addPrice = useCallback((companyName, price, userId, userName) => {
    const record = {
      ...price,
      id: createRecordId('price')
    };

    broadcast({
      id: createRecordId('evt'),
      company: getSharedCompanyName(companyName),
      entityType: 'price',
      action: 'ADD',
      payload: {
        record,
        logEntry: createSharedLog(companyName, userId, userName, `Added price for ${record.productName}`, 'price_add', `AED ${record.newPrice}`, record.id)
      },
      userId,
      userName,
      timestamp: new Date().toISOString()
    });
  }, [broadcast, createSharedLog]);

  const updatePrice = useCallback((companyName, id, updates, userId, userName) => {
    const price = getCompanyData(companyName).prices.find((item) => item.id === id);
    if (!price) {
      return;
    }

    broadcast({
      id: createRecordId('evt'),
      company: getSharedCompanyName(companyName),
      entityType: 'price',
      action: 'UPDATE',
      payload: {
        id,
        updates,
        logEntry: createSharedLog(companyName, userId, userName, `Updated price for ${price.productName}`, 'price_update', `AED ${price.currentPrice} -> AED ${updates.newPrice || price.newPrice}`, id)
      },
      userId,
      userName,
      timestamp: new Date().toISOString()
    });
  }, [broadcast, createSharedLog, getCompanyData]);

  const deletePrice = useCallback((companyName, id, userId, userName) => {
    const price = getCompanyData(companyName).prices.find((item) => item.id === id);
    if (!price) {
      return;
    }

    broadcast({
      id: createRecordId('evt'),
      company: getSharedCompanyName(companyName),
      entityType: 'price',
      action: 'DELETE',
      payload: {
        id,
        logEntry: createSharedLog(companyName, userId, userName, `Deleted price for ${price.productName}`, 'price_delete', `SKU: ${price.sku}`, id)
      },
      userId,
      userName,
      timestamp: new Date().toISOString()
    });
  }, [broadcast, createSharedLog, getCompanyData]);

  const addSales = useCallback((companyName, sales, userId, userName) => {
    const record = {
      ...sales,
      id: createRecordId('sales'),
      recordedAt: new Date().toISOString(),
      recordedBy: sales.recordedBy || userName
    };

    broadcast({
      id: createRecordId('evt'),
      company: getSharedCompanyName(companyName),
      entityType: 'sales',
      action: 'ADD',
      payload: {
        record,
        logEntry: createSharedLog(companyName, userId, userName, `Recorded ${record.type} sale for ${record.productName}`, 'sales_record', `${record.quantity} units - AED ${record.totalValue}`, record.id)
      },
      userId,
      userName,
      timestamp: new Date().toISOString()
    });
  }, [broadcast, createSharedLog]);

  const updateSales = useCallback((companyName, id, updates, userId, userName) => {
    const sale = getCompanyData(companyName).sales.find((item) => item.id === id);
    if (!sale) {
      return;
    }

    broadcast({
      id: createRecordId('evt'),
      company: getSharedCompanyName(companyName),
      entityType: 'sales',
      action: 'UPDATE',
      payload: {
        id,
        updates,
        logEntry: createSharedLog(companyName, userId, userName, `Updated sales for ${sale.productName}`, 'sales_update', `Status: ${updates.status || sale.status}`, id)
      },
      userId,
      userName,
      timestamp: new Date().toISOString()
    });
  }, [broadcast, createSharedLog, getCompanyData]);

  const deleteSales = useCallback((companyName, id, userId, userName) => {
    const sale = getCompanyData(companyName).sales.find((item) => item.id === id);
    if (!sale) {
      return;
    }

    broadcast({
      id: createRecordId('evt'),
      company: getSharedCompanyName(companyName),
      entityType: 'sales',
      action: 'DELETE',
      payload: {
        id,
        logEntry: createSharedLog(companyName, userId, userName, `Deleted sales for ${sale.productName}`, 'sales_delete', `${sale.quantity} units`, id)
      },
      userId,
      userName,
      timestamp: new Date().toISOString()
    });
  }, [broadcast, createSharedLog, getCompanyData]);

  const addInventory = useCallback((companyName, inventory, userId, userName) => {
    const record = {
      ...inventory,
      id: createRecordId('inventory'),
      updatedAt: new Date().toISOString(),
      updatedBy: inventory.updatedBy || userName
    };

    broadcast({
      id: createRecordId('evt'),
      company: getSharedCompanyName(companyName),
      entityType: 'inventory',
      action: 'ADD',
      payload: {
        record,
        logEntry: createSharedLog(companyName, userId, userName, `Recorded ${record.type} inventory for ${record.productName}`, 'inventory_record', `${record.quantity} units - AED ${record.totalValue}`, record.id)
      },
      userId,
      userName,
      timestamp: new Date().toISOString()
    });
  }, [broadcast, createSharedLog]);

  const updateInventory = useCallback((companyName, id, updates, userId, userName) => {
    const inventory = getCompanyData(companyName).inventory.find((item) => item.id === id);
    if (!inventory) {
      return;
    }

    broadcast({
      id: createRecordId('evt'),
      company: getSharedCompanyName(companyName),
      entityType: 'inventory',
      action: 'UPDATE',
      payload: {
        id,
        updates,
        logEntry: createSharedLog(companyName, userId, userName, `Updated inventory for ${inventory.productName}`, 'inventory_update', `Status: ${updates.status || inventory.status}`, id)
      },
      userId,
      userName,
      timestamp: new Date().toISOString()
    });
  }, [broadcast, createSharedLog, getCompanyData]);

  const deleteInventory = useCallback((companyName, id, userId, userName) => {
    const inventory = getCompanyData(companyName).inventory.find((item) => item.id === id);
    if (!inventory) {
      return;
    }

    broadcast({
      id: createRecordId('evt'),
      company: getSharedCompanyName(companyName),
      entityType: 'inventory',
      action: 'DELETE',
      payload: {
        id,
        logEntry: createSharedLog(companyName, userId, userName, `Deleted inventory for ${inventory.productName}`, 'inventory_delete', `${inventory.quantity} units`, id)
      },
      userId,
      userName,
      timestamp: new Date().toISOString()
    });
  }, [broadcast, createSharedLog, getCompanyData]);

  const addStaffOutput = useCallback((companyName, output, userId, userName) => {
    const record = {
      ...output,
      id: createRecordId('output'),
      recordedAt: new Date().toISOString(),
      recordedBy: output.recordedBy || userName
    };

    broadcast({
      id: createRecordId('evt'),
      company: getSharedCompanyName(companyName),
      entityType: 'staff_output',
      action: 'ADD',
      payload: {
        record,
        logEntry: createSharedLog(companyName, userId, userName, `Recorded output for ${record.staffName}`, 'staff_output_record', `${record.tasksCompleted} tasks - Quality: ${record.qualityScore}%`, record.id)
      },
      userId,
      userName,
      timestamp: new Date().toISOString()
    });
  }, [broadcast, createSharedLog]);

  const updateStaffOutput = useCallback((companyName, id, updates, userId, userName) => {
    const output = getCompanyData(companyName).staffOutput.find((item) => item.id === id);
    if (!output) {
      return;
    }

    broadcast({
      id: createRecordId('evt'),
      company: getSharedCompanyName(companyName),
      entityType: 'staff_output',
      action: 'UPDATE',
      payload: {
        id,
        updates,
        logEntry: createSharedLog(companyName, userId, userName, `Updated output for ${output.staffName}`, 'staff_output_update', `Status: ${updates.status || output.status}`, id)
      },
      userId,
      userName,
      timestamp: new Date().toISOString()
    });
  }, [broadcast, createSharedLog, getCompanyData]);

  const deleteStaffOutput = useCallback((companyName, id, userId, userName) => {
    const output = getCompanyData(companyName).staffOutput.find((item) => item.id === id);
    if (!output) {
      return;
    }

    broadcast({
      id: createRecordId('evt'),
      company: getSharedCompanyName(companyName),
      entityType: 'staff_output',
      action: 'DELETE',
      payload: {
        id,
        logEntry: createSharedLog(companyName, userId, userName, `Deleted output for ${output.staffName}`, 'staff_output_delete', output.date, id)
      },
      userId,
      userName,
      timestamp: new Date().toISOString()
    });
  }, [broadcast, createSharedLog, getCompanyData]);

  const value = useMemo(() => ({
    hydrated,
    activeCompany,
    companyData: activeCompanyData,
    protechData,
    reviveData,
    invoices: activeCompanyData.invoices,
    attendance: activeCompanyData.attendance,
    prices: activeCompanyData.prices,
    sales: activeCompanyData.sales,
    inventory: activeCompanyData.inventory,
    staffOutput: activeCompanyData.staffOutput,
    activityLogs: activeCompanyData.activityLogs,
    priceEntries: activeCompanyData.prices,
    salesEntries: activeCompanyData.sales,
    setInvoices,
    setAttendance,
    setPrices,
    setSales,
    setInventory,
    setStaffOutput,
    setPriceEntries: setPrices,
    setSalesEntries: setSales,
    subscribe,
    broadcast,
    addInvoice,
    updateInvoice,
    deleteInvoice,
    addAttendance,
    updateAttendance,
    deleteAttendance,
    addPrice,
    updatePrice,
    deletePrice,
    addSales,
    updateSales,
    deleteSales,
    addInventory,
    updateInventory,
    deleteInventory,
    addStaffOutput,
    updateStaffOutput,
    deleteStaffOutput,
    addProtechInvoice: addProtechInvoice.add,
    updateProtechInvoice: addProtechInvoice.update,
    deleteProtechInvoice: addProtechInvoice.remove,
    addProtechAttendance: addProtechAttendance.add,
    updateProtechAttendance: addProtechAttendance.update,
    deleteProtechAttendance: addProtechAttendance.remove,
    addProtechPrice: addProtechPrice.add,
    updateProtechPrice: addProtechPrice.update,
    deleteProtechPrice: addProtechPrice.remove,
    addProtechSales: addProtechSales.add,
    updateProtechSales: addProtechSales.update,
    deleteProtechSales: addProtechSales.remove,
    addReviveInvoice: addReviveInvoice.add,
    updateReviveInvoice: addReviveInvoice.update,
    deleteReviveInvoice: addReviveInvoice.remove,
    addReviveAttendance: addReviveAttendance.add,
    updateReviveAttendance: addReviveAttendance.update,
    deleteReviveAttendance: addReviveAttendance.remove,
    addReviveSales: addReviveSales.add,
    updateReviveSales: addReviveSales.update,
    deleteReviveSales: addReviveSales.remove,
    addReviveInventory: addReviveInventory.add,
    updateReviveInventory: addReviveInventory.update,
    deleteReviveInventory: addReviveInventory.remove,
    addReviveStaffOutput: addReviveStaffOutput.add,
    updateReviveStaffOutput: addReviveStaffOutput.update,
    deleteReviveStaffOutput: addReviveStaffOutput.remove,
    clearActivityLogs
  }), [
    activeCompany,
    activeCompanyData,
    addProtechAttendance,
    addProtechInvoice,
    addProtechPrice,
    addProtechSales,
    addReviveAttendance,
    addReviveInventory,
    addReviveInvoice,
    addReviveSales,
    addReviveStaffOutput,
    addAttendance,
    addInventory,
    addInvoice,
    addPrice,
    addSales,
    addStaffOutput,
    broadcast,
    clearActivityLogs,
    deleteAttendance,
    deleteInventory,
    deleteInvoice,
    deletePrice,
    deleteSales,
    deleteStaffOutput,
    hydrated,
    protechData,
    reviveData,
    setAttendance,
    setInventory,
    setInvoices,
    setPrices,
    setSales,
    setStaffOutput,
    subscribe,
    updateAttendance,
    updateInventory,
    updateInvoice,
    updatePrice,
    updateSales,
    updateStaffOutput
  ]);

  return <DashboardDataContext.Provider value={value}>{children}</DashboardDataContext.Provider>;
}

export function useDashboardUser() {
  return useContext(DashboardUserContext);
}

export function useDashboardData() {
  const context = useContext(DashboardDataContext);
  if (!context) {
    throw new Error('useDashboardData must be used within DashboardDataProvider');
  }
  return context;
}

export function useCompanyContext() {
  return useDashboardData();
}

export function useSharedData() {
  return useDashboardData();
}

export function useCompanyData(companyName) {
  const context = useDashboardData();
  return normalizeCompanyName(companyName) === 'Revive' ? context.reviveData : context.protechData;
}

export function useProtechData() {
  const context = useDashboardData();
  return {
    data: context.protechData,
    invoices: { add: context.addProtechInvoice, update: context.updateProtechInvoice, delete: context.deleteProtechInvoice },
    attendance: { add: context.addProtechAttendance, update: context.updateProtechAttendance, delete: context.deleteProtechAttendance },
    prices: { add: context.addProtechPrice, update: context.updateProtechPrice, delete: context.deleteProtechPrice },
    sales: { add: context.addProtechSales, update: context.updateProtechSales, delete: context.deleteProtechSales }
  };
}

export function useReviveData() {
  const context = useDashboardData();
  return {
    data: context.reviveData,
    invoices: { add: context.addReviveInvoice, update: context.updateReviveInvoice, delete: context.deleteReviveInvoice },
    attendance: { add: context.addReviveAttendance, update: context.updateReviveAttendance, delete: context.deleteReviveAttendance },
    sales: { add: context.addReviveSales, update: context.updateReviveSales, delete: context.deleteReviveSales },
    inventory: { add: context.addReviveInventory, update: context.updateReviveInventory, delete: context.deleteReviveInventory },
    staffOutput: { add: context.addReviveStaffOutput, update: context.updateReviveStaffOutput, delete: context.deleteReviveStaffOutput }
  };
}

export function useActivityLogs(companyName) {
  const context = useDashboardData();
  return normalizeCompanyName(companyName) === 'Revive' ? context.reviveData.activityLogs : context.protechData.activityLogs;
}

export function useDashboardStats(companyName) {
  const context = useDashboardData();
  const data = normalizeCompanyName(companyName) === 'Revive' ? context.reviveData : context.protechData;
  return getDashboardStatsFromData(data);
}