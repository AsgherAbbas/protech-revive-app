'use client';

import React, { useState, useRef, useCallback, useMemo } from 'react';
import { X, Eye, Download, Trash2, Calendar, Filter, FileText, Upload } from 'lucide-react';
import { useRealtimeData } from '../../hooks/useRealtimeData';
import { useDashboardData } from './context';
import { InvoiceGenerator } from './invoice-generator';
import { getCompanyBranding, calculateInvoiceTotals, getCompanyLogo } from '../../lib/invoiceConfig';

const formatCurrency = (value) => value != null
  ? `AED ${Number(value).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  : 'AED 0.00';

const formatDate = (date) => {
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Dubai',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  }).format(d);
};

const getStatusColor = (status) => {
  const colors = {
    draft: 'bg-slate-100 text-slate-800 border-slate-300',
    pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    approved: 'bg-green-100 text-green-800 border-green-300',
    sent: 'bg-blue-100 text-blue-800 border-blue-300',
    paid: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    cancelled: 'bg-red-100 text-red-800 border-red-300',
    overdue: 'bg-orange-100 text-orange-800 border-orange-300'
  };
  return colors[status] || colors.draft;
};

function FilePreviewModal({ file, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
        <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white">
          <h3 className="text-lg font-bold text-slate-900">{file.fileName}</h3>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6">
          {file.fileType === 'image' && (
            <img src={file.previewUrl} alt={file.fileName} className="max-w-full h-auto mx-auto" />
          )}
          {file.fileType === 'pdf' && (
            <div className="text-center py-12 text-slate-600">
              <p>PDF preview not available in browser.</p>
              <button
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = file.previewUrl;
                  link.download = file.fileName;
                  link.click();
                }}
                className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Download PDF
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function EnhancedInvoicesTab({ company = 'PROtech', invoiceType = 'generated' }) {
  const { invoices: localInvoices, setInvoices: setLocalInvoices } = useDashboardData();
  const [selectedFile, setSelectedFile] = useState(null);
  const [dateFilter, setDateFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedInvoiceForPDF, setSelectedInvoiceForPDF] = useState(null);
  const [showExternalUpload, setShowExternalUpload] = useState(false);
  const [externalInvoice, setExternalInvoice] = useState({
    supplier: '',
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    amount: '',
    notes: ''
  });
  const [externalAttachment, setExternalAttachment] = useState(null);
  const [externalUploadError, setExternalUploadError] = useState('');
  const fileInputRef = useRef(null);
  const invoicePreviewRef = useRef(null);
  const branding = getCompanyBranding(company);
  const filterControlClassName = 'bg-white text-slate-900 placeholder:text-slate-400 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent';
  const isExternalView = invoiceType === 'external';

  // Set up real-time polling for invoices
  const { data: apiInvoices, lastUpdate: invoiceLastUpdate, refetch: refetchInvoices } = useRealtimeData('/api/invoices', {
    company,
    pollInterval: 4000,
    onDataChange: (newData) => {
      setLocalInvoices(newData);
    }
  });

  // Use local invoices as single source of truth
  const allInvoices = localInvoices.filter((invoice) => (
    isExternalView ? invoice.invoiceType === 'external' : invoice.invoiceType !== 'external'
  ));

  // Filter invoices
  const filteredInvoices = useMemo(() => {
    let result = allInvoices;

    if (statusFilter) {
      result = result.filter((inv) => (inv.status || '').toLowerCase() === statusFilter.toLowerCase());
    }

    if (dateFilter) {
      result = result.filter((inv) => {
        const invDate = new Date(inv.createdDate || inv.invoiceDate || '').toISOString().split('T')[0];
        return invDate === dateFilter;
      });
    }

    return result.sort((a, b) => new Date(b.createdDate || b.invoiceDate || 0) - new Date(a.createdDate || a.invoiceDate || 0));
  }, [allInvoices, statusFilter, dateFilter]);

  // Calculate summary metrics
  const metrics = useMemo(() => {
    const total = filteredInvoices.length;
    const paid = filteredInvoices.filter((i) => (i.status || '').toLowerCase() === 'paid').length;
    const pending = filteredInvoices.filter(
      (i) => ['pending', 'draft', 'sent'].includes((i.status || '').toLowerCase())
    ).length;
    const totalValue = filteredInvoices.reduce((sum, inv) => sum + (Number(inv.total) || Number(inv.amount) || 0), 0);

    return { total, paid, pending, totalValue };
  }, [filteredInvoices]);

  const handleStatusChange = (id, status) => {
    const currentUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
    const userName = currentUser.name || currentUser.userName || 'System';
    setLocalInvoices((prev) =>
      prev.map((inv) =>
        inv.id === id
          ? {
              ...inv,
              status,
              updatedAt: new Date().toISOString()
            }
          : inv
      )
    );

    // Save to API
    fetch('/api/invoices', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ company, userName, record: { id, status, updatedAt: new Date().toISOString() } })
    }).catch((err) => console.error('Failed to update invoice status:', err));
  };

  const handleDelete = async (id) => {
    // Get current user from localStorage or use default
    const currentUser = typeof window !== 'undefined' ? localStorage.getItem('currentUserName') || 'System' : 'System';

    // Delete from API
    try {
      const response = await fetch(`/api/invoices?company=${company}&id=${id}&userName=${encodeURIComponent(currentUser)}`, {
        method: 'DELETE'
      });
      if (!response.ok) {
        throw new Error('Unable to delete the invoice.');
      }
      setLocalInvoices((previous) => previous.filter((invoice) => invoice.id !== id));
      await refetchInvoices();
    } catch (error) {
      console.error('Failed to delete invoice:', error);
    }
  };

  const handleExternalAttachmentChange = (event) => {
    const file = event.target.files?.[0];
    setExternalUploadError('');

    if (!file) {
      setExternalAttachment(null);
      return;
    }

    if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setExternalUploadError('Upload a PDF, JPG, PNG, or WebP receipt.');
      event.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setExternalUploadError('Attachments must be 5 MB or smaller.');
      event.target.value = '';
      return;
    }

    setExternalAttachment(file);
  };

  const handleExternalInvoiceUpload = async () => {
    if (!externalInvoice.supplier.trim() || !externalAttachment) {
      setExternalUploadError('Supplier name and an original receipt file are required.');
      return;
    }

    const attachmentData = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(new Error('Unable to read the receipt file.'));
      reader.readAsDataURL(externalAttachment);
    });
    const currentUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('user') || '{}') : {};
    const record = {
      id: `ext-inv-${Date.now()}`,
      invoiceNumber: externalInvoice.invoiceNumber.trim() || `EXT-${Date.now()}`,
      company,
      invoiceType: 'external',
      clientName: externalInvoice.supplier.trim(),
      invoiceDate: externalInvoice.invoiceDate,
      notes: externalInvoice.notes.trim(),
      subtotal: Number(externalInvoice.amount) || 0,
      tax: 0,
      taxRate: null,
      total: Number(externalInvoice.amount) || 0,
      status: 'received',
      attachmentName: externalAttachment.name,
      attachmentType: externalAttachment.type,
      attachmentData,
      createdAt: new Date().toISOString(),
      createdDate: new Date().toISOString().split('T')[0]
    };

    try {
      const response = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company, userName: currentUser.name || currentUser.userName || 'System', record })
      });
      if (!response.ok) {
        throw new Error('Unable to save the external invoice.');
      }

      setLocalInvoices((previous) => [record, ...previous]);
      setExternalInvoice({ supplier: '', invoiceNumber: '', invoiceDate: new Date().toISOString().split('T')[0], amount: '', notes: '' });
      setExternalAttachment(null);
      setShowExternalUpload(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await refetchInvoices();
    } catch (error) {
      setExternalUploadError(error.message || 'Unable to upload the external invoice.');
    }
  };

  const downloadAttachment = (invoice) => {
    if (!invoice.attachmentData) return;
    const link = document.createElement('a');
    link.href = invoice.attachmentData;
    link.download = invoice.attachmentName || 'external-invoice';
    link.click();
  };

  const handleExportPDF = async (invoice) => {
    try {
      const { html2canvas, jsPDF } = await import('html2canvas').then((m) => ({
        html2canvas: m.default,
        jsPDF: import('jspdf').then((j) => j.jsPDF)
      })).then(async (m) => ({
        html2canvas: m.html2canvas,
        jsPDF: (await m.jsPDF)
      }));

      if (!invoicePreviewRef.current) return;

      const canvas = await html2canvas(invoicePreviewRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

      const fileName = `${invoice.invoiceNumber || 'invoice'}-${invoice.clientName.replace(/\s+/g, '_')}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('Failed to export PDF');
    }
  };

  return (
    <div className="space-y-6">
      {!isExternalView && (
        <InvoiceGenerator
          company={company}
          onInvoiceGenerated={() => {
            setTimeout(() => refetchInvoices(), 100);
          }}
        />
      )}

      {isExternalView && <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-slate-900">External Invoices & Receipts</h3>
            <p className="mt-1 text-sm text-slate-600">Store a received supplier invoice or physical office receipt with its original file.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowExternalUpload((visible) => !visible)}
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 font-medium text-white hover:bg-slate-800"
          >
            <Upload className="h-4 w-4" />
            Upload External Invoice
          </button>
        </div>

        {showExternalUpload && (
          <div className="mt-5 grid grid-cols-1 gap-4 border-t border-slate-200 pt-5 md:grid-cols-2">
            <input
              type="text"
              placeholder="Supplier or source name *"
              value={externalInvoice.supplier}
              onChange={(event) => setExternalInvoice({ ...externalInvoice, supplier: event.target.value })}
              className={`px-4 py-2 ${filterControlClassName}`}
            />
            <input
              type="text"
              placeholder="External invoice or receipt number"
              value={externalInvoice.invoiceNumber}
              onChange={(event) => setExternalInvoice({ ...externalInvoice, invoiceNumber: event.target.value })}
              className={`px-4 py-2 ${filterControlClassName}`}
            />
            <input
              type="date"
              value={externalInvoice.invoiceDate}
              onChange={(event) => setExternalInvoice({ ...externalInvoice, invoiceDate: event.target.value })}
              className={`px-4 py-2 ${filterControlClassName}`}
            />
            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Amount (AED)"
              value={externalInvoice.amount}
              onChange={(event) => setExternalInvoice({ ...externalInvoice, amount: event.target.value })}
              className={`px-4 py-2 ${filterControlClassName}`}
            />
            <textarea
              placeholder="Notes"
              value={externalInvoice.notes}
              onChange={(event) => setExternalInvoice({ ...externalInvoice, notes: event.target.value })}
              className={`min-h-24 px-4 py-2 md:col-span-2 ${filterControlClassName}`}
            />
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium text-slate-700">Original receipt or invoice *</label>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp"
                onChange={handleExternalAttachmentChange}
                className="block w-full text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-slate-100 file:px-4 file:py-2 file:font-medium file:text-slate-800 hover:file:bg-slate-200"
              />
              {externalAttachment && <p className="mt-2 text-xs text-slate-600">Attached: {externalAttachment.name}</p>}
              {externalUploadError && <p className="mt-2 text-sm text-red-600">{externalUploadError}</p>}
            </div>
            <div className="flex justify-end md:col-span-2">
              <button type="button" onClick={handleExternalInvoiceUpload} className="rounded-lg bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700">
                Save External Invoice
              </button>
            </div>
          </div>
        )}
      </div>}

      {/* Filters Section */}
      <div className="bg-white rounded-lg border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <Filter className="w-5 h-5 text-slate-600" />
          <h3 className="font-semibold text-slate-900">Filter & Search</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Filter by Date</label>
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-400" />
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className={`flex-1 px-4 py-2 ${filterControlClassName}`}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Filter by Status</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={`w-full px-4 py-2 ${filterControlClassName}`}
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Results</label>
            <div className="flex items-center h-10 px-4 bg-slate-50 rounded-lg text-sm font-medium text-slate-700">
              {filteredInvoices.length} invoice{filteredInvoices.length !== 1 ? 's' : ''} found
            </div>
          </div>
        </div>
        {(dateFilter || statusFilter) && (
          <button
            onClick={() => {
              setDateFilter('');
              setStatusFilter('');
            }}
            className="mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-xs text-slate-600 uppercase font-semibold">Total Invoices</p>
          <p className="mt-2 text-3xl font-bold text-slate-900">{metrics.total}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-xs text-slate-600 uppercase font-semibold">Paid</p>
          <p className="mt-2 text-3xl font-bold text-emerald-600">{metrics.paid}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-xs text-slate-600 uppercase font-semibold">Pending</p>
          <p className="mt-2 text-3xl font-bold text-amber-600">{metrics.pending}</p>
        </div>
        <div className="bg-white rounded-lg border border-slate-200 p-4">
          <p className="text-xs text-slate-600 uppercase font-semibold">Total Value</p>
          <p className="mt-2 text-2xl font-bold text-blue-600">{formatCurrency(metrics.totalValue)}</p>
        </div>
      </div>

      {/* Invoices Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-200">
          <h3 className="font-bold text-slate-900">{isExternalView ? 'External Invoice History' : 'Invoice History'}</h3>
          <p className="text-sm text-slate-600 mt-1">Last updated: {invoiceLastUpdate ? new Date(invoiceLastUpdate).toLocaleTimeString() : 'Never'}</p>
        </div>
        {filteredInvoices.length === 0 ? (
          <div className="p-8 text-center text-slate-600">
            <FileText className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <p>No invoices found{dateFilter || statusFilter ? ' matching your filters' : ''}.</p>
            {!dateFilter && !statusFilter && <p className="text-sm mt-2">Create your first invoice using the form above.</p>}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-left font-bold text-slate-700">Invoice #</th>
                  <th className="px-6 py-4 text-left font-bold text-slate-700">Client</th>
                  <th className="px-6 py-4 text-left font-bold text-slate-700">Date</th>
                  <th className="px-6 py-4 text-right font-bold text-slate-700">Amount</th>
                  <th className="px-6 py-4 text-center font-bold text-slate-700">Status</th>
                  <th className="px-6 py-4 text-center font-bold text-slate-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4 font-mono text-blue-600 font-medium text-xs">
                      <div>{invoice.invoiceNumber}</div>
                      {invoice.invoiceType === 'external' && <span className="mt-1 inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-700">External</span>}
                    </td>
                    <td className="px-6 py-4 text-slate-900">
                      <div>
                        <p className="font-medium">{invoice.clientName}</p>
                        {invoice.clientEmail && <p className="text-xs text-slate-500 mt-0.5">{invoice.clientEmail}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{formatDate(invoice.invoiceDate || invoice.createdDate)}</td>
                    <td className="px-6 py-4 text-right font-medium text-slate-900">
                      {formatCurrency(invoice.total || invoice.amount)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <select
                        value={invoice.status || 'draft'}
                        onChange={(e) => handleStatusChange(invoice.id, e.target.value)}
                        className={`px-3 py-1 text-xs font-medium rounded-full border ${getStatusColor(invoice.status)} cursor-pointer`}
                      >
                        <option value="draft">Draft</option>
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="sent">Sent</option>
                        <option value="paid">Paid</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => invoice.attachmentData
                            ? setSelectedFile({ fileName: invoice.attachmentName, fileType: invoice.attachmentType === 'application/pdf' ? 'pdf' : 'image', previewUrl: invoice.attachmentData })
                            : setSelectedInvoiceForPDF(invoice)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title={invoice.attachmentData ? 'View attachment' : 'Preview'}
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {invoice.attachmentData ? (
                          <button onClick={() => downloadAttachment(invoice)} className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors" title="Download attachment">
                            <Download className="w-4 h-4" />
                          </button>
                        ) : (
                          <button onClick={() => handleExportPDF(invoice)} className="p-2 text-green-600 hover:bg-green-50 rounded transition-colors" title="Export PDF">
                            <Download className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(invoice.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedFile && <FilePreviewModal file={selectedFile} onClose={() => setSelectedFile(null)} />}

      {/* Invoice Preview Modal */}
      {selectedInvoiceForPDF && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-6 border-b border-slate-200 sticky top-0 bg-white">
              <h3 className="text-lg font-bold text-slate-900">Invoice {selectedInvoiceForPDF.invoiceNumber}</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => handleExportPDF(selectedInvoiceForPDF)}
                  className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export PDF
                </button>
                <button
                  onClick={() => setSelectedInvoiceForPDF(null)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div ref={invoicePreviewRef} className="bg-white p-8 space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between pb-6 border-b-2" style={{ borderColor: branding.colors.primary }}>
                <div className="flex items-center gap-4">
                  {/* Company Logo */}
                  <img 
                      src={getCompanyLogo(selectedInvoiceForPDF?.company || company)} 
                    alt={branding.name}
                    className="h-16 w-auto object-contain"
                    crossOrigin="anonymous"
                  />
                </div>
                <div className="text-right">
                  <p className="text-4xl font-bold" style={{ color: branding.colors.primary }}>
                    INVOICE
                  </p>
                  <p className="text-sm font-mono text-slate-700 mt-2">{selectedInvoiceForPDF.invoiceNumber}</p>
                </div>
              </div>

              {/* Company & Client */}
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <p className="text-xs font-semibold text-slate-700 uppercase mb-2">From</p>
                  <div className="text-sm text-slate-700 space-y-1">
                    <p className="font-semibold">{branding.legalName}</p>
                    <p>{branding.location}</p>
                    {(selectedInvoiceForPDF?.company || company) !== 'Revive' && <>
                      <p>{branding.contact.phone}</p>
                      <p>{branding.contact.email}</p>
                    </>}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-700 uppercase mb-2">Bill To</p>
                  <div className="text-sm text-slate-700 space-y-1">
                    <p className="font-semibold">{selectedInvoiceForPDF.clientName}</p>
                    {selectedInvoiceForPDF.clientAddress && <p>{selectedInvoiceForPDF.clientAddress}</p>}
                    {selectedInvoiceForPDF.clientPhone && <p>{selectedInvoiceForPDF.clientPhone}</p>}
                    {selectedInvoiceForPDF.clientEmail && <p>{selectedInvoiceForPDF.clientEmail}</p>}
                  </div>
                </div>
              </div>

              {/* Meta */}
              <div className="grid grid-cols-4 gap-4 py-4 bg-slate-50 px-4 rounded-lg">
                <div>
                  <p className="text-xs font-semibold text-slate-700">Date</p>
                  <p className="text-sm font-mono text-slate-900">{formatDate(selectedInvoiceForPDF.invoiceDate)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-700">Due Date</p>
                  <p className="text-sm font-mono text-slate-900">{selectedInvoiceForPDF.dueDate ? formatDate(selectedInvoiceForPDF.dueDate) : '--'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-700">PO Number</p>
                  <p className="text-sm font-mono text-slate-900">{selectedInvoiceForPDF.poNumber || '--'}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-700">Status</p>
                  <span
                    className={`text-xs font-semibold px-2 py-1 rounded mt-1 inline-block ${getStatusColor(selectedInvoiceForPDF.status)}`}
                  >
                    {selectedInvoiceForPDF.status || 'Draft'}
                  </span>
                </div>
              </div>

              {/* Items */}
              {selectedInvoiceForPDF.items && selectedInvoiceForPDF.items.length > 0 && (
                <table className="w-full">
                  <thead>
                    <tr style={{ backgroundColor: branding.colors.primary + '15', borderBottom: `2px solid ${branding.colors.primary}` }}>
                      <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Description</th>
                      <th className="text-center py-3 px-4 text-sm font-semibold text-slate-900">Qty</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-900">Unit Price</th>
                      <th className="text-right py-3 px-4 text-sm font-semibold text-slate-900">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoiceForPDF.items.map((item, idx) => (
                      <tr key={item.id || idx} className={idx % 2 === 0 ? 'bg-slate-50' : ''}>
                        <td className="py-3 px-4 text-sm text-slate-900">{item.description}</td>
                        <td className="py-3 px-4 text-center text-sm text-slate-900">{item.quantity}</td>
                        <td className="py-3 px-4 text-right text-sm text-slate-900">{formatCurrency(item.unitPrice)}</td>
                        <td className="py-3 px-4 text-right text-sm font-medium text-slate-900">
                          {formatCurrency((item.quantity || 0) * (Number(item.unitPrice) || 0))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {/* Totals */}
              <div className="flex justify-end">
                <div className="w-80 space-y-2">
                  <div className="flex justify-between py-2 border-b border-slate-300">
                    <span className="text-sm text-slate-700">Subtotal</span>
                    <span className="text-sm font-medium text-slate-900">
                      {formatCurrency(selectedInvoiceForPDF.subtotal || 0)}
                    </span>
                  </div>
                  {selectedInvoiceForPDF.tax > 0 && (
                    <div className="flex justify-between py-2 border-b border-slate-300">
                      <span className="text-sm text-slate-700">VAT ({selectedInvoiceForPDF.taxRate || 5}%)</span>
                      <span className="text-sm font-medium text-slate-900">{formatCurrency(selectedInvoiceForPDF.tax || 0)}</span>
                    </div>
                  )}
                  <div className="flex justify-between py-3 px-4 rounded-lg text-white" style={{ backgroundColor: branding.colors.primary }}>
                    <span className="font-semibold">Total</span>
                    <span className="font-bold text-lg">{formatCurrency(selectedInvoiceForPDF.total || selectedInvoiceForPDF.amount || 0)}</span>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {selectedInvoiceForPDF.notes && (
                <div className="pt-6 border-t border-slate-300">
                  <p className="text-xs font-semibold text-slate-700 uppercase mb-2">Notes</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{selectedInvoiceForPDF.notes}</p>
                </div>
              )}

              {/* Footer */}
              <div className="pt-6 border-t border-slate-300 text-center">
                <p className="text-xs text-slate-600">Thank you for your business</p>
                <p className="text-xs text-slate-500 mt-2">{branding.description}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function ExternalInvoicesTab({ company = 'PROtech' }) {
  return <EnhancedInvoicesTab company={company} invoiceType="external" />;
}
