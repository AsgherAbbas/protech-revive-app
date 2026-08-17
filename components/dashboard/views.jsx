'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  Edit2,
  Download,
  BarChart3,
  Users,
  FileText,
  TrendingUp,
  CheckCircle,
  AlertCircle,
  Clock,
  Package,
  Award
} from 'lucide-react';
import AdminDashboardRealtime from './admin-realtime';
import { useDashboardData } from './context';
import InfoCard from '../InfoCard';
import PasswordInput from '../auth/password-input';
import { EmployeeInvoicesView, EmployeeAttendanceView, EmployeePriceManagerView, EmployeeSalesManagerView, EmployeeActivityView } from './employee-views';
import { useRealtimeData } from '../../hooks/useRealtimeData';
import SalesReport from './sales-report';
import SalesInventoryInsights, { getCatalogEntry } from './sales-inventory-insights';
import protechLogo from '../../assets/protechlogo.webp';
import reviveLogo from '../../assets/revivetechlogo.webp';

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

const getDubaiDateKey = (dateString) => new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Dubai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
}).format(new Date(dateString));

const parseActivityTimestamp = (timestamp) => {
  if (typeof timestamp === 'string' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(timestamp)) {
    return new Date(`${timestamp.replace(' ', 'T')}+05:00`);
  }
  return new Date(timestamp);
};

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
    'half-day': 'bg-orange-100 text-orange-800 border-orange-300',
    active: 'bg-green-100 text-green-800 border-green-300',
    inactive: 'bg-gray-100 text-gray-800 border-gray-300',
    reviewed: 'bg-green-100 text-green-800 border-green-300'
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

function getSessionActor() {
  if (typeof window === 'undefined') {
    return { name: 'System User', company: 'PROtech' };
  }

  try {
    const raw = window.localStorage.getItem('user');
    if (!raw) {
      return { name: 'System User', company: 'PROtech' };
    }

    const parsed = JSON.parse(raw);
    return {
      name: parsed?.name || 'System User',
      company: parsed?.company_name === 'Revive' ? 'Revive' : 'PROtech'
    };
  } catch {
    return { name: 'System User', company: 'PROtech' };
  }
}

function ProtechSalesInventoryInsights({ sales }) {
  const [inventorySearch, setInventorySearch] = useState('');
  const activeSales = (sales || []).filter((sale) => String(sale.status || '').toLowerCase() !== 'cancelled');
  const inventory = new Map();
  let revenue = 0;
  let costs = 0;

  activeSales.forEach((sale) => {
    const sku = String(sale.sku || 'UNKNOWN').trim() || 'UNKNOWN';
    const quantity = Number(sale.quantity) || 0;
    const value = Number(sale.totalValue) || quantity * (Number(sale.unitPrice) || 0);
    const current = inventory.get(sku) || { sku, productName: sale.productName || 'Unknown product', incoming: 0, outgoing: 0 };
    current.productName = sale.productName || current.productName;

    if (String(sale.type || '').toLowerCase() === 'incoming') {
      current.incoming += quantity;
      costs += value;
    } else if (String(sale.type || '').toLowerCase() === 'outgoing') {
      current.outgoing += quantity;
      revenue += value;
    }
    inventory.set(sku, current);
  });

  const rows = [...inventory.values()].sort((left, right) => left.sku.localeCompare(right.sku));
  const normalizedSearch = inventorySearch.trim().toLowerCase();
  const filteredRows = normalizedSearch
    ? rows.filter((item) => `${item.sku} ${item.productName}`.toLowerCase().includes(normalizedSearch))
    : rows;
  const formatValue = (value) => `AED ${Number(value || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
        <div className="flex items-center gap-3"><div className="rounded-lg bg-emerald-600 p-2 text-white"><TrendingUp className="h-5 w-5" /></div><div><p className="text-sm font-semibold text-emerald-800">Net Profit</p><p className="mt-1 text-2xl font-bold text-emerald-950">{formatValue(revenue - costs)}</p></div></div>
        <p className="mt-3 text-xs text-emerald-700">Selling revenue minus Ahmad&apos;s catalog cost</p>
      </div>
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between"><div><h2 className="text-lg font-bold text-slate-900">Live Inventory</h2><p className="mt-1 text-sm text-slate-600">Current stock from incoming and outgoing transactions</p></div><Package className="h-5 w-5 text-blue-600" /></div>
        <div className="mb-4">
          <label htmlFor="protech-inventory-search" className="sr-only">Search inventory</label>
          <input
            id="protech-inventory-search"
            type="search"
            value={inventorySearch}
            onChange={(event) => setInventorySearch(event.target.value)}
            placeholder="Search by SKU or product name"
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-500 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
        </div>
        <div className="overflow-x-auto"><table className="w-full min-w-[540px] text-sm"><thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-700"><tr><th className="px-4 py-3 font-semibold">SKU</th><th className="px-4 py-3 font-semibold">Product</th><th className="px-4 py-3 text-right font-semibold">Incoming</th><th className="px-4 py-3 text-right font-semibold">Outgoing</th><th className="px-4 py-3 text-right font-semibold">Current Stock</th></tr></thead><tbody className="divide-y divide-slate-200">{filteredRows.length === 0 ? <tr><td colSpan="5" className="px-4 py-6 text-center text-slate-500">{rows.length === 0 ? 'No inventory transactions yet.' : 'No matching inventory found.'}</td></tr> : filteredRows.map((item) => <tr key={item.sku} className="hover:bg-slate-50"><td className="px-4 py-3 font-mono text-blue-700">{item.sku}</td><td className="px-4 py-3 text-slate-800">{item.productName}</td><td className="px-4 py-3 text-right text-blue-700">{item.incoming}</td><td className="px-4 py-3 text-right text-orange-700">{item.outgoing}</td><td className={`px-4 py-3 text-right font-bold ${item.incoming - item.outgoing < 0 ? 'text-red-700' : 'text-slate-900'}`}>{item.incoming - item.outgoing}</td></tr>)}</tbody></table></div>
      </div>
    </div>
  );
}

export function SuperAdminMasterView({ user, section = 'overview' }) {
  const { protechData, reviveData } = useDashboardData();
  const searchParams = useSearchParams();
  const [activeCompanyFilter, setActiveCompanyFilter] = useState(() => user?.company_name === 'Revive' ? 'Revive' : 'PROtech');
  const [liveActivity, setLiveActivity] = useState([]);
  const [pendingUsers, setPendingUsers] = useState([]);
  const [approvedEmployees, setApprovedEmployees] = useState([]);
  const [activeUsers, setActiveUsers] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [approvalBusyUserId, setApprovalBusyUserId] = useState(null);
  const [approvalMessage, setApprovalMessage] = useState('');
  const [employeeActiveTab, setEmployeeActiveTab] = useState('overview');
  const [activityDateFilter, setActivityDateFilter] = useState('');
  const [overviewData, setOverviewData] = useState({ PROtech: null, Revive: null });

  const adminHeaders = useMemo(() => ({
    'x-user-email': user?.email || ''
  }), [user?.email]);

  useEffect(() => {
    let cancelled = false;

    const loadAll = async () => {
      try {
        const companyNames = ['PROtech', 'Revive'];
        const companyResponses = await Promise.all(companyNames.map(async (companyName) => {
          const [invoices, attendance, prices, sales] = await Promise.all([
            fetch(`/api/invoices?company=${companyName}`),
            fetch(`/api/attendance?company=${companyName}`),
            fetch(`/api/prices?company=${companyName}`),
            fetch(`/api/sales?company=${companyName}`)
          ]);
          const payloads = await Promise.all([invoices.json(), attendance.json(), prices.json(), sales.json()]);
          return [companyName, {
            invoices: Array.isArray(payloads[0].data) ? payloads[0].data : [],
            attendance: Array.isArray(payloads[1].data) ? payloads[1].data : [],
            prices: Array.isArray(payloads[2].data) ? payloads[2].data : [],
            sales: Array.isArray(payloads[3].data) ? payloads[3].data : [],
            activityLogs: []
          }];
        }));

        const [logsResponse, pendingResponse, approvedResponse, activeUsersResponse] = await Promise.all([
          fetch(`/api/activity-logs?company=${encodeURIComponent(user?.company_name || 'PROtech')}&limit=150`),
          fetch(`/api/admin/users?status=pending&company=${encodeURIComponent(user?.company_name || 'PROtech')}`, { headers: adminHeaders }),
          fetch(`/api/admin/users?status=approved&company=${encodeURIComponent(user?.company_name || 'PROtech')}`, { headers: adminHeaders }),
          fetch(`/api/admin/active-users?company=${encodeURIComponent(user?.company_name || 'PROtech')}`, { headers: adminHeaders })
        ]);

        const [logsData, pendingData, approvedData, activeData] = await Promise.all([
          logsResponse.json(),
          pendingResponse.json(),
          approvedResponse.json(),
          activeUsersResponse.json()
        ]);

        if (!cancelled) {
          setOverviewData(Object.fromEntries(companyResponses));
          if (logsResponse.ok) {
            setLiveActivity(Array.isArray(logsData.logs) ? logsData.logs : []);
          }

          if (pendingResponse.ok) {
            setPendingUsers(Array.isArray(pendingData.users) ? pendingData.users : []);
          }

          if (approvedResponse.ok) {
            const employees = Array.isArray(approvedData.users) ? approvedData.users : [];
            setApprovedEmployees(employees);
            if (!selectedEmployeeId && employees.length > 0) {
              setSelectedEmployeeId(employees[0].id);
            }
          }

          if (activeUsersResponse.ok) {
            setActiveUsers(Array.isArray(activeData.users) ? activeData.users : []);
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to fetch super admin data:', error);
        }
      }
    };

    loadAll();
    const intervalId = setInterval(loadAll, 4000);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [adminHeaders, user?.company_name]);

  const handleApproval = async (userId, nextStatus) => {
    setApprovalBusyUserId(userId);
    setApprovalMessage('');

    try {
      const response = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...adminHeaders
        },
        body: JSON.stringify({ userId, status: nextStatus })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to update user approval status');
      }

      setPendingUsers((prev) => prev.filter((item) => item.id !== userId));
      setApprovalMessage(nextStatus === 'approved' ? 'User approved successfully.' : 'User access rejected.');
    } catch (error) {
      setApprovalMessage(error.message || 'Approval update failed');
    } finally {
      setApprovalBusyUserId(null);
    }
  };

  const companySummary = useMemo(() => {
    const fromData = (companyName, data) => {
      const liveData = overviewData[companyName] || data;
      const finalizedSales = (liveData.sales || []).filter((item) => (item.status || '').toLowerCase() !== 'cancelled');
      const revenue = finalizedSales.reduce((sum, sale) => {
        const total = Number(sale.totalValue);
        const fallback = (Number(sale.quantity) || 0) * (Number(sale.unitPrice) || 0);
        return sum + (Number.isFinite(total) && total > 0 ? total : fallback);
      }, 0);

      return {
        companyName,
        invoices: (liveData.invoices || []).length,
        attendance: (liveData.attendance || []).length,
        priceEntries: (liveData.prices || []).length,
        sales: finalizedSales.length,
        revenue,
        activities: liveActivity.filter((entry) => entry.company_name === companyName).length
      };
    };

    const protech = fromData('PROtech', protechData);
    const revive = fromData('Revive', reviveData);

    return {
      protech,
      revive
    };
  }, [liveActivity, overviewData, protechData, reviveData]);

  const selectedSummary = activeCompanyFilter === 'Revive'
    ? companySummary.revive
    : companySummary.protech;

  const visibleActivity = useMemo(() => {
    return liveActivity.filter((entry) => entry.company_name === activeCompanyFilter);
  }, [activeCompanyFilter, liveActivity]);

  const selectedEmployeeFromQuery = useMemo(() => {
    const employeeName = searchParams.get('employee');
    const companyName = searchParams.get('company');

    if (!employeeName || !companyName) {
      return null;
    }

    return approvedEmployees.find((employee) =>
      employee.company_name === companyName && (employee.name === employeeName || employee.email === employeeName)
    ) || null;
  }, [approvedEmployees, searchParams]);

  const selectedEmployee = useMemo(() => {
    if (!approvedEmployees.length) {
      return null;
    }

    if (selectedEmployeeFromQuery) {
      return selectedEmployeeFromQuery;
    }

    const found = approvedEmployees.find((employee) => employee.id === selectedEmployeeId);
    return found || approvedEmployees[0];
  }, [approvedEmployees, selectedEmployeeFromQuery, selectedEmployeeId]);

  const selectedEmployeeStatus = useMemo(() => {
    if (!selectedEmployee) {
      return 'Offline';
    }

    const activeSession = activeUsers.find((session) => session.user_email === selectedEmployee.email);
    return activeSession ? 'Online now' : 'Offline';
  }, [activeUsers, selectedEmployee]);

  const selectedEmployeeActivity = useMemo(() => {
    if (!selectedEmployee) {
      return [];
    }

    return liveActivity.filter((entry) => entry.user_name === selectedEmployee.name || entry.user_name === selectedEmployee.email);
  }, [liveActivity, selectedEmployee]);

  const renderSectionContent = () => {
    if (selectedEmployee && searchParams.get('employee')) {
      const employeeCompanyData = selectedEmployee.company_name === 'PROtech' ? protechData : reviveData;
      const employeeTasks = [
        { label: 'Attendance', value: (employeeCompanyData.attendance || []).filter((item) => (item.employeeName || item.employee || '').toLowerCase().includes(selectedEmployee.name.toLowerCase()) || (item.recordedBy || '').toLowerCase().includes(selectedEmployee.email.toLowerCase())).length },
        { label: 'Invoices', value: (employeeCompanyData.invoices || []).filter((item) => (item.uploadedBy || '').toLowerCase() === selectedEmployee.email.toLowerCase() || (item.vendor || '').toLowerCase().includes(selectedEmployee.name.toLowerCase())).length },
        { label: 'Price Uploads', value: (employeeCompanyData.prices || []).filter((item) => (item.updatedBy || '').toLowerCase() === selectedEmployee.email.toLowerCase() || (item.productName || '').toLowerCase().includes(selectedEmployee.name.toLowerCase())).length },
        { label: 'Sales Entries', value: (employeeCompanyData.sales || []).filter((item) => (item.salesperson || '').toLowerCase().includes(selectedEmployee.name.toLowerCase()) || (item.recordedBy || '').toLowerCase() === selectedEmployee.email.toLowerCase()).length },
        { label: 'Activity Log', value: liveActivity.filter((entry) => entry.user_name === selectedEmployee.name || entry.user_name === selectedEmployee.email).length }
      ];

      return (
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Live work view</p>
                <h3 className="mt-2 text-2xl font-bold text-slate-900">{selectedEmployee.name}</h3>
              </div>
              <span className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${selectedEmployeeStatus === 'Online now' ? 'border-emerald-200 bg-emerald-100 text-emerald-700' : 'border-slate-200 bg-slate-100 text-slate-700'}`}>
                {selectedEmployeeStatus}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Company</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{selectedEmployee.company_name}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Role</p>
                <p className="mt-2 text-lg font-semibold text-slate-900">{selectedEmployee.role}</p>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs text-slate-500">Email</p>
                <p className="mt-2 break-all text-lg font-semibold text-slate-900">{selectedEmployee.email}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            {employeeTasks.map((task) => (
              <div key={task.label} className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-sm font-medium text-slate-600">{task.label}</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{task.value}</p>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <div className="mb-4 flex flex-wrap gap-2 border-b border-slate-200">
              {['overview', 'invoices', 'attendance', 'activity'].concat(selectedEmployee.company_name === 'PROtech' ? ['price-manager', 'sales-manager'] : ['sales-manager', 'staff-output-manager']).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setEmployeeActiveTab(tab)}
                  className={`px-4 py-2 font-medium transition ${
                    employeeActiveTab === tab
                      ? 'border-b-2 border-slate-900 text-slate-900'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab === 'overview' ? 'Overview' : tab === 'price-manager' ? 'Price Manager' : tab === 'sales-manager' ? (selectedEmployee.company_name === 'PROtech' ? 'Sales Manager' : 'Sales & Inventory') : tab === 'staff-output-manager' ? 'Staff Output Manager' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>

            {employeeActiveTab === 'overview' && (
              <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
                <h4 className="text-lg font-semibold text-slate-900">Recent live activity</h4>
                <div className="mt-4 space-y-3">
                  {selectedEmployeeActivity.length === 0 ? (
                    <p className="text-sm text-slate-500">No recent activity yet for this employee.</p>
                  ) : (
                    selectedEmployeeActivity.slice(0, 8).map((entry) => (
                      <div key={entry.id} className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium text-slate-800">{entry.action_description}</p>
                          <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold ${getActivityStatusClass(entry.status)}`}>{entry.status}</span>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">{formatDate(entry.timestamp)} • {formatTime(entry.timestamp)}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
            {employeeActiveTab === 'invoices' && (
              <EmployeeInvoicesView employee={selectedEmployee} data={employeeCompanyData} />
            )}
            {employeeActiveTab === 'attendance' && (
              <EmployeeAttendanceView employee={selectedEmployee} data={employeeCompanyData} />
            )}
            {employeeActiveTab === 'activity' && (
              <EmployeeActivityView employee={selectedEmployee} activity={selectedEmployeeActivity} />
            )}
            {employeeActiveTab === 'price-manager' && selectedEmployee.company_name === 'PROtech' && (
              <EmployeePriceManagerView employee={selectedEmployee} data={employeeCompanyData} />
            )}
            {employeeActiveTab === 'sales-manager' && (
              <EmployeeSalesManagerView employee={selectedEmployee} data={employeeCompanyData} company={selectedEmployee.company_name} />
            )}
            {employeeActiveTab === 'staff-output-manager' && selectedEmployee.company_name === 'Revive' && (
              <ReviveStaffOutputManagerView />
            )}
          </div>
        </div>
      );
    }

  const filteredActivityByDate = useMemo(() => {
    if (!activityDateFilter) return visibleActivity;
    
    return visibleActivity.filter((entry) => getDubaiDateKey(parseActivityTimestamp(entry.timestamp)) === activityDateFilter);
  }, [visibleActivity, activityDateFilter]);

    if (section === 'activity') {
      return (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h4 className="text-lg font-semibold text-slate-900">Real-Time Activity Feed</h4>
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={activityDateFilter}
                onChange={(e) => setActivityDateFilter(e.target.value)}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 focus:border-slate-900 focus:outline-none"
                aria-label="Filter activity by date"
              />
              {activityDateFilter && (
                <button
                  onClick={() => setActivityDateFilter('')}
                  className="text-xs font-medium text-slate-600 hover:text-slate-900"
                >
                  Clear
                </button>
              )}
              <span className="text-xs text-slate-500">Auto-refresh every 4 seconds</span>
            </div>
          </div>

          <div className="max-h-[620px] overflow-y-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Timestamp</th>
                  <th className="px-4 py-3 text-left font-semibold">Company</th>
                  <th className="px-4 py-3 text-left font-semibold">User</th>
                  <th className="px-4 py-3 text-left font-semibold">Action</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredActivityByDate.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-slate-500">{activityDateFilter ? 'No activity logs for this date.' : 'No activity logs yet.'}</td>
                  </tr>
                ) : (
                  filteredActivityByDate.map((entry) => (
                    <tr key={entry.id} className="hover:bg-slate-50">
                      <td className="whitespace-nowrap px-4 py-3 text-slate-700">{formatDate(parseActivityTimestamp(entry.timestamp))} {formatTime(parseActivityTimestamp(entry.timestamp))}</td>
                      <td className="px-4 py-3 text-slate-800">{entry.company_name}</td>
                      <td className="px-4 py-3 text-slate-800">{entry.user_name}</td>
                      <td className="px-4 py-3 text-slate-700">{entry.action_description}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${getActivityStatusClass(entry.status)}`}>
                          {entry.status}
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

    if (section === 'account-approvals') {
      return (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-lg font-semibold text-slate-900">Pending User Approvals</h4>
            <span className="text-xs text-slate-500">Auto-refresh every 4 seconds</span>
          </div>

          {approvalMessage ? (
            <p className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{approvalMessage}</p>
          ) : null}

          <div className="max-h-[620px] overflow-y-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Name</th>
                  <th className="px-4 py-3 text-left font-semibold">Email</th>
                  <th className="px-4 py-3 text-left font-semibold">Company</th>
                  <th className="px-4 py-3 text-left font-semibold">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {pendingUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">No users awaiting approval.</td>
                  </tr>
                ) : (
                  pendingUsers.map((pendingUser) => (
                    <tr key={pendingUser.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-800">{pendingUser.name}</td>
                      <td className="px-4 py-3 text-slate-700">{pendingUser.email}</td>
                      <td className="px-4 py-3 text-slate-700">{pendingUser.company_name}</td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleApproval(pendingUser.id, 'approved')}
                            disabled={approvalBusyUserId === pendingUser.id}
                            className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => handleApproval(pendingUser.id, 'rejected')}
                            disabled={approvalBusyUserId === pendingUser.id}
                            className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
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

    if (section === 'active-users') {
      return (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-lg font-semibold text-slate-900">Currently Active Users</h4>
            <span className="text-xs text-slate-500">Auto-refresh every 4 seconds</span>
          </div>

          <div className="max-h-[620px] overflow-y-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">User</th>
                  <th className="px-4 py-3 text-left font-semibold">Email</th>
                  <th className="px-4 py-3 text-left font-semibold">Company</th>
                  <th className="px-4 py-3 text-left font-semibold">Login Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {activeUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-500">No active users currently.</td>
                  </tr>
                ) : (
                  activeUsers.map((activeUser) => (
                    <tr key={activeUser.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 text-slate-800">{activeUser.user_name}</td>
                      <td className="px-4 py-3 text-slate-700">{activeUser.user_email}</td>
                      <td className="px-4 py-3 text-slate-700">{activeUser.company_name}</td>
                      <td className="px-4 py-3 text-slate-700">
                        {formatDate(activeUser.login_timestamp)} {formatTime(activeUser.login_timestamp)}
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

    return (
      <div className="space-y-6">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h3 className="text-xl font-semibold text-slate-900">Boss Control Center</h3>
            <div className="flex items-center gap-2" aria-label="Select company context">
              {['PROtech', 'Revive'].map((companyName) => (
                <button
                  key={companyName}
                  type="button"
                  onClick={() => setActiveCompanyFilter(companyName)}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold transition ${activeCompanyFilter === companyName ? 'border-slate-900 bg-slate-900 text-white' : 'border-slate-300 bg-white text-slate-700 hover:border-slate-500'}`}
                >
                  {companyName}
                </button>
              ))}
            </div>
          </div>
          <p className="mt-2 text-slate-600">
            Welcome {user.name}. Viewing {selectedSummary.companyName} metrics and live operational activity.
          </p>
        </div>


        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-600">Invoices</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{selectedSummary.invoices}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-600">Attendance Records</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{selectedSummary.attendance}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-600">Sales Entries</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{selectedSummary.sales}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-600">Price Entries</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{selectedSummary.priceEntries}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-600">Revenue Snapshot</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{formatCurrency(selectedSummary.revenue)}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-600">In-App Activity Buffer</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{selectedSummary.activities}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-600">Pending Approvals</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{pendingUsers.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm font-medium text-slate-600">Currently Active Users</p>
            <p className="mt-2 text-3xl font-bold text-slate-900">{activeUsers.length}</p>
          </div>
        </div>
      </div>
    );
  };

  return renderSectionContent();
}

export function RegisteredUsersView({ user }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let ignored = false;

    const loadUsers = async () => {
      try {
        const response = await fetch(`/api/admin/users?status=all&company=${encodeURIComponent(user?.company_name || 'PROtech')}`, {
          headers: { 'x-user-email': user?.email || '' }
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || 'Failed to load users');
        }

        if (!ignored) {
          setUsers(Array.isArray(data.users) ? data.users : []);
        }
      } catch (error) {
        if (!ignored) {
          setMessage(error.message || 'Unable to load registered users');
        }
      } finally {
        if (!ignored) {
          setLoading(false);
        }
      }
    };

    loadUsers();
    return () => {
      ignored = true;
    };
  }, [user?.email]);

  const handleDeleteUser = async (userId) => {
    setDeletingId(userId);
    setMessage('');

    try {
      const response = await fetch('/api/admin/users', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-user-email': user?.email || ''
        },
        body: JSON.stringify({ userId })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete user');
      }

      setUsers((prev) => prev.filter((entry) => entry.id !== userId));
      setMessage('User deleted successfully.');
    } catch (error) {
      setMessage(error.message || 'User deletion failed.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-xl font-semibold text-slate-900">Registered Users</h3>
          <p className="mt-1 text-sm text-slate-600">Complete account directory across PROTech and ReviveTech.</p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{users.length} total</span>
      </div>

      {message ? (
        <p className="mb-4 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">{message}</p>
      ) : null}

      <div className="max-h-[620px] overflow-y-auto rounded-xl border border-slate-200">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-slate-50 text-slate-700">
            <tr>
              <th className="px-4 py-3 text-left font-semibold">Name</th>
              <th className="px-4 py-3 text-left font-semibold">Email</th>
              <th className="px-4 py-3 text-left font-semibold">Company</th>
              <th className="px-4 py-3 text-left font-semibold">Role</th>
              <th className="px-4 py-3 text-left font-semibold">Status</th>
              <th className="px-4 py-3 text-left font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">Loading registered users...</td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-500">No registered accounts found.</td>
              </tr>
            ) : (
              users.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-800">{entry.name}</td>
                  <td className="px-4 py-3 text-slate-700">{entry.email}</td>
                  <td className="px-4 py-3 text-slate-700">{entry.company_name}</td>
                  <td className="px-4 py-3 text-slate-700 capitalize">{entry.role}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold ${getStatusColor(entry.status)}`}>
                      {entry.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleDeleteUser(entry.id)}
                      disabled={deletingId === entry.id}
                      className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingId === entry.id ? 'Deleting...' : 'Delete'}
                    </button>
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

export function CompanyOverviewView({ user }) {
  const { invoices, priceEntries, salesEntries } = useDashboardData();

  const [activeRevenueIndex, setActiveRevenueIndex] = useState(5);
  const [activeInventoryIndex, setActiveInventoryIndex] = useState(0);

  const finalizedSales = useMemo(() => {
    return (salesEntries || []).filter((item) => (item.status || '').toLowerCase() !== 'cancelled');
  }, [salesEntries]);

  const finalizedRevenueSales = useMemo(() => {
    return finalizedSales.filter((item) => (item.type || '').toLowerCase() === 'outgoing');
  }, [finalizedSales]);

  const revenueSeries = useMemo(() => {
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, index) => {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      const monthKey = `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`;

      return {
        monthKey,
        month: monthDate.toLocaleDateString('en-US', { month: 'short' })
      };
    });

    return months.map(({ monthKey, month }) => {
      const matching = finalizedRevenueSales.filter((sale) => {
        if (!sale.date) {
          return false;
        }

        const saleDate = new Date(sale.date);
        if (Number.isNaN(saleDate.getTime())) {
          return false;
        }

        const saleMonthKey = `${saleDate.getFullYear()}-${String(saleDate.getMonth() + 1).padStart(2, '0')}`;
        return saleMonthKey === monthKey;
      });

      const revenue = matching.reduce((sum, sale) => {
        const total = Number(sale.totalValue);
        const fallback = (Number(sale.quantity) || 0) * (Number(sale.unitPrice) || 0);
        return sum + (Number.isFinite(total) && total > 0 ? total : fallback);
      }, 0);

      return {
        month,
        revenue,
        orders: matching.length
      };
    });
  }, [finalizedRevenueSales]);

  const inventoryDistribution = useMemo(() => {
    const grouped = new Map();

    (priceEntries || []).forEach((entry) => {
      const category = (entry.category || 'Uncategorized').trim() || 'Uncategorized';
      const stock = Number(entry.stock) || 0;
      const unitValue = Number(entry.newPrice) || 0;

      if (!grouped.has(category)) {
        grouped.set(category, { category, units: 0, totalValue: 0 });
      }

      const current = grouped.get(category);
      current.units += stock;
      current.totalValue += stock * unitValue;
    });

    return Array.from(grouped.values())
      .map((item) => ({
        category: item.category,
        units: item.units,
        unitValue: item.units > 0 ? item.totalValue / item.units : 0,
        totalValue: item.totalValue
      }))
      .sort((a, b) => b.units - a.units);
  }, [priceEntries]);

  useEffect(() => {
    setActiveRevenueIndex((prev) => Math.min(prev, Math.max(revenueSeries.length - 1, 0)));
  }, [revenueSeries.length]);

  useEffect(() => {
    setActiveInventoryIndex((prev) => Math.min(prev, Math.max(inventoryDistribution.length - 1, 0)));
  }, [inventoryDistribution.length]);

  const revenueMetrics = useMemo(() => {
    const totalRevenue = revenueSeries.reduce((sum, item) => sum + item.revenue, 0);
    const latest = revenueSeries[revenueSeries.length - 1] || { revenue: 0 };
    const previous = revenueSeries[revenueSeries.length - 2] || { revenue: 0 };
    const monthlyGrowth = previous.revenue > 0 ? ((latest.revenue - previous.revenue) / previous.revenue) * 100 : 0;
    const pendingSales = finalizedSales.filter((item) => (item.status || '').toLowerCase() === 'pending').length;
    const pendingInvoices = (invoices || []).filter((item) => (item.status || '').toLowerCase() === 'pending').length;

    return {
      totalRevenue,
      monthlyGrowth,
      activeOrders: pendingSales + pendingInvoices
    };
  }, [finalizedSales, invoices, revenueSeries]);

  const stockMetrics = useMemo(() => {
    return inventoryDistribution.reduce((sum, item) => sum + item.totalValue, 0);
  }, [inventoryDistribution]);

  const chartWidth = 640;
  const chartHeight = 260;
  const chartPadding = 34;
  const maxRevenue = Math.max(...revenueSeries.map((item) => item.revenue), 1);

  const revenuePoints = revenueSeries.map((item, index) => {
    const x = chartPadding + (index * (chartWidth - chartPadding * 2)) / Math.max(revenueSeries.length - 1, 1);
    const y = chartHeight - chartPadding - (item.revenue / maxRevenue) * (chartHeight - chartPadding * 2);
    return { ...item, x, y };
  });

  const revenuePath = revenuePoints
    .map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`)
    .join(' ');

  const areaPath = revenuePoints.length
    ? `${revenuePath} L ${revenuePoints[revenuePoints.length - 1].x} ${chartHeight - chartPadding} L ${revenuePoints[0].x} ${chartHeight - chartPadding} Z`
    : '';

  const selectedRevenuePoint = revenuePoints[Math.min(activeRevenueIndex, Math.max(revenuePoints.length - 1, 0))] || {
    month: '--',
    revenue: 0
  };

  const inventoryMaxUnits = Math.max(...inventoryDistribution.map((item) => item.units), 1);
  const selectedInventoryItem = inventoryDistribution[Math.min(activeInventoryIndex, Math.max(inventoryDistribution.length - 1, 0))];

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h3 className="text-xl font-semibold text-slate-900">Executive Overview</h3>
        <p className="mt-2 text-slate-600">
          Welcome {user.name}. Here is a live snapshot of {user.company_name}'s current commercial performance.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-600">Total Revenue</p>
            <BarChart3 className="h-5 w-5 text-slate-500" />
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{formatCurrency(revenueMetrics.totalRevenue)}</p>
          <p className="mt-1 text-xs text-slate-500">Calculated from outgoing sales transactions</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-600">Monthly Growth</p>
            <TrendingUp className="h-5 w-5 text-emerald-600" />
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{revenueMetrics.monthlyGrowth.toFixed(1)}%</p>
          <p className="mt-1 text-xs text-emerald-700">Compared with previous month</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-600">Active Orders</p>
            <FileText className="h-5 w-5 text-slate-500" />
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{revenueMetrics.activeOrders}</p>
          <p className="mt-1 text-xs text-slate-500">Pending sales and invoice approvals</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-600">Stock Valuation</p>
            <Package className="h-5 w-5 text-slate-500" />
          </div>
          <p className="mt-3 text-2xl font-bold text-slate-900">{formatCurrency(stockMetrics)}</p>
          <p className="mt-1 text-xs text-slate-500">Based on current Price Manager entries</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-base font-semibold text-slate-900">Revenue / Sales Trend</h4>
              <p className="text-sm text-slate-600">Last 6 months based on saved sales records</p>
            </div>
            <div className="rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {selectedRevenuePoint.month}: {formatCurrency(selectedRevenuePoint.revenue)}
            </div>
          </div>

          <div className="overflow-x-auto">
            <svg
              viewBox={`0 0 ${chartWidth} ${chartHeight}`}
              className="h-72 min-w-[560px] w-full"
              role="img"
              aria-label="Revenue trend line chart"
            >
              <defs>
                <linearGradient id="revenueArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#1d4ed8" stopOpacity="0.24" />
                  <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.03" />
                </linearGradient>
              </defs>

              <line x1={chartPadding} y1={chartHeight - chartPadding} x2={chartWidth - chartPadding} y2={chartHeight - chartPadding} stroke="#cbd5e1" strokeWidth="1" />
              <line x1={chartPadding} y1={chartPadding} x2={chartPadding} y2={chartHeight - chartPadding} stroke="#e2e8f0" strokeWidth="1" />

              <path d={areaPath} fill="url(#revenueArea)" />
              <path d={revenuePath} fill="none" stroke="#1d4ed8" strokeWidth="3" strokeLinecap="round" />

              {revenuePoints.map((point, index) => (
                <g key={point.month}>
                  <circle
                    cx={point.x}
                    cy={point.y}
                    r={index === activeRevenueIndex ? 7 : 5}
                    fill={index === activeRevenueIndex ? '#1d4ed8' : '#60a5fa'}
                    className="cursor-pointer transition-all"
                    onMouseEnter={() => setActiveRevenueIndex(index)}
                    onClick={() => setActiveRevenueIndex(index)}
                  />
                  <text x={point.x} y={chartHeight - 10} textAnchor="middle" className="fill-slate-500 text-[12px]">
                    {point.month}
                  </text>
                </g>
              ))}
            </svg>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h4 className="text-base font-semibold text-slate-900">Inventory Distribution</h4>
              <p className="text-sm text-slate-600">Calculated from product stock entries by category</p>
            </div>
            <div className="rounded-md bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {selectedInventoryItem ? `${selectedInventoryItem.category}: ${selectedInventoryItem.units} units` : 'No inventory data'}
            </div>
          </div>

          <div className="space-y-4">
            {inventoryDistribution.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-300 px-4 py-6 text-center text-sm text-slate-500">
                No inventory entries yet.
              </div>
            ) : (
              inventoryDistribution.map((item, index) => {
                const widthPercent = (item.units / inventoryMaxUnits) * 100;
                const isActive = index === activeInventoryIndex;

                return (
                  <button
                    key={item.category}
                    type="button"
                    onMouseEnter={() => setActiveInventoryIndex(index)}
                    onClick={() => setActiveInventoryIndex(index)}
                    className={`w-full rounded-lg border p-3 text-left transition ${
                      isActive
                        ? 'border-blue-200 bg-blue-50'
                        : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-sm font-semibold text-slate-900">{item.category}</span>
                      <span className="text-sm text-slate-700">{formatCurrency(item.totalValue)}</span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`h-3 rounded-full transition-all ${isActive ? 'bg-blue-600' : 'bg-slate-400'}`}
                        style={{ width: `${widthPercent}%` }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-slate-600">{item.units} units in stock</p>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function ProtechAdminView({ section = 'invoices' }) {
  return (
    <AdminDashboardRealtime section={section} />
  );
}

export function ProtechPriceManagerView() {
  const { priceEntries: localPriceList, setPriceEntries: setLocalPriceList } = useDashboardData();
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ status: 'active' });
  const [priceActions, setPriceActions] = useState([]);
  const [dateFilter, setDateFilter] = useState('');

  // Set up real-time polling for prices
  const { data: apiPriceList, lastUpdate: priceLastUpdate, refetch: refetchPrices } = useRealtimeData('/api/prices', {
    company: 'PROtech',
    pollInterval: 4000, // Poll every 4 seconds
    onDataChange: (newData) => {
      // Update local state when API data changes
      setLocalPriceList(newData);
    }
  });

  // Use API data if available, otherwise use local data
  const priceList = apiPriceList.length > 0 ? apiPriceList : localPriceList;
  const filteredPriceList = dateFilter
    ? priceList.filter((item) => item.lastUpdated === dateFilter)
    : priceList;

  const metrics = useMemo(() => {
    const activeProducts = filteredPriceList.filter((p) => p.status === 'active').length;
    const totalValue = filteredPriceList.reduce((sum, p) => sum + p.newPrice * p.stock, 0);
    const priceUpdates = filteredPriceList.filter((p) => p.newPrice !== p.currentPrice).length;
    return { activeProducts, totalValue, priceUpdates };
  }, [filteredPriceList]);

  const handleAddUpdate = async () => {
    if (!formData.sku || !formData.productName) return;

    const normalizedEntry = {
      ...formData,
      sku: (formData.sku || '').trim(),
      productName: (formData.productName || '').trim(),
      category: (formData.category || '').trim(),
      currentPrice: Number(formData.currentPrice) || 0,
      newPrice: Number(formData.newPrice) || 0,
      stock: Number(formData.stock) || 0,
      status: formData.status || 'active',
      lastUpdated: new Date().toISOString().split('T')[0],
      updatedBy: 'Price Manager'
    };

    if (editingId) {
      // Update via API
      const updatedRecord = { ...priceList.find(p => p.id === editingId), ...normalizedEntry };
      try {
        const response = await fetch('/api/prices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ company: 'PROtech', record: { id: editingId, ...normalizedEntry } })
        });
        if (response.ok) {
          setLocalPriceList((prev) =>
            prev.map((p) => (p.id === editingId ? { ...p, ...normalizedEntry } : p))
          );
          refetchPrices();
        }
      } catch (error) {
        console.error('Failed to update price:', error);
      }

      setPriceActions((prev) => [
        {
          id: `price-log-${Date.now()}`,
          message: `Updated ${normalizedEntry.sku} (${normalizedEntry.productName})`,
          timestamp: new Date().toLocaleTimeString()
        },
        ...prev
      ].slice(0, 8));
      setEditingId(null);
    } else {
      // Add new record via API
      const newEntry = { id: Date.now().toString(), ...normalizedEntry };
      try {
        const response = await fetch('/api/prices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ company: 'PROtech', record: newEntry })
        });
        if (response.ok) {
          setLocalPriceList((prev) => [...prev, newEntry]);
          refetchPrices();
        }
      } catch (error) {
        console.error('Failed to add price:', error);
      }

      setPriceActions((prev) => [
        {
          id: `price-log-${Date.now()}`,
          message: `Added ${newEntry.sku} (${newEntry.productName})`,
          timestamp: new Date().toLocaleTimeString()
        },
        ...prev
      ].slice(0, 8));
    }

    setFormData({ status: 'active' });
  };

  return (
    <div className="space-y-8">
      <div><h1 className="text-3xl font-bold text-slate-900 mb-2">PROtech FZCO - Price Manager</h1><p className="text-slate-600">Price List & Stock Updates <span className="text-xs text-slate-400 ml-2">• Auto-sync every 4 seconds</span></p></div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg"><Package className="w-6 h-6 mb-4" /><p className="text-green-100 text-sm mb-2">Total Incoming</p><p className="text-2xl font-bold">{metrics.inQty}</p></div><div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg"><TrendingUp className="w-6 h-6 mb-4" /><p className="text-orange-100 text-sm mb-2">Total Outgoing</p><p className="text-2xl font-bold">{metrics.outQty}</p></div><div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg"><BarChart3 className="w-6 h-6 mb-4" /><p className="text-blue-100 text-sm mb-2">Total Revenue</p><p className="text-2xl font-bold">{formatCurrency(metrics.total)}</p></div><div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg"><Download className="w-6 h-6 mb-4" /><p className="text-purple-100 text-sm mb-2">Transactions</p><p className="text-2xl font-bold">{(Array.isArray(priceList) ? priceList : []).filter((item) => item.status === 'completed').length}</p></div></div><div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 mb-8"><h2 className="text-xl font-bold text-slate-900 mb-6">Add/Update Price Entry</h2><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg"><TrendingUp className="w-6 h-6 mb-4" /><p className="text-green-100 text-sm mb-2">Total Inventory Value</p><p className="text-2xl font-bold">{formatCurrency(metrics.totalValue)}</p></div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg"><BarChart3 className="w-6 h-6 mb-4" /><p className="text-orange-100 text-sm mb-2">Price Updates</p><p className="text-2xl font-bold">{metrics.priceUpdates}</p></div>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 mb-8">
        <h2 className="text-xl font-bold text-slate-900 mb-6">Add/Update Price Entry</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <input type="text" placeholder="SKU" value={formData.sku || ''} onChange={(e) => setFormData({ ...formData, sku: e.target.value })} className="bg-white text-gray-900 placeholder-gray-400 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          <input type="text" placeholder="Product Name" value={formData.productName || ''} onChange={(e) => setFormData({ ...formData, productName: e.target.value })} className="bg-white text-gray-900 placeholder-gray-400 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          <input type="text" placeholder="Category" value={formData.category || ''} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="bg-white text-gray-900 placeholder-gray-400 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          <input type="number" placeholder="Current Price" value={formData.currentPrice || ''} onChange={(e) => setFormData({ ...formData, currentPrice: parseFloat(e.target.value) || 0 })} className="bg-white text-gray-900 placeholder-gray-400 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          <input type="number" placeholder="New Price" value={formData.newPrice || ''} onChange={(e) => setFormData({ ...formData, newPrice: parseFloat(e.target.value) || 0 })} className="bg-white text-gray-900 placeholder-gray-400 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          <input type="number" placeholder="Stock" value={formData.stock || ''} onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value, 10) || 0 })} className="bg-white text-gray-900 placeholder-gray-400 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          <select value={formData.status || ''} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="bg-white text-gray-900 placeholder-gray-400 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"><option value="active">Active</option><option value="inactive">Inactive</option></select>
          <div className="flex gap-3 col-span-full"><button onClick={handleAddUpdate} className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">{editingId ? 'Update' : 'Add'} Entry</button>{editingId && <button onClick={() => { setEditingId(null); setFormData({ status: 'active' }); }} className="px-6 py-2 bg-slate-400 text-white font-medium rounded-lg hover:bg-slate-500">Cancel</button>}</div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <h2 className="text-lg font-bold text-slate-900">Price History</h2>
          <div className="flex items-center gap-3">
            <label htmlFor="protech-price-date-filter" className="text-sm font-medium text-slate-700">Filter by Date:</label>
            <input id="protech-price-date-filter" type="date" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="bg-white px-3 py-2 text-slate-900 border border-gray-300 rounded-lg text-sm [color-scheme:light] focus:ring-2 focus:ring-blue-500" />
            {dateFilter && <button onClick={() => setDateFilter('')} className="text-xs px-3 py-2 bg-slate-200 text-slate-700 rounded-lg">Clear</button>}
          </div>
        </div>
        <h2 className="text-lg font-bold text-slate-900 mb-4">Recent Price Actions</h2>
        {priceActions.length === 0 ? (
          <p className="text-sm text-slate-500">No actions yet. Add or update an entry to log activity.</p>
        ) : (
          <div className="space-y-2">
            {priceActions.map((action) => (
              <div key={action.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <span className="text-slate-700">{action.message}</span>
                <span className="text-xs text-slate-500">{action.timestamp}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 border-b border-slate-200"><tr><th className="px-6 py-4 text-left font-bold text-slate-700">Last Updated</th><th className="px-6 py-4 text-left font-bold text-slate-700">SKU</th><th className="px-6 py-4 text-left font-bold text-slate-700">Product</th><th className="px-6 py-4 text-left font-bold text-slate-700">Category</th><th className="px-6 py-4 text-right font-bold text-slate-700">Current Price</th><th className="px-6 py-4 text-right font-bold text-slate-700">New Price</th><th className="px-6 py-4 text-right font-bold text-slate-700">Stock</th><th className="px-6 py-4 text-right font-bold text-slate-700">Total Value</th><th className="px-6 py-4 text-center font-bold text-slate-700">Status</th><th className="px-6 py-4 text-center font-bold text-slate-700">Actions</th></tr></thead>
        <tbody className="divide-y divide-slate-200">{filteredPriceList.map((item) => (<tr key={item.id} className="hover:bg-slate-50"><td className="px-6 py-4">{formatDate(item.lastUpdated)}</td><td className="px-6 py-4 font-mono text-blue-600">{item.sku}</td><td className="px-6 py-4">{item.productName}</td><td className="px-6 py-4">{item.category}</td><td className="px-6 py-4 text-right">{formatCurrency(item.currentPrice)}</td><td className="px-6 py-4 text-right font-medium">{formatCurrency(item.newPrice)}</td><td className="px-6 py-4 text-right">{item.stock}</td><td className="px-6 py-4 text-right font-medium">{formatCurrency(item.newPrice * item.stock)}</td><td className="px-6 py-4 text-center"><span className={`inline-block px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(item.status)}`}>{item.status}</span></td><td className="px-6 py-4 text-center"><button onClick={() => { setEditingId(item.id); setFormData(item); }} className="text-blue-600 hover:bg-blue-50 p-2 rounded"><Edit2 className="w-4 h-4" /></button></td></tr>))}</tbody>
      </table></div></div>
      </div>
    </div>
  );
}

export function ProtechSalesManagerView({ section = 'sales' }) {
  const { salesEntries: localSales, priceEntries: localPrices, setSalesEntries: setLocalSales } = useDashboardData();
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ type: 'incoming', status: 'pending', date: new Date().toISOString().split('T')[0], tax: '', customerName: '', customerPhone: '' });
  const [dateFilter, setDateFilter] = useState(''); // State for date filter
  const [salesActions, setSalesActions] = useState([]);

  // Set up real-time polling for sales
  const { data: apiSalesList, lastUpdate: salesLastUpdate, refetch: refetchSales } = useRealtimeData('/api/sales', {
    company: 'PROtech',
    pollInterval: 4000, // Poll every 4 seconds
    onDataChange: (newData) => {
      // Update local state when API data changes
      setLocalSales(newData);
    }
  });
  const { data: apiPriceList } = useRealtimeData('/api/prices', {
    company: 'PROtech',
    pollInterval: 4000
  });

  // Local state is updated immediately and refreshed by the polling callback.
  const sales = localSales;
  const catalog = apiPriceList.length > 0 ? apiPriceList : localPrices;

  // Filter sales by date if dateFilter is set
  const filteredSales = dateFilter 
    ? sales.filter((s) => s.date === dateFilter)
    : sales;

  const metrics = useMemo(() => {
    const incomingQty = filteredSales.filter((s) => s.type === 'incoming').reduce((sum, s) => sum + (Number(s.quantity) || 0), 0);
    const outgoingQty = filteredSales.filter((s) => s.type === 'outgoing').reduce((sum, s) => sum + (Number(s.quantity) || 0), 0);
    const totalValue = filteredSales.reduce((sum, s) => sum + (Number(s.totalValue) || 0), 0);
    const dailyAvg = filteredSales.length > 0 ? totalValue / filteredSales.length : 0;
    return { incomingQty, outgoingQty, totalValue, dailyAvg };
  }, [filteredSales]);

  const handleSkuChange = (sku) => {
    const catalogEntry = getCatalogEntry(catalog, sku);
    setFormData((current) => ({
      ...current,
      sku,
      ...(catalogEntry ? {
        productName: catalogEntry.productName || current.productName,
        unitPrice: Number(current.type === 'outgoing' ? catalogEntry.newPrice : catalogEntry.currentPrice) || current.unitPrice || 0,
        costPrice: Number(catalogEntry.currentPrice) || 0
      } : {})
    }));
  };
  const handleTypeChange = (type) => {
    const catalogEntry = getCatalogEntry(catalog, formData.sku);
    setFormData((current) => ({
      ...current,
      type,
      ...(catalogEntry ? {
        unitPrice: Number(type === 'outgoing' ? catalogEntry.newPrice : catalogEntry.currentPrice) || current.unitPrice || 0,
        costPrice: Number(catalogEntry.currentPrice) || 0
      } : {})
    }));
  };
  const getCurrentStock = (sku, excludeId = null) => sales.reduce((balance, sale) => {
    if (sale.id === excludeId || String(sale.sku || '').trim().toLowerCase() !== String(sku || '').trim().toLowerCase() || String(sale.status || '').toLowerCase() === 'cancelled') {
      return balance;
    }
    const quantity = Number(sale.quantity) || 0;
    return balance + (String(sale.type || '').toLowerCase() === 'incoming' ? quantity : -quantity);
  }, 0);

  const printReceipt = (sale) => {
    const receiptWindow = window.open('', '_blank', 'width=720,height=760');
    if (!receiptWindow) return;
    const quantity = Number(sale.quantity) || 0;
    const unitPrice = Number(sale.unitPrice) || 0;
    const totalValue = Number(sale.totalValue) || quantity * unitPrice;
    receiptWindow.document.write(`<!doctype html><html><head><title>PROtech Sales Receipt</title><style>body{font-family:Arial,sans-serif;color:#0f172a;margin:0;padding:32px}main{max-width:620px;margin:auto;border:1px solid #cbd5e1;padding:28px}header{display:flex;align-items:center;gap:18px;border-bottom:2px solid #2563eb;padding-bottom:18px}img{width:84px;height:64px;object-fit:contain}h1{font-size:24px;margin:0}h2{font-size:18px;margin:28px 0 12px}.row{display:flex;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding:10px 0}.total{font-size:20px;font-weight:700;color:#1d4ed8}</style></head><body><main><header><img src="${protechLogo.src}" alt="PROtech logo"><div><h1>PROtech FZCO</h1><div>Sales Receipt</div></div></header><h2>Transaction Details</h2><div class="row"><span>Date</span><strong>${sale.date || '-'}</strong></div><div class="row"><span>Type</span><strong>${sale.type || '-'}</strong></div><div class="row"><span>SKU</span><strong>${sale.sku || '-'}</strong></div><div class="row"><span>Product</span><strong>${sale.productName || '-'}</strong></div><div class="row"><span>Quantity</span><strong>${quantity}</strong></div><div class="row"><span>Unit Price</span><strong>${formatCurrency(unitPrice)}</strong></div><div class="row"><span>Total</span><strong class="total">${formatCurrency(totalValue)}</strong></div><h2>Customer Details</h2><div class="row"><span>Name</span><strong>${sale.customerName || 'Not provided'}</strong></div><div class="row"><span>Phone</span><strong>${sale.customerPhone || 'Not provided'}</strong></div></main><script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}</script></body></html>`);
    receiptWindow.document.close();
  };
  const handleAddUpdate = async () => {
    if (!formData.sku || !formData.productName || !formData.quantity) return;
    const actor = getSessionActor();

    const quantity = Number(formData.quantity) || 0;
    const transactionType = formData.type || 'incoming';
    if (transactionType === 'outgoing') {
      const availableStock = getCurrentStock(formData.sku, editingId);
      if (availableStock <= 0 || quantity > availableStock) {
        window.alert(`Insufficient stock for ${formData.sku}. Available quantity: ${availableStock}.`);
        return;
      }
      if (availableStock - quantity <= 5) {
        window.alert(`Low stock warning: ${availableStock - quantity} units will remain for ${formData.sku}.`);
      }
    }
    const unitPrice = Number(formData.unitPrice) || 0;
    const taxAmount = formData.tax ? Number(formData.tax) : 0;
    const totalValue = (quantity * unitPrice) + taxAmount;
    
    const nextData = {
      ...formData,
      sku: (formData.sku || '').trim(),
      productName: (formData.productName || '').trim(),
      salesperson: (formData.salesperson || '').trim(),
      customerName: (formData.customerName || '').trim(),
      customerPhone: (formData.customerPhone || '').trim(),
      quantity,
      unitPrice,
      costPrice: (formData.type || 'incoming') === 'outgoing' ? (Number(formData.costPrice) || 0) : undefined,
      totalValue,
      tax: formData.tax ? taxAmount : undefined,
      type: formData.type || 'incoming',
      status: formData.status || 'pending',
      date: formData.date || new Date().toISOString().split('T')[0]
    };

    if (editingId) {
      // Update via API
      try {
        const response = await fetch('/api/sales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ company: 'PROtech', userName: actor.name, record: { id: editingId, ...nextData } })
        });
        if (response.ok) {
          setLocalSales((prev) => prev.map((s) => (s.id === editingId ? { ...s, ...nextData } : s)));
          refetchSales();
        }
      } catch (error) {
        console.error('Failed to update sales:', error);
      }

      setSalesActions((prev) => [
        {
          id: `sales-log-${Date.now()}`,
          message: `Updated ${nextData.type} transaction for ${nextData.sku}`,
          timestamp: new Date().toLocaleTimeString()
        },
        ...prev
      ].slice(0, 8));
      setEditingId(null);
    } else {
      // Add new record via API
      const newRow = { id: Date.now().toString(), ...nextData };
      try {
        const response = await fetch('/api/sales', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ company: 'PROtech', userName: actor.name, record: newRow })
        });
        if (response.ok) {
          setLocalSales((prev) => [...prev, newRow]);
          refetchSales();
        }
      } catch (error) {
        console.error('Failed to add sales:', error);
      }

      setSalesActions((prev) => [
        {
          id: `sales-log-${Date.now()}`,
          message: `Added ${newRow.type} transaction for ${newRow.sku}`,
          timestamp: new Date().toLocaleTimeString()
        },
        ...prev
      ].slice(0, 8));
    }

    setFormData({ type: 'incoming', status: 'pending', date: new Date().toISOString().split('T')[0], tax: '', customerName: '', customerPhone: '' });
  };

  if (section === 'inventory') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">PROtech FZCO - Inventory Management</h1>
          <p className="mt-2 text-slate-600">Live stock levels and SKU tracking <span className="ml-2 text-xs text-slate-400">• Auto-sync every 4 seconds</span></p>
        </div>
        <ProtechSalesInventoryInsights sales={sales} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-bold text-slate-900 mb-2">PROtech FZCO - Sales Manager</h1><p className="text-slate-600">Incoming/Outgoing & Daily/Monthly Reports <span className="text-xs text-slate-400 ml-2">• Auto-sync every 4 seconds</span></p></div><SalesReport records={sales} company="PROtech" /></div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4"><div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg"><Package className="w-6 h-6 mb-4" /><p className="text-blue-100 text-sm mb-2">Total Incoming</p><p className="text-2xl font-bold">{metrics.incomingQty}</p></div><div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg"><TrendingUp className="w-6 h-6 mb-4" /><p className="text-orange-100 text-sm mb-2">Total Outgoing</p><p className="text-2xl font-bold">{metrics.outgoingQty}</p></div><div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg"><BarChart3 className="w-6 h-6 mb-4" /><p className="text-green-100 text-sm mb-2">Total Value</p><p className="text-2xl font-bold">{formatCurrency(metrics.totalValue)}</p></div><div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg"><Download className="w-6 h-6 mb-4" /><p className="text-purple-100 text-sm mb-2">Avg Transaction</p><p className="text-2xl font-bold">{formatCurrency(metrics.dailyAvg)}</p></div></div>

      <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 mb-8">
        <h2 className="text-xl font-bold text-slate-900 mb-6">Add Sales Entry</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <input type="date" value={formData.date || ''} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="bg-white text-gray-900 placeholder-gray-400 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          <select value={formData.type || ''} onChange={(e) => handleTypeChange(e.target.value)} className="bg-white text-gray-900 placeholder-gray-400 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"><option value="incoming">Incoming</option><option value="outgoing">Outgoing</option></select>
          <input list="protech-sales-sku-catalog" type="text" placeholder="SKU" value={formData.sku || ''} onChange={(e) => handleSkuChange(e.target.value)} className="bg-white text-gray-900 placeholder-gray-400 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          <datalist id="protech-sales-sku-catalog">{catalog.map((entry) => <option key={entry.id || entry.sku} value={entry.sku}>{entry.productName}</option>)}</datalist>
          <input type="text" placeholder="Product Name" value={formData.productName || ''} onChange={(e) => setFormData({ ...formData, productName: e.target.value })} className="bg-white text-gray-900 placeholder-gray-400 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          <input type="number" placeholder="Quantity" value={formData.quantity || ''} onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value, 10) || 0 })} className="bg-white text-gray-900 placeholder-gray-400 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          <input type="number" placeholder="Unit Price" value={formData.unitPrice || ''} onChange={(e) => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || 0 })} className="bg-white text-gray-900 placeholder-gray-400 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          <input type="number" placeholder="Tax Applied (Optional)" value={formData.tax || ''} onChange={(e) => setFormData({ ...formData, tax: parseFloat(e.target.value) || '' })} className="bg-white text-gray-900 placeholder-gray-400 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          <input type="text" placeholder="Salesperson" value={formData.salesperson || ''} onChange={(e) => setFormData({ ...formData, salesperson: e.target.value })} className="bg-white text-gray-900 placeholder-gray-400 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          <input type="text" placeholder="Customer Name (Optional)" value={formData.customerName || ''} onChange={(e) => setFormData({ ...formData, customerName: e.target.value })} className="bg-white text-gray-900 placeholder-gray-400 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          <input type="tel" placeholder="Phone Number (Optional)" value={formData.customerPhone || ''} onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })} className="bg-white text-gray-900 placeholder-gray-400 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          <select value={formData.status || ''} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="bg-white text-gray-900 placeholder-gray-400 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"><option value="pending">Pending</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select>
          <div className="md:col-span-4 lg:col-span-1 flex gap-3"><button onClick={handleAddUpdate} className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 flex-1">{editingId ? 'Update' : 'Add'}</button>{editingId && <button onClick={() => { setEditingId(null); setFormData({ type: 'incoming', status: 'pending', date: new Date().toISOString().split('T')[0], tax: '', customerName: '', customerPhone: '' }); }} className="px-6 py-2 bg-slate-400 text-white font-medium rounded-lg hover:bg-slate-500">Cancel</button>}</div>
        </div>
      </div>

  <ProtechSalesInventoryInsights sales={sales} />

      <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6">
        <h2 className="text-lg font-bold text-slate-900 mb-4">Recent Sales Actions</h2>
        {salesActions.length === 0 ? (
          <p className="text-sm text-slate-500">No actions yet. Add or update a sales entry to log activity.</p>
        ) : (
          <div className="space-y-2">
            {salesActions.map((action) => (
              <div key={action.id} className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm">
                <span className="text-slate-700">{action.message}</span>
                <span className="text-xs text-slate-500">{action.timestamp}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-900">Sales History</h2>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-700">Filter by Date:</label>
            <input 
              type="date" 
              value={dateFilter} 
              onChange={(e) => setDateFilter(e.target.value)}
              className="bg-white px-3 py-2 text-slate-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm [color-scheme:light]"
            />
            {dateFilter && (
              <button 
                onClick={() => setDateFilter('')}
                className="text-xs px-3 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300"
              >
                Clear
              </button>
            )}
          </div>
        </div>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 border-b border-slate-200"><tr><th className="px-6 py-4 text-left font-bold text-slate-700">Date</th><th className="px-6 py-4 text-left font-bold text-slate-700">Type</th><th className="px-6 py-4 text-left font-bold text-slate-700">SKU</th><th className="px-6 py-4 text-left font-bold text-slate-700">Product</th><th className="px-6 py-4 text-right font-bold text-slate-700">Qty</th><th className="px-6 py-4 text-right font-bold text-slate-700">Unit Price</th><th className="px-6 py-4 text-right font-bold text-slate-700">Tax</th><th className="px-6 py-4 text-right font-bold text-slate-700">Total</th><th className="px-6 py-4 text-left font-bold text-slate-700">Salesperson</th><th className="px-6 py-4 text-center font-bold text-slate-700">Status</th><th className="px-6 py-4 text-center font-bold text-slate-700">Actions</th></tr></thead>
      <tbody className="divide-y divide-slate-200">{filteredSales.map((s) => (<tr key={s.id} className="hover:bg-slate-50"><td className="px-6 py-4">{formatDate(s.date)}</td><td className="px-6 py-4"><span className={s.type === 'incoming' ? 'text-blue-600' : 'text-orange-600'}>{s.type}</span></td><td className="px-6 py-4 font-mono text-blue-600">{s.sku}</td><td className="px-6 py-4">{s.productName}</td><td className="px-6 py-4 text-right">{s.quantity}</td><td className="px-6 py-4 text-right">{formatCurrency(s.unitPrice)}</td><td className="px-6 py-4 text-right">{s.tax ? formatCurrency(s.tax) : '-'}</td><td className="px-6 py-4 text-right font-medium">{formatCurrency(s.totalValue)}</td><td className="px-6 py-4">{s.salesperson}</td><td className="px-6 py-4 text-center"><span className={`inline-block px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(s.status)}`}>{s.status}</span></td><td className="px-6 py-4 text-center"><div className="flex items-center justify-center gap-2"><button onClick={() => printReceipt(s)} className="rounded p-2 text-emerald-600 hover:bg-emerald-50" title="Print or save receipt"><FileText className="h-4 w-4" /></button><button onClick={() => { setEditingId(s.id); setFormData(s); }} className="text-blue-600 hover:bg-blue-50 p-2 rounded" title="Edit sale"><Edit2 className="w-4 h-4" /></button></div></td></tr>))}</tbody>
    </table></div></div>
    </div>
  );
}

export function ReviveAdminView({ section = 'invoices' }) {
  return (
    <AdminDashboardRealtime section={section} />
  );
}

export function ReviveSalesInventoryManagerView({ section = 'sales' }) {
  const { salesEntries: localSales, setSalesEntries: setLocalSales } = useDashboardData();
  const [editingId, setEditingId] = useState(null);
  const [dateFilter, setDateFilter] = useState('');
  const [formData, setFormData] = useState({
    type: 'incoming',
    status: 'pending',
    date: new Date().toISOString().split('T')[0],
    tax: ''
  });
  const { data: apiSales, refetch: refetchSales } = useRealtimeData('/api/sales', {
    company: 'Revive',
    pollInterval: 4000,
    onDataChange: setLocalSales
  });
  const salesEntries = localSales;
  const filteredSales = dateFilter
    ? salesEntries.filter((sale) => sale.date === dateFilter)
    : salesEntries;

  const metrics = useMemo(() => {
    const completed = filteredSales.filter((sale) => sale.status === 'completed');
    return {
      inQty: completed.filter((sale) => sale.type === 'incoming').reduce((sum, sale) => sum + (Number(sale.quantity) || 0), 0),
      outQty: completed.filter((sale) => sale.type === 'outgoing').reduce((sum, sale) => sum + (Number(sale.quantity) || 0), 0),
      total: completed.reduce((sum, sale) => sum + (Number(sale.totalValue) || 0), 0)
    };
  }, [filteredSales]);

  const printReceipt = (sale) => {
    const receiptWindow = window.open('', '_blank', 'width=720,height=760');
    if (!receiptWindow) return;
    const quantity = Number(sale.quantity) || 0;
    const unitPrice = Number(sale.unitPrice) || 0;
    const totalValue = Number(sale.totalValue) || quantity * unitPrice;
    receiptWindow.document.write(`<!doctype html><html><head><title>ReviveTech Sales Receipt</title><style>body{font-family:Arial,sans-serif;color:#0f172a;margin:0;padding:32px}main{max-width:620px;margin:auto;border:1px solid #cbd5e1;padding:28px}header{display:flex;align-items:center;gap:18px;border-bottom:2px solid #10b981;padding-bottom:18px}img{width:84px;height:64px;object-fit:contain}h1{font-size:24px;margin:0}h2{font-size:18px;margin:28px 0 12px}.row{display:flex;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding:10px 0}.total{font-size:20px;font-weight:700;color:#047857}</style></head><body><main><header><img src="${reviveLogo.src}" alt="Revive Tech logo"><div><h1>ReviveTech FZCO</h1><div>Technology Solutions &amp; Device Repair</div><div>Dubai, United Arab Emirates</div></div></header><h2>Sales Receipt</h2><div class="row"><span>Date</span><strong>${sale.date || '-'}</strong></div><div class="row"><span>Type</span><strong>${sale.type || '-'}</strong></div><div class="row"><span>SKU</span><strong>${sale.sku || '-'}</strong></div><div class="row"><span>Product</span><strong>${sale.productName || '-'}</strong></div><div class="row"><span>Quantity</span><strong>${quantity}</strong></div><div class="row"><span>Unit Price</span><strong>${formatCurrency(unitPrice)}</strong></div><div class="row"><span>Total</span><strong class="total">${formatCurrency(totalValue)}</strong></div><h2>Customer Details</h2><div class="row"><span>Name</span><strong>${sale.customerName || 'Not provided'}</strong></div><div class="row"><span>Phone</span><strong>${sale.customerPhone || 'Not provided'}</strong></div></main><script>window.onload=()=>{window.print();window.onafterprint=()=>window.close()}</script></body></html>`);
    receiptWindow.document.close();
  };

  const resetForm = () => setFormData({ type: 'incoming', status: 'pending', date: new Date().toISOString().split('T')[0], tax: '' });

  const handleAddUpdate = async () => {
    if (!formData.sku || !formData.productName || !formData.quantity) return;
    const actor = getSessionActor();
    const quantity = Number(formData.quantity) || 0;
    const unitPrice = Number(formData.unitPrice) || 0;
    const tax = formData.tax ? Number(formData.tax) : 0;
    const record = { ...formData, company: 'Revive', quantity, unitPrice, tax: formData.tax ? tax : undefined, totalValue: quantity * unitPrice + tax };
    const savedRecord = { id: editingId || Date.now().toString(), ...record };

    if (editingId) {
      await fetch('/api/sales', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ company: 'Revive', userName: actor.name, record: savedRecord }) });
      setLocalSales((current) => current.map((sale) => sale.id === editingId ? { ...sale, ...record } : sale));
      refetchSales();
      setEditingId(null);
    } else {
      await fetch('/api/sales', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ company: 'Revive', userName: actor.name, record: savedRecord }) });
      setLocalSales((current) => [...current, savedRecord]);
      refetchSales();
    }
    resetForm();
  };

  if (section === 'inventory') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Revive Tech - Inventory Management</h1>
          <p className="mt-2 text-slate-600">Live stock levels and SKU tracking <span className="ml-2 text-xs text-slate-400">• Auto-sync every 4 seconds</span></p>
        </div>
        <SalesInventoryInsights sales={salesEntries} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Revive Tech - Sales & Inventory</h1>
        <p className="text-slate-600">Incoming/Outgoing & Sales Reports</p>
        </div>
        <SalesReport records={salesEntries} company="Revive" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg"><Package className="w-6 h-6 mb-4" /><p className="text-blue-100 text-sm mb-2">Total Incoming</p><p className="text-2xl font-bold">{metrics.inQty}</p></div>
        <div className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl p-6 text-white shadow-lg"><TrendingUp className="w-6 h-6 mb-4" /><p className="text-orange-100 text-sm mb-2">Total Outgoing</p><p className="text-2xl font-bold">{metrics.outQty}</p></div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg"><BarChart3 className="w-6 h-6 mb-4" /><p className="text-green-100 text-sm mb-2">Total Value</p><p className="text-2xl font-bold">{formatCurrency(metrics.total)}</p></div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg"><Download className="w-6 h-6 mb-4" /><p className="text-purple-100 text-sm mb-2">Transactions</p><p className="text-2xl font-bold">{filteredSales.filter((sale) => sale.status === 'completed').length}</p></div>
      </div>
      <SalesInventoryInsights sales={salesEntries} />
      <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6">
        <h2 className="text-xl font-bold text-slate-900 mb-6">Add Sales Entry</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <input type="date" value={formData.date || ''} onChange={(event) => setFormData({ ...formData, date: event.target.value })} className="bg-white text-gray-900 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          <select value={formData.type || ''} onChange={(event) => setFormData({ ...formData, type: event.target.value })} className="bg-white text-gray-900 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"><option value="incoming">Incoming</option><option value="outgoing">Outgoing</option></select>
          <input type="text" placeholder="SKU" value={formData.sku || ''} onChange={(event) => setFormData({ ...formData, sku: event.target.value })} className="bg-white text-gray-900 placeholder-gray-400 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          <input type="text" placeholder="Product Name" value={formData.productName || ''} onChange={(event) => setFormData({ ...formData, productName: event.target.value })} className="bg-white text-gray-900 placeholder-gray-400 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          <input type="number" placeholder="Quantity" value={formData.quantity || ''} onChange={(event) => setFormData({ ...formData, quantity: parseInt(event.target.value, 10) || 0 })} className="bg-white text-gray-900 placeholder-gray-400 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          <input type="number" placeholder="Unit Price" value={formData.unitPrice || ''} onChange={(event) => setFormData({ ...formData, unitPrice: parseFloat(event.target.value) || 0 })} className="bg-white text-gray-900 placeholder-gray-400 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          <input type="number" placeholder="Tax Applied (Optional)" value={formData.tax || ''} onChange={(event) => setFormData({ ...formData, tax: parseFloat(event.target.value) || '' })} className="bg-white text-gray-900 placeholder-gray-400 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          <input type="text" placeholder="Salesperson" value={formData.salesperson || ''} onChange={(event) => setFormData({ ...formData, salesperson: event.target.value })} className="bg-white text-gray-900 placeholder-gray-400 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
          <select value={formData.status || ''} onChange={(event) => setFormData({ ...formData, status: event.target.value })} className="bg-white text-gray-900 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"><option value="pending">Pending</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select>
          <div className="md:col-span-4 lg:col-span-1 flex gap-3"><button onClick={handleAddUpdate} className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 flex-1">{editingId ? 'Update' : 'Add'}</button>{editingId && <button onClick={() => { setEditingId(null); resetForm(); }} className="px-6 py-2 bg-slate-400 text-white font-medium rounded-lg hover:bg-slate-500">Cancel</button>}</div>
        </div>
      </div>
      <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-slate-900">Sales History</h2>
          <div className="flex items-center gap-3"><label className="text-sm font-medium text-slate-700">Filter by Date:</label><input type="date" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)} className="bg-white text-slate-900 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 text-sm [color-scheme:light]" />{dateFilter && <button onClick={() => setDateFilter('')} className="text-xs px-3 py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300">Clear</button>}</div>
        </div>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 border-b border-slate-200"><tr><th className="px-6 py-4 text-left font-bold text-slate-700">Date</th><th className="px-6 py-4 text-left font-bold text-slate-700">Type</th><th className="px-6 py-4 text-left font-bold text-slate-700">SKU</th><th className="px-6 py-4 text-left font-bold text-slate-700">Product</th><th className="px-6 py-4 text-right font-bold text-slate-700">Qty</th><th className="px-6 py-4 text-right font-bold text-slate-700">Unit Price</th><th className="px-6 py-4 text-right font-bold text-slate-700">Tax</th><th className="px-6 py-4 text-right font-bold text-slate-700">Total</th><th className="px-6 py-4 text-left font-bold text-slate-700">Salesperson</th><th className="px-6 py-4 text-center font-bold text-slate-700">Status</th><th className="px-6 py-4 text-center font-bold text-slate-700">Actions</th></tr></thead><tbody className="divide-y divide-slate-200">
          {filteredSales.map((sale) => <tr key={sale.id} className="hover:bg-slate-50"><td className="px-6 py-4">{formatDate(sale.date)}</td><td className="px-6 py-4"><span className={sale.type === 'incoming' ? 'text-blue-600 font-medium' : 'text-orange-600 font-medium'}>{sale.type}</span></td><td className="px-6 py-4 font-mono text-blue-600">{sale.sku}</td><td className="px-6 py-4">{sale.productName}</td><td className="px-6 py-4 text-right">{sale.quantity}</td><td className="px-6 py-4 text-right">{formatCurrency(sale.unitPrice)}</td><td className="px-6 py-4 text-right">{sale.tax ? formatCurrency(sale.tax) : '-'}</td><td className="px-6 py-4 text-right font-medium">{formatCurrency(sale.totalValue)}</td><td className="px-6 py-4">{sale.salesperson}</td><td className="px-6 py-4 text-center"><span className={`inline-block px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(sale.status)}`}>{sale.status}</span></td><td className="px-6 py-4 text-center"><div className="flex items-center justify-center gap-2"><button onClick={() => printReceipt(sale)} className="rounded p-2 text-emerald-600 hover:bg-emerald-50" title="Print or save receipt"><FileText className="w-4 h-4" /></button><button onClick={() => { setEditingId(sale.id); setFormData(sale); }} className="text-blue-600 hover:bg-blue-50 p-2 rounded" title="Edit sale"><Edit2 className="w-4 h-4" /></button></div></td></tr>)}
        </tbody></table></div>
      </div>
    </div>
  );
}

export function ReviveStaffOutputManagerView() {
  const [localOutputs, setLocalOutputs] = useState([
    { id: '1', date: '2024-01-20', staffId: 'S001', staffName: 'Hassan Ali', department: 'Production', tasksCompleted: 15, qualityScore: 95, efficiency: 92, notes: 'Excellent work', status: 'reviewed' },
    { id: '2', date: '2024-01-20', staffId: 'S002', staffName: 'Maryam Khan', department: 'Assembly', tasksCompleted: 18, qualityScore: 98, efficiency: 96, notes: 'Outstanding performance', status: 'reviewed' }
  ]);
  const { data: apiOutputs, refetch: refetchOutputs } = useRealtimeData('/api/staff-output', {
    company: 'Revive',
    pollInterval: 4000,
    onDataChange: setLocalOutputs
  });
  const outputs = apiOutputs.length > 0 ? apiOutputs : localOutputs;
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ status: 'pending', date: new Date().toISOString().split('T')[0] });

  const metrics = useMemo(() => {
    const avgQuality = outputs.length > 0 ? Math.round(outputs.reduce((sum, o) => sum + o.qualityScore, 0) / outputs.length) : 0;
    const avgEfficiency = outputs.length > 0 ? Math.round(outputs.reduce((sum, o) => sum + o.efficiency, 0) / outputs.length) : 0;
    const totalTasks = outputs.reduce((sum, o) => sum + o.tasksCompleted, 0);
    const reviewed = outputs.filter((o) => o.status === 'reviewed').length;
    return { avgQuality, avgEfficiency, totalTasks, reviewed };
  }, [outputs]);

  const handleAddUpdate = async () => {
    if (!formData.staffId || !formData.staffName) return;
    const actor = getSessionActor();
    const record = { ...formData, company: 'Revive' };
    const savedRecord = { id: editingId || Date.now().toString(), ...record };
    if (editingId) {
      await fetch('/api/staff-output', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ company: 'Revive', userName: actor.name, record: savedRecord }) });
      setLocalOutputs((current) => current.map((output) => output.id === editingId ? { ...output, ...record } : output));
      refetchOutputs();
      setEditingId(null);
    } else {
      await fetch('/api/staff-output', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ company: 'Revive', userName: actor.name, record: savedRecord }) });
      setLocalOutputs((current) => [...current, savedRecord]);
      refetchOutputs();
    }
    setFormData({ status: 'pending', date: new Date().toISOString().split('T')[0] });
  };

  return (
    <div className="space-y-8">
      <div><h1 className="text-3xl font-bold text-slate-900 mb-2">Revive Tech - Staff Output Manager</h1><p className="text-slate-600">Staff Performance & Output Tracking</p></div>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4"><div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-6 text-white shadow-lg"><Award className="w-6 h-6 mb-4" /><p className="text-blue-100 text-sm mb-2">Avg Quality Score</p><p className="text-2xl font-bold">{metrics.avgQuality}%</p></div><div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-6 text-white shadow-lg"><TrendingUp className="w-6 h-6 mb-4" /><p className="text-green-100 text-sm mb-2">Avg Efficiency</p><p className="text-2xl font-bold">{metrics.avgEfficiency}%</p></div><div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-6 text-white shadow-lg"><Package className="w-6 h-6 mb-4" /><p className="text-purple-100 text-sm mb-2">Total Tasks Completed</p><p className="text-2xl font-bold">{metrics.totalTasks}</p></div><div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg"><CheckCircle className="w-6 h-6 mb-4" /><p className="text-indigo-100 text-sm mb-2">Reviewed Records</p><p className="text-2xl font-bold">{metrics.reviewed}</p></div></div>

      <div className="bg-white rounded-xl shadow-md border border-slate-200 p-6 mb-8"><h2 className="text-xl font-bold text-slate-900 mb-6">Record Staff Output</h2><div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6"><input type="date" value={formData.date || ''} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="bg-white text-gray-900 placeholder-gray-400 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" /><input type="text" placeholder="Staff ID" value={formData.staffId || ''} onChange={(e) => setFormData({ ...formData, staffId: e.target.value })} className="bg-white text-gray-900 placeholder-gray-400 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" /><input type="text" placeholder="Staff Name" value={formData.staffName || ''} onChange={(e) => setFormData({ ...formData, staffName: e.target.value })} className="bg-white text-gray-900 placeholder-gray-400 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" /><input type="text" placeholder="Department" value={formData.department || ''} onChange={(e) => setFormData({ ...formData, department: e.target.value })} className="bg-white text-gray-900 placeholder-gray-400 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" /><input type="number" placeholder="Tasks Completed" value={formData.tasksCompleted || ''} onChange={(e) => setFormData({ ...formData, tasksCompleted: parseInt(e.target.value, 10) || 0 })} className="bg-white text-gray-900 placeholder-gray-400 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" /><input type="number" placeholder="Quality Score %" min="0" max="100" value={formData.qualityScore || ''} onChange={(e) => setFormData({ ...formData, qualityScore: parseInt(e.target.value, 10) || 0 })} className="bg-white text-gray-900 placeholder-gray-400 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" /><input type="number" placeholder="Efficiency %" min="0" max="100" value={formData.efficiency || ''} onChange={(e) => setFormData({ ...formData, efficiency: parseInt(e.target.value, 10) || 0 })} className="bg-white text-gray-900 placeholder-gray-400 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" /><select value={formData.status || ''} onChange={(e) => setFormData({ ...formData, status: e.target.value })} className="bg-white text-gray-900 placeholder-gray-400 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"><option value="pending">Pending</option><option value="reviewed">Reviewed</option></select><textarea placeholder="Notes" value={formData.notes || ''} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="bg-white text-gray-900 placeholder-gray-400 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 col-span-full resize-none" rows={2} /><div className="flex gap-3 col-span-full"><button onClick={handleAddUpdate} className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">{editingId ? 'Update' : 'Add'} Record</button>{editingId && <button onClick={() => { setEditingId(null); setFormData({ status: 'pending' }); }} className="px-6 py-2 bg-slate-400 text-white font-medium rounded-lg hover:bg-slate-500">Cancel</button>}</div></div></div>
      <div className="bg-white rounded-xl shadow-md border border-slate-200 overflow-hidden"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 border-b border-slate-200"><tr><th className="px-6 py-4 text-left font-bold text-slate-700">Date</th><th className="px-6 py-4 text-left font-bold text-slate-700">Staff Name</th><th className="px-6 py-4 text-left font-bold text-slate-700">Department</th><th className="px-6 py-4 text-center font-bold text-slate-700">Tasks</th><th className="px-6 py-4 text-center font-bold text-slate-700">Quality</th><th className="px-6 py-4 text-center font-bold text-slate-700">Efficiency</th><th className="px-6 py-4 text-center font-bold text-slate-700">Status</th><th className="px-6 py-4 text-center font-bold text-slate-700">Action</th></tr></thead><tbody className="divide-y divide-slate-200">{outputs.map((output) => (<tr key={output.id} className="hover:bg-slate-50"><td className="px-6 py-4">{formatDate(output.date)}</td><td className="px-6 py-4 font-medium">{output.staffName}</td><td className="px-6 py-4">{output.department}</td><td className="px-6 py-4 text-center font-medium">{output.tasksCompleted}</td><td className="px-6 py-4 text-center"><span className={`font-bold ${output.qualityScore >= 90 ? 'text-green-600' : output.qualityScore >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>{output.qualityScore}%</span></td><td className="px-6 py-4 text-center"><span className={`font-bold ${output.efficiency >= 90 ? 'text-green-600' : output.efficiency >= 80 ? 'text-yellow-600' : 'text-red-600'}`}>{output.efficiency}%</span></td><td className="px-6 py-4 text-center"><span className={`inline-block px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(output.status)}`}>{output.status}</span></td><td className="px-6 py-4 text-center"><button onClick={() => { setEditingId(output.id); setFormData(output); }} className="text-blue-600 hover:bg-blue-50 p-2 rounded"><Edit2 className="w-4 h-4" /></button></td></tr>))}</tbody></table></div></div>
    </div>
  );
}

export function ChangePasswordView({ user }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New password and confirmation do not match');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          company: user.company_name,
          currentPassword,
          newPassword
        })
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to change password');
        setLoading(false);
        return;
      }

      setSuccess('Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setLoading(false);
    } catch (err) {
      setError('An error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-xl font-semibold text-slate-900">Update Password</h3>
      <p className="mt-2 text-sm text-slate-600">
        Use your current password to authorize a secure password change.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 max-w-xl space-y-5">
        <div>
          <label htmlFor="currentPassword" className="mb-2 block text-sm font-semibold text-slate-900">
            Current Password
          </label>
          <PasswordInput
            id="currentPassword"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Enter current password"
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 placeholder-slate-500 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            required
            autoComplete="current-password"
          />
        </div>

        <div>
          <label htmlFor="newPassword" className="mb-2 block text-sm font-semibold text-slate-900">
            New Password
          </label>
          <PasswordInput
            id="newPassword"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Minimum 6 characters"
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 placeholder-slate-500 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            minLength={6}
            required
            autoComplete="new-password"
          />
        </div>

        <div>
          <label htmlFor="confirmPassword" className="mb-2 block text-sm font-semibold text-slate-900">
            Confirm New Password
          </label>
          <PasswordInput
            id="confirmPassword"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Re-enter new password"
            className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 placeholder-slate-500 transition focus:border-transparent focus:outline-none focus:ring-2 focus:ring-blue-500"
            minLength={6}
            required
            autoComplete="new-password"
          />
        </div>

        {error && (
          <div className="rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
            {error}
          </div>
        )}

        {success && (
          <div className="rounded-lg border border-green-300 bg-green-50 px-4 py-3 text-sm font-medium text-green-800">
            {success}
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-slate-900 px-4 py-2.5 font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Updating...' : 'Change Password'}
        </button>
      </form>
    </div>
  );
}
