'use client';

import { useMemo, useState } from 'react';
import { CalendarDays, FileSpreadsheet, FileText, X } from 'lucide-react';
import { renderCompanyLogo } from '../../lib/pdfReport';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const normalizeCompany = (company) => company === 'Revive' || company === 'revive' ? 'Revive' : 'PROtech';

function belongsToCompany(record, company) {
  const recordCompany = record.company || record.company_name;
  return recordCompany ? normalizeCompany(recordCompany) === normalizeCompany(company) : false;
}

function getRows(records, company, mode, month, year, startDate, endDate) {
  return records.filter((record) => {
    if (!belongsToCompany(record, company) || !record.date) return false;
    const date = String(record.date).slice(0, 10);
    if (mode === 'custom') return (!startDate || date >= startDate) && (!endDate || date <= endDate);
    return date.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`);
  });
}

export default function SalesReport({ records, company }) {
  const now = new Date();
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState('monthly');
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const reportRows = useMemo(() => getRows(records, company, mode, month, year, startDate, endDate), [records, company, mode, month, year, startDate, endDate]);
  const periodLabel = mode === 'custom' ? `${startDate || 'Start'} to ${endDate || 'End'}` : `${MONTHS[month]} ${year}`;
  const filePrefix = `${normalizeCompany(company)}-${mode === 'custom' ? 'custom' : `${year}-${String(month + 1).padStart(2, '0')}`}-sales-report`;

  const exportExcel = async () => {
    const XLSX = await import('xlsx');
    const rows = reportRows.map((record) => ({
      Date: record.date,
      Type: record.type || '',
      SKU: record.sku || '',
      Product: record.productName || '',
      Quantity: Number(record.quantity) || 0,
      'Unit Price': Number(record.unitPrice) || 0,
      Tax: Number(record.tax) || 0,
      Total: Number(record.totalValue) || 0,
      Salesperson: record.salesperson || '',
      Status: record.status || ''
    }));
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    worksheet['!cols'] = [
      { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 24 }, { wch: 12 },
      { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 20 }, { wch: 14 }
    ];
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sales Report');
    XLSX.writeFile(workbook, `${filePrefix}.xlsx`, { bookType: 'xlsx', compression: true });
  };

  const exportPdf = async () => {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const columns = [
      ['Date', 18], ['Type', 48], ['SKU', 76], ['Product', 108],
      ['Qty', 158], ['Total', 180], ['Salesperson', 218], ['Status', 258]
    ];
    pdf.setFillColor(15, 23, 42);
    pdf.rect(14, 14, pageWidth - 28, 22, 'F');
    await renderCompanyLogo(pdf, company);
    pdf.setTextColor(255, 255, 255);
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(20);
    pdf.text(`${normalizeCompany(company)} Sales Report`, 54, 24);
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);
    pdf.text(periodLabel, 54, 30);
    let y = 50;
    const drawHeader = () => {
      pdf.setFillColor(226, 232, 240);
      pdf.roundedRect(14, y - 7, pageWidth - 28, 11, 1.5, 1.5, 'F');
      pdf.setTextColor(15, 23, 42);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(10);
      columns.forEach(([label, x]) => pdf.text(label, x, y));
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      y += 12;
    };
    drawHeader();
    reportRows.forEach((record) => {
      if (y > 188) { pdf.addPage(); y = 18; drawHeader(); }
      pdf.setDrawColor(203, 213, 225);
      pdf.line(14, y - 7, pageWidth - 14, y - 7);
      [String(record.date).slice(0, 10), record.type || '-', record.sku || '-', record.productName || '-', String(record.quantity || 0), `AED ${Number(record.totalValue || 0).toFixed(2)}`, record.salesperson || '-', record.status || '-'].forEach((value, index) => pdf.text(String(value).slice(0, index === 3 ? 32 : 20), columns[index][1], y));
      y += 11;
    });
    if (!reportRows.length) {
      pdf.setFontSize(10);
      pdf.text('No sales records found for this period.', 18, y + 8);
    }
    pdf.save(`${filePrefix}.pdf`);
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto">
        <CalendarDays className="h-4 w-4" /> Export Report
      </button>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-labelledby="sales-report-title">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="border-b border-slate-200 bg-slate-50 px-6 py-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 id="sales-report-title" className="text-xl font-bold text-slate-950">Export Sales Report</h2>
                  <p className="mt-1 text-sm text-slate-600">Only {normalizeCompany(company)} records are included.</p>
                </div>
                <button onClick={() => setIsOpen(false)} className="rounded-lg p-1.5 text-slate-500 transition hover:bg-slate-200 hover:text-slate-900" aria-label="Close report dialog">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="space-y-6 p-6">
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <button onClick={() => setMode('monthly')} className={`rounded-lg border px-4 py-2.5 text-sm font-bold transition ${mode === 'monthly' ? 'border-blue-600 bg-blue-600 text-white shadow-sm' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>Monthly</button>
                <button onClick={() => setMode('custom')} className={`rounded-lg border px-4 py-2.5 text-sm font-bold transition ${mode === 'custom' ? 'border-blue-600 bg-blue-600 text-white shadow-sm' : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50'}`}>Custom Range</button>
              </div>
              {mode === 'monthly' ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-bold text-slate-800">Month<select value={month} onChange={(event) => setMonth(Number(event.target.value))} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">{MONTHS.map((label, index) => <option key={label} value={index}>{label}</option>)}</select></label>
                  <label className="block text-sm font-bold text-slate-800">Year<input type="number" value={year} onChange={(event) => setYear(Number(event.target.value) || now.getFullYear())} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <label className="block text-sm font-bold text-slate-800">Start<input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
                  <label className="block text-sm font-bold text-slate-800">End<input type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm font-medium text-slate-900 shadow-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" /></label>
                </div>
              )}
              <div className="rounded-lg bg-slate-50 px-4 py-3 text-sm font-medium text-slate-600">{reportRows.length} records ready for <span className="font-bold text-slate-900">{periodLabel}</span>.</div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <button onClick={exportExcel} className="flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-200"><FileSpreadsheet className="h-4 w-4" /> Excel</button>
                <button onClick={exportPdf} className="flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-200"><FileText className="h-4 w-4" /> PDF</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}