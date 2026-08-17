'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, FileSpreadsheet, FileText, X } from 'lucide-react';
import { renderCompanyLogo } from '../../lib/pdfReport';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

function normalizeCompany(company) {
  return company === 'Revive' || company === 'revive' ? 'Revive' : 'PROtech';
}

function belongsToCompany(record, company) {
  const recordCompany = record.company || record.company_name;
  return recordCompany ? normalizeCompany(recordCompany) === normalizeCompany(company) : false;
}

function getReportRows(records, month, year, company) {
  const prefix = `${year}-${String(month + 1).padStart(2, '0')}`;
  const grouped = new Map();

  records.filter((record) => belongsToCompany(record, company) && String(record.date || '').startsWith(prefix)).forEach((record) => {
    const employeeName = record.employeeName || record.employee || record.name || 'Unknown Employee';
    const employeeId = record.employeeId || record.employeeID || record.id || '-';
    const key = `${employeeId}::${employeeName}`;
    const row = grouped.get(key) || {
      employeeName,
      employeeId,
      present: 0,
      absent: 0,
      leave: 0,
      halfDay: 0
    };
    const status = String(record.status || '').toLowerCase();

    if (status === 'present' || status === 'remote') row.present += 1;
    if (status === 'absent') row.absent += 1;
    if (status === 'leave') row.leave += 1;
    if (status === 'half-day' || status === 'halfday' || status === 'half day') row.halfDay += 1;
    grouped.set(key, row);
  });

  return [...grouped.values()].sort((left, right) => left.employeeName.localeCompare(right.employeeName));
}

export default function AttendanceReport({ records, company }) {
  const now = new Date();
  const [isOpen, setIsOpen] = useState(false);
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const reportRows = useMemo(() => getReportRows(records, month, year, company), [records, month, year, company]);
  const monthLabel = `${MONTHS[month]} ${year}`;
  const filePrefix = `${company}-${year}-${String(month + 1).padStart(2, '0')}-attendance-report`;

  const exportExcel = async () => {
    const XLSX = await import('xlsx');
    const sheetRows = reportRows.map((row) => ({
      'Employee Name': row.employeeName,
      'Employee ID': row.employeeId,
      'Total Days Present': row.present,
      'Total Absents': row.absent,
      'Total Leaves': row.leave,
      'Total Half-Days': row.halfDay
    }));
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(sheetRows);
    worksheet['!cols'] = [
      { wch: 24 }, { wch: 16 }, { wch: 20 }, { wch: 16 }, { wch: 16 }, { wch: 18 }
    ];
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Summary');
    XLSX.writeFile(workbook, `${filePrefix}.xlsx`);
  };

  const exportPdf = async () => {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const columns = [
      ['Employee Name', 18], ['Employee ID', 78], ['Present', 118],
      ['Absent', 148], ['Leaves', 178], ['Half-Days', 208]
    ];
    pdf.setFillColor(15, 23, 42);
    pdf.rect(14, 14, pageWidth - 28, 22, 'F');
    await renderCompanyLogo(pdf, company);
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(16);
    pdf.text(`${company} Monthly Attendance Report`, 48, 24);
    pdf.setFontSize(10);
    pdf.text(monthLabel, 48, 30);
    pdf.setTextColor(15, 23, 42);
    pdf.setFontSize(9);
    let y = 48;

    const drawHeader = () => {
      pdf.setFillColor(226, 232, 240);
      pdf.rect(14, y - 6, pageWidth - 28, 9, 'F');
      pdf.setFont('helvetica', 'bold');
      columns.forEach(([label, x]) => pdf.text(label, x, y));
      pdf.setFont('helvetica', 'normal');
      y += 10;
    };

    drawHeader();
    reportRows.forEach((row) => {
      if (y > 188) {
        pdf.addPage();
        y = 18;
        drawHeader();
      }
      pdf.line(14, y - 5, pageWidth - 14, y - 5);
      pdf.text(String(row.employeeName).slice(0, 28), columns[0][1], y);
      pdf.text(String(row.employeeId).slice(0, 16), columns[1][1], y);
      pdf.text(String(row.present), columns[2][1], y);
      pdf.text(String(row.absent), columns[3][1], y);
      pdf.text(String(row.leave), columns[4][1], y);
      pdf.text(String(row.halfDay), columns[5][1], y);
      y += 9;
    });

    if (reportRows.length === 0) {
      pdf.text('No attendance records found for this month.', 18, y + 8);
    }
    pdf.setFontSize(8);
    pdf.setTextColor(100, 116, 139);
    pdf.text(`Generated on ${new Date().toLocaleDateString('en-GB')}`, 14, 202);
    pdf.save(`${filePrefix}.pdf`);
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="w-full md:w-auto px-4 py-2 border border-slate-300 bg-white text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
      >
        <CalendarDays className="w-4 h-4" />
        Export Report
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="attendance-report-title">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="attendance-report-title" className="text-lg font-bold text-slate-900">Export Monthly Attendance</h2>
                <p className="mt-1 text-sm text-slate-600">Choose the reporting period for {company}.</p>
              </div>
              <button onClick={() => setIsOpen(false)} className="p-1 text-slate-400 hover:text-slate-700" aria-label="Close report dialog">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <label className="text-sm font-medium text-slate-700">
                Month
                <select value={month} onChange={(event) => setMonth(Number(event.target.value))} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900">
                  {MONTHS.map((label, index) => <option key={label} value={index}>{label}</option>)}
                </select>
              </label>
              <label className="text-sm font-medium text-slate-700">
                Year
                <input type="number" min="2000" max="2100" value={year} onChange={(event) => setYear(Number(event.target.value) || now.getFullYear())} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900" />
              </label>
            </div>
            <p className="mt-4 text-sm text-slate-500">{reportRows.length} employee summaries ready for {monthLabel}.</p>
            <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <button onClick={exportExcel} className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-3 py-2.5 text-sm font-semibold text-white hover:bg-emerald-700">
                <FileSpreadsheet className="h-4 w-4" /> Excel (.xlsx)
              </button>
              <button onClick={exportPdf} className="flex items-center justify-center gap-2 rounded-lg bg-slate-800 px-3 py-2.5 text-sm font-semibold text-white hover:bg-slate-900">
                <FileText className="h-4 w-4" /> PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}