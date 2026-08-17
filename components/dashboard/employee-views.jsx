'use client';

import React, { useMemo, useState } from 'react';
import { CheckCircle, Clock, FileText, Package } from 'lucide-react';
import SalesInventoryInsights from './sales-inventory-insights';

const formatCurrency = (value) => value != null
  ? `AED ${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  : 'AED 0.00';

const formatDate = (dateString) =>
  new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dubai',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(new Date(dateString));

const formatTime = (dateString) =>
  new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Dubai',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  }).format(new Date(dateString));

const getStatusColor = (status) => {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    approved: 'bg-green-100 text-green-800 border-green-300',
    rejected: 'bg-red-100 text-red-800 border-red-300',
    completed: 'bg-green-100 text-green-800 border-green-300',
    cancelled: 'bg-red-100 text-red-800 border-red-300',
    present: 'bg-green-100 text-green-800 border-green-300',
    absent: 'bg-red-100 text-red-800 border-red-300',
    leave: 'bg-blue-100 text-blue-800 border-blue-300',
    'half-day': 'bg-orange-100 text-orange-800 border-orange-300'
  };
  return colors[status] || colors.pending;
};

function getActivityStatusClass(status) {
  if (status === 'Pending') {
    return 'bg-amber-100 text-amber-700 border-amber-200';
  }
  if (status === 'Replied') {
    return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  }
  return 'bg-blue-100 text-blue-700 border-blue-200';
}

export function EmployeeInvoicesView({ employee, data }) {
  const filteredInvoices = useMemo(() => {
    if (!data?.invoices) return [];
    
    return data.invoices.filter((item) => {
      const uploadedByMatch = (item.uploadedBy || '').toLowerCase() === employee.email.toLowerCase();
      const vendorMatch = (item.vendor || '').toLowerCase().includes(employee.name.toLowerCase());
      return uploadedByMatch || vendorMatch;
    });
  }, [data?.invoices, employee]);

  const invoiceMetrics = useMemo(() => {
    const total = filteredInvoices.length;
    const approved = filteredInvoices.filter((i) => (i.status || '').toLowerCase() === 'approved').length;
    const pending = filteredInvoices.filter((i) => (i.status || '').toLowerCase() === 'pending').length;
    const totalAmount = filteredInvoices.reduce((sum, i) => sum + (Number(i.amount) || 0), 0);
    
    return { total, approved, pending, totalAmount };
  }, [filteredInvoices]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-slate-900">Invoices Management</h4>
        <p className="mt-2 text-sm text-slate-600">Invoices submitted and managed by {employee.name}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs text-slate-500">Total Invoices</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{invoiceMetrics.total}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs text-slate-500">Approved</p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{invoiceMetrics.approved}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs text-slate-500">Pending</p>
          <p className="mt-2 text-2xl font-bold text-amber-700">{invoiceMetrics.pending}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs text-slate-500">Total Amount</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatCurrency(invoiceMetrics.totalAmount)}</p>
        </div>
      </div>

      <div className="max-h-[450px] overflow-y-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-50 text-slate-700">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Vendor</th>
              <th className="px-4 py-3 text-left font-semibold">Amount</th>
              <th className="px-4 py-3 text-left font-semibold">Date</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">No invoices found for this employee.</td>
              </tr>
            ) : (
              filteredInvoices.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-800">{item.vendor}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{formatCurrency(item.amount || 0)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(item.date)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function EmployeeAttendanceView({ employee, data }) {
  const filteredAttendance = useMemo(() => {
    if (!data?.attendance) return [];
    
    return data.attendance.filter((item) => {
      const empMatch = (item.employeeName || item.employee || '').toLowerCase().includes(employee.name.toLowerCase());
      const recordedMatch = (item.recordedBy || '').toLowerCase() === employee.email.toLowerCase();
      return empMatch || recordedMatch;
    });
  }, [data?.attendance, employee]);

  const attendanceMetrics = useMemo(() => {
    const total = filteredAttendance.length;
    const present = filteredAttendance.filter((a) => (a.status || '').toLowerCase() === 'present').length;
    const absent = filteredAttendance.filter((a) => (a.status || '').toLowerCase() === 'absent').length;
    const leave = filteredAttendance.filter((a) => (a.status || '').toLowerCase() === 'leave').length;
    
    return { total, present, absent, leave };
  }, [filteredAttendance]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-slate-900">Attendance Records</h4>
        <p className="mt-2 text-sm text-slate-600">Attendance history for {employee.name}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs text-slate-500">Total Days</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{attendanceMetrics.total}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs text-slate-500">Present</p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{attendanceMetrics.present}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs text-slate-500">Absent</p>
          <p className="mt-2 text-2xl font-bold text-rose-700">{attendanceMetrics.absent}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs text-slate-500">Leave</p>
          <p className="mt-2 text-2xl font-bold text-blue-700">{attendanceMetrics.leave}</p>
        </div>
      </div>

      <div className="max-h-[450px] overflow-y-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-50 text-slate-700">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Date</th>
              <th className="px-4 py-3 text-left font-semibold">Employee</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
              <th className="px-4 py-3 text-left font-semibold">Recorded By</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredAttendance.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-500">No attendance records for this employee.</td>
              </tr>
            ) : (
              filteredAttendance.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">{formatDate(item.date)}</td>
                  <td className="px-4 py-3 text-slate-800">{item.employeeName || item.employee}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600 text-[12px] break-all">{item.recordedBy}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function EmployeePriceManagerView({ employee, data }) {
  const [dateFilter, setDateFilter] = useState('');
  const filteredPrices = useMemo(() => {
    if (!data?.prices) return [];
    
    return data.prices.filter((item) => {
      if (dateFilter && item.lastUpdated !== dateFilter) return false;
      const updatedByMatch = (item.updatedBy || '').toLowerCase() === employee.email.toLowerCase();
      const productMatch = (item.productName || '').toLowerCase().includes(employee.name.toLowerCase());
      return updatedByMatch || productMatch;
    });
  }, [data?.prices, employee, dateFilter]);

  const priceMetrics = useMemo(() => {
    const total = filteredPrices.length;
    const totalValue = filteredPrices.reduce((sum, p) => sum + (Number(p.newPrice) || 0) * (Number(p.stock) || 0), 0);
    const activeProducts = filteredPrices.filter((p) => (p.status || '').toLowerCase() === 'active').length;
    const priceUpdates = filteredPrices.filter((p) => Number(p.newPrice) !== Number(p.currentPrice)).length;
    
    return { total, totalValue, activeProducts, priceUpdates };
  }, [filteredPrices]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-slate-900">Price Manager</h4>
        <p className="mt-2 text-sm text-slate-600">Products managed by {employee.name}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs text-slate-500">Total Products</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{priceMetrics.total}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs text-slate-500">Active</p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{priceMetrics.activeProducts}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs text-slate-500">Price Updates</p>
          <p className="mt-2 text-2xl font-bold text-orange-700">{priceMetrics.priceUpdates}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs text-slate-500">Inventory Value</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatCurrency(priceMetrics.totalValue)}</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h5 className="text-sm font-semibold text-slate-800">Price History</h5>
        <div className="flex items-center gap-3">
          <label htmlFor="boss-price-date-filter" className="text-sm font-medium text-slate-700">Filter by Date:</label>
          <input id="boss-price-date-filter" type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 [color-scheme:light] focus:ring-2 focus:ring-blue-500" />
          {dateFilter && <button onClick={() => setDateFilter('')} className="rounded-lg bg-slate-200 px-3 py-2 text-xs text-slate-700">Clear</button>}
        </div>
      </div>

      <div className="max-h-[450px] overflow-y-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-50 text-slate-700">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">SKU</th>
              <th className="px-4 py-3 text-left font-semibold">Product</th>
              <th className="px-4 py-3 text-right font-semibold">Current Price</th>
              <th className="px-4 py-3 text-right font-semibold">New Price</th>
              <th className="px-4 py-3 text-right font-semibold">Stock</th>
              <th className="px-4 py-3 text-right font-semibold">Total Value</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredPrices.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No price entries for this employee.</td>
              </tr>
            ) : (
              filteredPrices.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-blue-600 text-[12px]">{item.sku}</td>
                  <td className="px-4 py-3 text-slate-800">{item.productName}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{formatCurrency(item.currentPrice || 0)}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">{formatCurrency(item.newPrice || 0)}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{item.stock}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">{formatCurrency((Number(item.newPrice) || 0) * (Number(item.stock) || 0))}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function EmployeeSalesManagerView({ employee, data, company }) {
  const filteredSales = useMemo(() => {
    if (!data?.sales) return [];
    
    return data.sales.filter((item) => {
      const salespersonMatch = (item.salesperson || '').toLowerCase().includes(employee.name.toLowerCase());
      const recordedMatch = (item.recordedBy || '').toLowerCase() === employee.email.toLowerCase();
      return salespersonMatch || recordedMatch;
    });
  }, [data?.sales, employee]);

  const salesMetrics = useMemo(() => {
    const total = filteredSales.length;
    const incoming = filteredSales.filter((s) => (s.type || '').toLowerCase() === 'incoming').length;
    const outgoing = filteredSales.filter((s) => (s.type || '').toLowerCase() === 'outgoing').length;
    const totalValue = filteredSales.reduce((sum, s) => sum + (Number(s.totalValue) || 0), 0);
    
    return { total, incoming, outgoing, totalValue };
  }, [filteredSales]);

  const moduleLabel = company === 'PROtech' ? 'Sales Manager' : 'Sales & Inventory Manager';

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-slate-900">{moduleLabel}</h4>
        <p className="mt-2 text-sm text-slate-600">Sales transactions recorded by {employee.name}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs text-slate-500">Total Transactions</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{salesMetrics.total}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs text-slate-500">Incoming</p>
          <p className="mt-2 text-2xl font-bold text-blue-700">{salesMetrics.incoming}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs text-slate-500">Outgoing</p>
          <p className="mt-2 text-2xl font-bold text-orange-700">{salesMetrics.outgoing}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs text-slate-500">Total Value</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{formatCurrency(salesMetrics.totalValue)}</p>
        </div>
      </div>

      <SalesInventoryInsights sales={filteredSales} />

      <div className="max-h-[450px] overflow-y-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-50 text-slate-700">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Date</th>
              <th className="px-4 py-3 text-left font-semibold">Type</th>
              <th className="px-4 py-3 text-left font-semibold">Product</th>
              <th className="px-4 py-3 text-right font-semibold">Qty</th>
              <th className="px-4 py-3 text-right font-semibold">Total</th>
              <th className="px-4 py-3 text-center font-semibold">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredSales.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No sales records for this employee.</td>
              </tr>
            ) : (
              filteredSales.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600">{formatDate(item.date)}</td>
                  <td className="px-4 py-3">
                    <span className={`font-medium ${(item.type || '').toLowerCase() === 'incoming' ? 'text-blue-600' : 'text-orange-600'}`}>
                      {item.type}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-800">{item.productName}</td>
                  <td className="px-4 py-3 text-right text-slate-600">{item.quantity}</td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">{formatCurrency(item.totalValue || 0)}</td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${getStatusColor(item.status)}`}>
                      {item.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function EmployeeActivityView({ employee, activity }) {
  const filteredActivity = useMemo(() => {
    if (!activity) return [];
    
    return activity.filter((entry) => 
      entry.user_name === employee.name || entry.user_name === employee.email
    );
  }, [activity, employee]);

  const activityMetrics = useMemo(() => {
    const total = filteredActivity.length;
    const completed = filteredActivity.filter((a) => (a.status || '').toLowerCase() === 'completed').length;
    const pending = filteredActivity.filter((a) => (a.status || '').toLowerCase() === 'pending').length;
    const replied = filteredActivity.filter((a) => (a.status || '').toLowerCase() === 'replied').length;
    
    return { total, completed, pending, replied };
  }, [filteredActivity]);

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-slate-900">Activity Log</h4>
        <p className="mt-2 text-sm text-slate-600">Real-time activities for {employee.name}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs text-slate-500">Total Actions</p>
          <p className="mt-2 text-2xl font-bold text-slate-900">{activityMetrics.total}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs text-slate-500">Completed</p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">{activityMetrics.completed}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs text-slate-500">Pending</p>
          <p className="mt-2 text-2xl font-bold text-amber-700">{activityMetrics.pending}</p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs text-slate-500">Replied</p>
          <p className="mt-2 text-2xl font-bold text-blue-700">{activityMetrics.replied}</p>
        </div>
      </div>

      <div className="max-h-[450px] overflow-y-auto rounded-xl border border-slate-200">
        <div className="space-y-2 p-4">
          {filteredActivity.length === 0 ? (
            <p className="text-center text-sm text-slate-500 py-8">No activity records found.</p>
          ) : (
            filteredActivity.map((entry) => (
              <div key={entry.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <p className="font-medium text-slate-800">{entry.action_description}</p>
                    <p className="mt-1 text-xs text-slate-600">{entry.action_type}</p>
                  </div>
                  <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getActivityStatusClass(entry.status)}`}>
                    {entry.status}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">{formatDate(entry.timestamp)} • {formatTime(entry.timestamp)}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
