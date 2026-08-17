'use client';

import React, { useRef, useState, useMemo, useCallback } from 'react';
import { X, Plus, Trash2, Download, Eye, Calendar } from 'lucide-react';
import {
  getCompanyBranding,
  generateInvoiceNumber,
  calculateInvoiceTotals,
  getCompanyLogo
} from '../../lib/invoiceConfig';

// PDF Generation using html2canvas and jsPDF
const loadPdfLibs = async () => {
  const html2canvas = (await import('html2canvas')).default;
  const jsPDF = (await import('jspdf')).jsPDF;
  return { html2canvas, jsPDF };
};

export function InvoiceGenerator({ company = 'PROtech', onInvoiceGenerated = () => {} }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    clientAddress: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    dueDate: '',
    poNumber: '',
    description: '',
    items: [{ id: '1', description: '', quantity: 1, unitPrice: 0 }],
    notes: '',
    taxEnabled: false,
    taxAmount: ''
  });
  const [previewInvoice, setPreviewInvoice] = useState(null);
  const invoiceRef = useRef(null);
  const branding = getCompanyBranding(company);

  const invoiceNumber = useMemo(() => generateInvoiceNumber(company), [company]);

  const totals = useMemo(() => {
    const baseTotals = calculateInvoiceTotals(formData.items, 0);
    const tax = formData.taxEnabled ? Math.max(0, Number(formData.taxAmount) || 0) : 0;
    return {
      subtotal: baseTotals.subtotal,
      tax,
      total: baseTotals.subtotal + tax
    };
  }, [formData.items, formData.taxAmount, formData.taxEnabled]);

  const inputClassName = 'w-full bg-white px-4 py-2 text-slate-900 placeholder:text-slate-400 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent';

  const handleAddItem = () => {
    const newId = String(Math.max(...formData.items.map((i) => Number(i.id) || 0), 0) + 1);
    setFormData({
      ...formData,
      items: [...formData.items, { id: newId, description: '', quantity: 1, unitPrice: 0 }]
    });
  };

  const handleRemoveItem = (id) => {
    if (formData.items.length > 1) {
      setFormData({
        ...formData,
        items: formData.items.filter((item) => item.id !== id)
      });
    }
  };

  const handleItemChange = (id, field, value) => {
    setFormData({
      ...formData,
      items: formData.items.map((item) =>
        item.id === id ? { ...item, [field]: value } : item
      )
    });
  };

  const handleSaveInvoice = async () => {
    if (!formData.clientName || formData.items.some((i) => !i.description || i.quantity <= 0 || i.unitPrice <= 0)) {
      alert('Please fill in all required fields');
      return;
    }

    const invoice = {
      id: `inv-${Date.now()}`,
      invoiceNumber,
      company,
      logo: getCompanyLogo(company),
      clientName: formData.clientName,
      clientEmail: formData.clientEmail,
      clientPhone: formData.clientPhone,
      clientAddress: formData.clientAddress,
      invoiceDate: formData.invoiceDate,
      dueDate: formData.dueDate,
      poNumber: formData.poNumber,
      items: formData.items,
      notes: formData.notes,
      subtotal: totals.subtotal,
      tax: totals.tax,
      taxRate: null,
      total: totals.total,
      status: 'draft',
      createdAt: new Date().toISOString(),
      createdDate: new Date().toISOString().split('T')[0]
    };

    const currentUser = typeof window !== 'undefined' ? JSON.parse(window.localStorage.getItem('user') || '{}') : {};
    const userName = currentUser.name || currentUser.userName || 'System';

    try {
      await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company, userName, record: invoice })
      });

      onInvoiceGenerated(invoice);
      setShowForm(false);
      setFormData({
        clientName: '',
        clientEmail: '',
        clientPhone: '',
        clientAddress: '',
        invoiceDate: new Date().toISOString().split('T')[0],
        dueDate: '',
        poNumber: '',
        description: '',
        items: [{ id: '1', description: '', quantity: 1, unitPrice: 0 }],
        notes: '',
        taxEnabled: false,
        taxAmount: ''
      });
    } catch (error) {
      console.error('Failed to save invoice:', error);
      alert('Failed to save invoice');
    }
  };

  const handleExportPDF = async () => {
    if (!invoiceRef.current) return;

    try {
      const { html2canvas, jsPDF } = await loadPdfLibs();

      // Capture the invoice as image
      const canvas = await html2canvas(invoiceRef.current, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff'
      });

      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210; // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);

      // Save PDF
      const fileName = `${invoiceNumber}-${formData.clientName.replace(/\s+/g, '_')}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('PDF export failed:', error);
      alert('Failed to export PDF');
    }
  };

  return (
    <div className="space-y-6">
      {/* Create Invoice Button */}
      {!showForm && !previewInvoice && (
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-slate-900">Create Invoice</h2>
              <p className="text-sm text-slate-600 mt-1">Generate new invoices with company-specific branding</p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              Create New Invoice
            </button>
          </div>
        </div>
      )}

      {/* Invoice Form */}
      {showForm && !previewInvoice && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">New Invoice</h3>
            <button
              onClick={() => setShowForm(false)}
              className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Company Branding Info */}
          <div className="bg-gradient-to-r from-slate-50 to-slate-100 rounded-lg p-4 border border-slate-200">
            <p className="text-sm font-semibold text-slate-700">{branding.name}</p>
            <p className="text-xs text-slate-600 mt-1">{branding.tagline}</p>
          </div>

          {/* Client Information */}
          <div>
            <h4 className="font-semibold text-slate-900 mb-4">Client Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Client Name *</label>
                <input
                  type="text"
                  placeholder="Client name"
                  value={formData.clientName}
                  onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Email</label>
                <input
                  type="email"
                  placeholder="client@example.com"
                  value={formData.clientEmail}
                  onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Phone</label>
                <input
                  type="tel"
                  placeholder="+971 XXXXXXXXX"
                  value={formData.clientPhone}
                  onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Address</label>
                <input
                  type="text"
                  placeholder="Client address"
                  value={formData.clientAddress}
                  onChange={(e) => setFormData({ ...formData, clientAddress: e.target.value })}
                  className={inputClassName}
                />
              </div>
            </div>
          </div>

          {/* Invoice Details */}
          <div>
            <h4 className="font-semibold text-slate-900 mb-4">Invoice Details</h4>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Invoice Number</label>
                <input
                  type="text"
                  disabled
                  value={invoiceNumber}
                  className="w-full px-4 py-2 border border-slate-300 rounded-lg bg-slate-50 text-slate-700 font-mono text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Invoice Date</label>
                <input
                  type="date"
                  value={formData.invoiceDate}
                  onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">Due Date</label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                  className={inputClassName}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">PO Number</label>
                <input
                  type="text"
                  placeholder="PO-XXXX"
                  value={formData.poNumber}
                  onChange={(e) => setFormData({ ...formData, poNumber: e.target.value })}
                  className={inputClassName}
                />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold text-slate-900">Line Items</h4>
              <button
                onClick={handleAddItem}
                className="px-3 py-1.5 text-sm bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Item
              </button>
            </div>
            <div className="space-y-3">
              {formData.items.map((item) => (
                <div key={item.id} className="flex gap-3 items-end">
                  <input
                    type="text"
                    placeholder="Item description"
                    value={item.description}
                    onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                    className="flex-1 bg-white px-4 py-2 text-slate-900 placeholder:text-slate-400 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => handleItemChange(item.id, 'quantity', Number(e.target.value))}
                    className="w-20 bg-white px-4 py-2 text-slate-900 placeholder:text-slate-400 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <input
                    type="number"
                    placeholder="Unit Price"
                    value={item.unitPrice}
                    onChange={(e) => handleItemChange(item.id, 'unitPrice', Number(e.target.value))}
                    className="w-28 bg-white px-4 py-2 text-slate-900 placeholder:text-slate-400 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <div className="w-28 px-4 py-2 bg-slate-50 rounded-lg text-sm font-medium text-slate-900">
                    AED {((item.quantity || 0) * (item.unitPrice || 0)).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </div>
                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Optional Tax */}
          <div className="flex flex-wrap items-end gap-4">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
              <input
                type="checkbox"
                checked={formData.taxEnabled}
                onChange={(e) => setFormData({ ...formData, taxEnabled: e.target.checked })}
                className="h-4 w-4 accent-blue-600"
              />
              Add tax
            </label>
            {formData.taxEnabled && (
              <div className="w-full sm:w-48">
                <label className="block text-sm font-medium text-slate-700 mb-2">Tax amount (AED)</label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Optional"
                  value={formData.taxAmount}
                  onChange={(e) => setFormData({ ...formData, taxAmount: e.target.value })}
                  className={inputClassName}
                />
              </div>
            )}
          </div>

          {/* Totals Preview */}
          <div className="bg-slate-50 rounded-lg p-4 border border-slate-200">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-slate-600">Subtotal</p>
                <p className="text-lg font-bold text-slate-900">AED {totals.subtotal.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}</p>
              </div>
              <div>
                <p className="text-xs text-slate-600">Tax</p>
                <p className="text-lg font-bold text-slate-900">AED {totals.tax.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-xs text-slate-600">Total</p>
                <p className="text-2xl font-bold text-blue-600">AED {totals.total.toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Notes</label>
            <textarea
              placeholder="Additional notes or payment terms..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className={inputClassName}
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
            <button
              onClick={() => setShowForm(false)}
              className="px-6 py-2 text-slate-700 font-medium rounded-lg hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              onClick={() => setPreviewInvoice(true)}
              className="px-6 py-2 bg-slate-600 text-white font-medium rounded-lg hover:bg-slate-700 flex items-center gap-2"
            >
              <Eye className="w-4 h-4" />
              Preview
            </button>
            <button
              onClick={handleSaveInvoice}
              className="px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
            >
              Save Invoice
            </button>
          </div>
        </div>
      )}

      {/* Invoice Preview & PDF Export */}
      {previewInvoice && (
        <div className="bg-white rounded-lg border border-slate-200 p-6 space-y-4">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">Invoice Preview</h3>
            <div className="flex gap-2">
              <button
                onClick={handleExportPDF}
                className="px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export PDF
              </button>
              <button
                onClick={() => setPreviewInvoice(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Invoice Preview (for PDF rendering) */}
          <div ref={invoiceRef} className="bg-white p-8 space-y-6" style={{ width: '210mm', margin: '0 auto' }}>
            {/* Header */}
            <div className="flex items-center justify-between pb-6 border-b-2" style={{ borderColor: branding.colors.primary }}>
              <div className="flex items-center gap-4">
                {/* Company Logo */}
                <img 
                  src={getCompanyLogo(company)} 
                  alt={branding.name}
                  className="h-16 w-auto object-contain"
                  crossOrigin="anonymous"
                />
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold" style={{ color: branding.colors.primary }}>
                  INVOICE
                </p>
                <p className="text-sm font-mono text-slate-700 mt-2">{invoiceNumber}</p>
              </div>
            </div>

            {/* Company & Client Details */}
            <div className="grid grid-cols-2 gap-8">
              <div>
                <p className="text-xs font-semibold text-slate-700 uppercase mb-2">From</p>
                <div className="text-sm text-slate-700 space-y-1">
                  <p className="font-semibold">{branding.legalName}</p>
                  <p>{branding.location}</p>
                  {company !== 'Revive' && <>
                    <p>{branding.contact.phone}</p>
                    <p>{branding.contact.email}</p>
                  </>}
                  <p>{branding.contact.website}</p>
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-700 uppercase mb-2">Bill To</p>
                <div className="text-sm text-slate-700 space-y-1">
                  <p className="font-semibold">{formData.clientName}</p>
                  {formData.clientAddress && <p>{formData.clientAddress}</p>}
                  {formData.clientPhone && <p>{formData.clientPhone}</p>}
                  {formData.clientEmail && <p>{formData.clientEmail}</p>}
                </div>
              </div>
            </div>

            {/* Invoice Meta */}
            <div className="grid grid-cols-4 gap-4 py-4 bg-slate-50 px-4 rounded-lg">
              <div>
                <p className="text-xs font-semibold text-slate-700">Invoice Date</p>
                <p className="text-sm font-mono text-slate-900">{formData.invoiceDate}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-700">Due Date</p>
                <p className="text-sm font-mono text-slate-900">{formData.dueDate || 'Not set'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-700">PO Number</p>
                <p className="text-sm font-mono text-slate-900">{formData.poNumber || '--'}</p>
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-700">Status</p>
                <span className="text-xs font-semibold px-2 py-1 bg-blue-100 text-blue-800 rounded mt-1 inline-block">Draft</span>
              </div>
            </div>

            {/* Line Items Table */}
            <table className="w-full">
              <thead>
                <tr style={{ backgroundColor: branding.colors.primary + '15', borderBottom: `2px solid ${branding.colors.primary}` }}>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-900">Description</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-900">Quantity</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-900">Unit Price</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-900">Amount</th>
                </tr>
              </thead>
              <tbody>
                {formData.items.map((item, idx) => (
                  <tr key={item.id} className={idx % 2 === 0 ? 'bg-slate-50' : ''}>
                    <td className="py-3 px-4 text-sm text-slate-900">{item.description}</td>
                    <td className="py-3 px-4 text-center text-sm text-slate-900">{item.quantity}</td>
                    <td className="py-3 px-4 text-right text-sm text-slate-900">
                      AED {(Number(item.unitPrice) || 0).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </td>
                    <td className="py-3 px-4 text-right text-sm font-medium text-slate-900">
                      AED {((item.quantity || 0) * (Number(item.unitPrice) || 0)).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-80 space-y-2">
                <div className="flex justify-between py-2 border-b border-slate-300">
                  <span className="text-sm text-slate-700">Subtotal</span>
                  <span className="text-sm font-medium text-slate-900">
                    AED {totals.subtotal.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </span>
                </div>
                  <div className="flex justify-between py-2 border-b border-slate-300">
                    <span className="text-sm text-slate-700">Tax</span>
                  <span className="text-sm font-medium text-slate-900">
                    AED {totals.tax.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </span>
                </div>
                <div
                  className="flex justify-between py-3 px-4 rounded-lg text-white"
                  style={{ backgroundColor: branding.colors.primary }}
                >
                  <span className="font-semibold">Total</span>
                  <span className="font-bold text-lg">
                    AED {totals.total.toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </span>
                </div>
              </div>
            </div>

            {/* Notes */}
            {formData.notes && (
              <div className="pt-6 border-t border-slate-300">
                <p className="text-xs font-semibold text-slate-700 uppercase mb-2">Notes</p>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{formData.notes}</p>
              </div>
            )}

            {/* Footer */}
            <div className="pt-6 border-t border-slate-300 text-center">
              {company !== 'Revive' && <p className="text-xs text-slate-600">
                Thank you for your business. For inquiries, please contact {branding.contact.email}
              </p>}
              <p className="text-xs text-slate-500 mt-2">{branding.description}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
