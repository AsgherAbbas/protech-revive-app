'use client';

import React, { useState, useCallback, useRef, createContext, useContext } from 'react';
import {
  FileText,
  Users,
  Upload,
  X,
  Download,
  Trash2,
  Eye,
  CheckCircle,
  Bell,
  Home,
  Edit2,
  Save
} from 'lucide-react';
import { useDashboardData } from './context';
import { useRealtimeData } from '../../hooks/useRealtimeData';
import { EnhancedInvoicesTab } from './invoices-enhanced';
import AttendanceReport from './attendance-report';

const RealtimeContext = createContext(undefined);

export function RealtimeProvider({ children }) {
  const [notifications, setNotifications] = useState([]);
  const [recentEvents, setRecentEvents] = useState([]);

  const addNotification = useCallback((notif) => {
    const newNotif = {
      ...notif,
      id: `notif-${Date.now()}`,
      timestamp: new Date(),
      isRead: false
    };
    setNotifications((prev) => [newNotif, ...prev].slice(0, 50));
  }, []);

  const markNotificationRead = useCallback((id) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  const syncEvent = useCallback(
    (event) => {
      setRecentEvents((prev) => [event, ...prev].slice(0, 20));

      if (event.type === 'invoice') {
        if (event.action === 'created') {
          addNotification({
            type: 'invoice_uploaded',
            title: 'Invoice Uploaded',
            message: `Invoice ${event.data.invoiceNumber} uploaded by ${event.employeeName}`,
            actionType: 'view_invoice'
          });
        } else if (event.action === 'updated') {
          addNotification({
            type: 'invoice_approved',
            title: 'Invoice Updated',
            message: `Invoice status changed to ${event.data.status}`,
            actionType: 'view_invoice'
          });
        }
      } else if (event.type === 'attendance') {
        addNotification({
          type: 'attendance_marked',
          title: 'Attendance Recorded',
          message: `Attendance marked for ${event.employeeName} - ${event.data.status}`,
          actionType: 'view_attendance'
        });
      } else if (event.type === 'employee_update') {
        addNotification({
          type: 'employee_update',
          title: 'Employee Update',
          message: `${event.employeeName} updated ${event.data.updateType}`,
          employeeName: event.employeeName
        });
      }
    },
    [addNotification]
  );

  return (
    <RealtimeContext.Provider
      value={{ notifications, addNotification, markNotificationRead, clearNotifications, syncEvent, recentEvents }}
    >
      {children}
    </RealtimeContext.Provider>
  );
}

export function useRealtime() {
  const context = useContext(RealtimeContext);
  if (!context) throw new Error('useRealtime must be used within RealtimeProvider');
  return context;
}

const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${Math.round((bytes / Math.pow(k, i)) * 100) / 100} ${sizes[i]}`;
};

const formatDate = (date) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dubai',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(d);
};

const formatTime = (time) => {
  if (!time) return '--:--';
  
  try {
    // Check if it's a simple time string (HH:MM or HH:MM:SS format)
    if (typeof time === 'string' && /^\d{2}:\d{2}/.test(time)) {
      return time.substring(0, 5); // Return just HH:MM
    }
    
    // Otherwise, treat it as a timestamp
    const d = typeof time === 'string' ? new Date(time) : time;
    
    // Check if the date is valid
    if (Number.isNaN(d.getTime())) {
      return '--:--';
    }
    
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Dubai',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(d);
  } catch (error) {
    // If any error occurs during date parsing or formatting, return fallback
    return '--:--';
  }
};

const calculateHours = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 0;
  const [inH, inM] = checkIn.split(':').map(Number);
  const [outH, outM] = checkOut.split(':').map(Number);
  const inMinutes = inH * 60 + inM;
  const outMinutes = outH * 60 + outM;
  return (outMinutes - inMinutes) / 60;
};

const getStatusColor = (status) => {
  const colors = {
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    approved: 'bg-green-100 text-green-800 border-green-300',
    rejected: 'bg-red-100 text-red-800 border-red-300',
    present: 'bg-green-100 text-green-800 border-green-300',
    absent: 'bg-red-100 text-red-800 border-red-300',
    leave: 'bg-blue-100 text-blue-800 border-blue-300',
    'half-day': 'bg-orange-100 text-orange-800 border-orange-300',
    remote: 'bg-purple-100 text-purple-800 border-purple-300'
  };
  return colors[status] || colors.pending;
};

const getStatusBgColor = (status) => {
  switch (status) {
    case 'present':
      return 'bg-green-50';
    case 'absent':
      return 'bg-red-50';
    case 'leave':
      return 'bg-blue-50';
    case 'half-day':
      return 'bg-orange-50';
    case 'remote':
      return 'bg-purple-50';
    default:
      return 'bg-slate-50';
  }
};

function getSessionActor() {
  if (typeof window === 'undefined') {
    return { name: 'Admin', company: 'PROtech' };
  }

  try {
    const raw = window.localStorage.getItem('user');
    if (!raw) {
      return { name: 'Admin', company: 'PROtech' };
    }

    const parsed = JSON.parse(raw);
    return {
      name: parsed?.name || 'Admin',
      company: parsed?.company_name === 'Revive' ? 'Revive' : 'PROtech'
    };
  } catch {
    return { name: 'Admin', company: 'PROtech' };
  }
}

function FilePreviewModal({ file, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-white border-b border-slate-200 p-4 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-900">{file.fileName}</h3>
            <p className="text-xs text-slate-600 mt-1">
              {file.invoiceNumber} • {formatFileSize(file.fileSize)}
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-6 bg-slate-50">
          {file.fileType === 'image' ? (
            <img src={file.previewUrl} alt={file.fileName} className="max-w-full h-auto rounded mx-auto" />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-500">
              <FileText className="w-16 h-16 mb-4" />
              <p className="text-sm font-medium">{file.fileName}</p>
              <p className="text-xs mt-2 text-center">
                PDF preview not available in browser.
                <br />
                Click download to view the full document.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InvoicesTab() {
  const actor = getSessionActor();
  return <EnhancedInvoicesTab company={actor.company} />;
}

function AttendanceTab() {
  const [localAttendance, setLocalAttendance] = useState([]);

  const [editingId, setEditingId] = useState(null);
  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0]);
  const { addNotification, syncEvent } = useRealtime();

  // Set up real-time polling for attendance
  const actor = getSessionActor();
  const { data: apiAttendance, lastUpdate: attendanceLastUpdate, refetch: refetchAttendance } = useRealtimeData('/api/attendance', {
    company: actor.company,
    pollInterval: 4000, // Poll every 4 seconds
    onDataChange: (newData) => {
      setLocalAttendance(newData);
    }
  });

  // Always use localAttendance for rendering - it's the single source of truth
  const attendance = localAttendance;

  const handleCellEdit = (id, field, value) => {
    setLocalAttendance((prev) =>
      prev.map((rec) => {
        if (rec.id === id) {
          const updated = { ...rec, [field]: value };
          if (field === 'checkInTime' || field === 'checkOutTime') {
            updated.hours = calculateHours(updated.checkInTime, updated.checkOutTime);
          }
          return updated;
        }
        return rec;
      })
    );
  };

  const handleSaveRow = async (id) => {
    const record = localAttendance.find((a) => a.id === id);
    if (record) {
      // Save to API immediately
      try {
        const response = await fetch('/api/attendance', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ company: actor.company, userName: actor.name, record })
        });
        if (response.ok) {
          // Refetch to ensure sync
          setTimeout(() => refetchAttendance(), 100);
        }
      } catch (error) {
        console.error('Failed to save attendance:', error);
      }

      syncEvent({
        id: `event-${Date.now()}`,
        type: 'attendance',
        action: 'updated',
        data: record,
        timestamp: new Date(),
        userId: 'admin-aqeel',
        employeeName: record.employeeName
      });

      addNotification({
        type: 'attendance_marked',
        title: 'Attendance Updated',
        message: `Attendance updated for ${record.employeeName}`,
        actionType: 'view_attendance'
      });
    }
    setEditingId(null);
  };

  const handleAddNew = async () => {
    const newRecord = {
      id: `att-${Date.now()}`,
      employeeId: '',
      employeeName: '',
      department: '',
      date: filterDate,
      status: 'present',
      checkInTime: '',
      checkOutTime: '',
      hours: 0,
      notes: ''
    };
    
    // Add to local state immediately so it appears in the grid
    setLocalAttendance((prev) => [newRecord, ...prev]);
    
    // Save to API
    try {
      const response = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company: actor.company, userName: actor.name, record: newRecord })
      });
      if (response.ok) {
        setTimeout(() => refetchAttendance(), 100);
      }
    } catch (error) {
      console.error('Failed to add attendance record:', error);
    }
    
    // Set to editing mode so user can fill in data
    setEditingId(newRecord.id);
  };

  const handleDelete = async (id) => {
    const record = localAttendance.find((a) => a.id === id);
    if (record) {
      // Delete from API
      try {
        const response = await fetch(`/api/attendance?company=${actor.company}&id=${id}&userName=${encodeURIComponent(actor.name)}`, {
          method: 'DELETE'
        });
        if (!response.ok) {
          throw new Error('Failed to delete attendance record');
        }
        setLocalAttendance((prev) => prev.filter((attendance) => attendance.id !== id));
        await refetchAttendance();
      } catch (error) {
        console.error('Failed to delete attendance:', error);
        return;
      }

    }

  };

  const filteredAttendance = attendance.filter((a) => a.date === filterDate);

  const stats = {
    present: filteredAttendance.filter((a) => a.status === 'present').length,
    absent: filteredAttendance.filter((a) => a.status === 'absent').length,
    leave: filteredAttendance.filter((a) => a.status === 'leave').length,
    remote: filteredAttendance.filter((a) => a.status === 'remote').length
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Present', value: stats.present, color: 'bg-green-50 text-green-700 border-green-200' },
          { label: 'Absent', value: stats.absent, color: 'bg-red-50 text-red-700 border-red-200' },
          { label: 'Leave', value: stats.leave, color: 'bg-blue-50 text-blue-700 border-blue-200' },
          { label: 'Remote', value: stats.remote, color: 'bg-purple-50 text-purple-700 border-purple-200' }
        ].map((stat) => (
          <div key={stat.label} className={`border ${stat.color} rounded-lg p-4`}>
            <p className="text-xs font-medium opacity-75">{stat.label}</p>
            <p className="text-2xl font-bold mt-2">{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="w-full md:flex-1">
          <label className="block text-sm font-medium text-slate-900 mb-2">Date</label>
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="w-full max-w-full bg-white text-gray-900 placeholder-gray-400 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex w-full flex-col items-stretch gap-3 md:w-auto md:flex-row md:items-center">
          <span className="text-xs text-slate-500">🔄 Auto-sync every 4 seconds</span>
          <button
            onClick={handleAddNew}
            className="w-full px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 md:w-auto"
          >
            <Users className="w-5 h-5" />
            Add Record
          </button>
          <div className="w-full md:w-auto">
            <AttendanceReport records={attendance} company={actor.company} />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h3 className="font-bold text-slate-900">Attendance Grid</h3>
          <p className="text-sm text-slate-600 mt-1">
            {filteredAttendance.length} records for {formatDate(filterDate)}
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-200">
                <th className="px-4 py-3 text-left font-bold text-slate-700 w-32">Employee</th>
                <th className="px-4 py-3 text-left font-bold text-slate-700 w-28">Emp ID</th>
                <th className="px-4 py-3 text-left font-bold text-slate-700 w-28">Department</th>
                <th className="px-4 py-3 text-center font-bold text-slate-700 w-32">Status</th>
                <th className="px-4 py-3 text-center font-bold text-slate-700 w-24">Check In</th>
                <th className="px-4 py-3 text-center font-bold text-slate-700 w-24">Check Out</th>
                <th className="px-4 py-3 text-center font-bold text-slate-700 w-20">Hours</th>
                <th className="px-4 py-3 text-left font-bold text-slate-700 flex-1">Notes</th>
                <th className="px-4 py-3 text-center font-bold text-slate-700 w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredAttendance.map((record) => (
                <tr key={record.id} className={`border-b border-slate-200 ${getStatusBgColor(record.status)}`}>
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {editingId === record.id ? (
                      <input
                        type="text"
                        value={record.employeeName}
                        onChange={(e) => handleCellEdit(record.id, 'employeeName', e.target.value)}
                        className="w-full bg-white text-gray-900 placeholder-gray-400 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      record.employeeName
                    )}
                  </td>

                  <td className="px-4 py-3 font-mono text-blue-600 text-xs">
                    {editingId === record.id ? (
                      <input
                        type="text"
                        value={record.employeeId}
                        onChange={(e) => handleCellEdit(record.id, 'employeeId', e.target.value)}
                        className="w-full bg-white text-gray-900 placeholder-gray-400 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      record.employeeId
                    )}
                  </td>

                  <td className="px-4 py-3">
                    {editingId === record.id ? (
                      <input
                        type="text"
                        value={record.department}
                        onChange={(e) => handleCellEdit(record.id, 'department', e.target.value)}
                        className="w-full bg-white text-gray-900 placeholder-gray-400 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      record.department
                    )}
                  </td>

                  <td className="px-4 py-3 text-center">
                    {editingId === record.id ? (
                      <select
                        value={record.status}
                        onChange={(e) => handleCellEdit(record.id, 'status', e.target.value)}
                        className={`w-full bg-white text-gray-900 placeholder-gray-400 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-xs font-medium ${getStatusColor(record.status)}`}
                      >
                        <option value="present">Present</option>
                        <option value="absent">Absent</option>
                        <option value="leave">Leave</option>
                        <option value="half-day">Half Day</option>
                        <option value="remote">Remote</option>
                      </select>
                    ) : (
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded border ${getStatusColor(record.status)}`}>
                        {record.status}
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-center font-mono">
                    {editingId === record.id ? (
                      <input
                        type="time"
                        value={record.checkInTime}
                        onChange={(e) => handleCellEdit(record.id, 'checkInTime', e.target.value)}
                        className="w-full bg-white text-gray-900 placeholder-gray-400 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    ) : (
                      formatTime(record.checkInTime)
                    )}
                  </td>

                  <td className="px-4 py-3 text-center font-mono">
                    {editingId === record.id ? (
                      <input
                        type="time"
                        value={record.checkOutTime}
                        onChange={(e) => handleCellEdit(record.id, 'checkOutTime', e.target.value)}
                        className="w-full bg-white text-gray-900 placeholder-gray-400 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    ) : (
                      formatTime(record.checkOutTime)
                    )}
                  </td>

                  <td className="px-4 py-3 text-center font-medium">{record.hours.toFixed(2)}</td>

                  <td className="px-4 py-3">
                    {editingId === record.id ? (
                      <input
                        type="text"
                        value={record.notes}
                        onChange={(e) => handleCellEdit(record.id, 'notes', e.target.value)}
                        className="w-full bg-white text-gray-900 placeholder-gray-400 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    ) : (
                      <span className="text-slate-600">{record.notes || '-'}</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-center">
                    {editingId === record.id ? (
                      <button
                        onClick={() => handleSaveRow(record.id)}
                        className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors"
                        title="Save"
                      >
                        <Save className="w-4 h-4" />
                      </button>
                    ) : (
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setEditingId(record.id)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(record.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredAttendance.length === 0 && (
            <div className="p-12 text-center text-slate-500">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p className="font-medium">No attendance records for this date</p>
              <p className="text-sm mt-1">Click "Add Record" to create one</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function NotificationPanel() {
  const { notifications, markNotificationRead, recentEvents } = useRealtime();
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-slate-900 flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Recent Activity
          </h3>
          {unreadCount > 0 && <span className="text-xs font-bold bg-red-500 text-white rounded-full px-2 py-1">{unreadCount} new</span>}
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="py-8 text-center text-slate-500">
              <Bell className="w-8 h-8 mx-auto mb-3 opacity-50" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            notifications.slice(0, 10).map((notif) => (
              <div
                key={notif.id}
                onClick={() => markNotificationRead(notif.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${notif.isRead ? 'bg-white border-slate-200' : 'bg-blue-50 border-blue-300'}`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-lg flex-shrink-0 ${
                      notif.type === 'invoice_uploaded' || notif.type === 'invoice_approved'
                        ? 'bg-blue-100 text-blue-600'
                        : 'bg-green-100 text-green-600'
                    }`}
                  >
                    {notif.type.includes('invoice') ? (
                      <FileText className="w-4 h-4" />
                    ) : (
                      <CheckCircle className="w-4 h-4" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{notif.title}</p>
                    <p className="text-xs text-slate-600 mt-1">{notif.message}</p>
                    <p className="text-xs text-slate-500 mt-2">{new Date(notif.timestamp).toLocaleTimeString()}</p>
                  </div>
                  {!notif.isRead && <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0 mt-1" />}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <h3 className="font-bold text-slate-900 mb-4">System Events</h3>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {recentEvents.length === 0 ? (
            <div className="py-8 text-center text-slate-500 text-sm">No events logged</div>
          ) : (
            recentEvents.slice(0, 8).map((event) => (
              <div key={event.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs">
                <p className="font-medium text-slate-900">
                  {event.employeeName} {event.action}ed {event.type}
                </p>
                <p className="text-slate-600 mt-1">{new Date(event.timestamp).toLocaleTimeString()}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function SectionHeader({ title }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-700">
          <Home className="h-5 w-5" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-600">{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>
    </div>
  );
}

export default function AdminDashboardRealtime({ section = 'invoices' }) {
  const sectionMap = {
    invoices: { title: 'Invoice Management', content: <InvoicesTab /> },
    attendance: { title: 'Attendance Management', content: <AttendanceTab /> },
    activity: { title: 'Activity & Notifications', content: <NotificationPanel /> }
  };

  const selectedSection = sectionMap[section] || sectionMap.invoices;

  return (
    <RealtimeProvider>
      <div className="space-y-6">
        <SectionHeader title={selectedSection.title} />
        {selectedSection.content}
      </div>
    </RealtimeProvider>
  );
}
