'use client';

import { Package, TrendingUp } from 'lucide-react';

const formatCurrency = (value) => `AED ${Number(value || 0).toLocaleString('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
})}`;

export function getCatalogEntry(prices, sku) {
  const normalizedSku = String(sku || '').trim().toLowerCase();
  if (!normalizedSku) return null;

  return (prices || []).find((entry) => String(entry.sku || '').trim().toLowerCase() === normalizedSku) || null;
}

export function getSalesInventoryMetrics(sales) {
  const activeSales = (sales || []).filter((sale) => String(sale.status || '').toLowerCase() !== 'cancelled');
  const inventory = new Map();
  let revenue = 0;
  let costs = 0;

  activeSales.forEach((sale) => {
    const sku = String(sale.sku || 'UNKNOWN').trim() || 'UNKNOWN';
    const quantity = Number(sale.quantity) || 0;
    const value = Number(sale.totalValue) || quantity * (Number(sale.unitPrice) || 0);
    const current = inventory.get(sku) || {
      sku,
      productName: sale.productName || 'Unknown product',
      incoming: 0,
      outgoing: 0
    };

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

  const rows = [...inventory.values()].map((item) => ({
    ...item,
    currentStock: item.incoming - item.outgoing
  })).sort((left, right) => left.sku.localeCompare(right.sku));

  return { rows, revenue, costs, netProfit: revenue - costs };
}

export default function SalesInventoryInsights({ sales }) {
  const metrics = getSalesInventoryMetrics(sales);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-emerald-600 p-2 text-white"><TrendingUp className="h-5 w-5" /></div>
          <div>
            <p className="text-sm font-semibold text-emerald-800">Net Profit</p>
            <p className="mt-1 text-2xl font-bold text-emerald-950">{formatCurrency(metrics.netProfit)}</p>
          </div>
        </div>
        <p className="mt-3 text-xs text-emerald-700">Outgoing revenue minus incoming product costs</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Live Inventory</h2>
            <p className="mt-1 text-sm text-slate-600">Current stock from incoming and outgoing transactions</p>
          </div>
          <Package className="h-5 w-5 text-blue-600" />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[540px] text-sm">
            <thead className="border-b border-slate-200 bg-slate-50 text-left text-slate-700">
              <tr><th className="px-4 py-3 font-semibold">SKU</th><th className="px-4 py-3 font-semibold">Product</th><th className="px-4 py-3 text-right font-semibold">Incoming</th><th className="px-4 py-3 text-right font-semibold">Outgoing</th><th className="px-4 py-3 text-right font-semibold">Current Stock</th></tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {metrics.rows.length === 0 ? (
                <tr><td colSpan="5" className="px-4 py-6 text-center text-slate-500">No inventory transactions yet.</td></tr>
              ) : metrics.rows.map((item) => (
                <tr key={item.sku} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-blue-700">{item.sku}</td>
                  <td className="px-4 py-3 text-slate-800">{item.productName}</td>
                  <td className="px-4 py-3 text-right text-blue-700">{item.incoming}</td>
                  <td className="px-4 py-3 text-right text-orange-700">{item.outgoing}</td>
                  <td className={`px-4 py-3 text-right font-bold ${item.currentStock < 0 ? 'text-red-700' : 'text-slate-900'}`}>{item.currentStock}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
