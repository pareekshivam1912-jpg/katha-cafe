'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface InventoryItem {
  id: string;
  name: string;
  unit: string;
  quantity: number;
  reorderLevel: number | null;
  isLowStock: boolean;
  isActive: boolean;
}

interface SalesSummary {
  totalRevenueInr: number;
  totalSettledOrders: number;
  averageOrderValueInr: number;
}

interface ProductMixItem {
  name: string;
  quantitySold: number;
  revenueInr: number;
}

interface ReconciliationData {
  totalSettledRevenueInr: number;
  cashDrawerExpectedInr: number;
  upiVerifiedInr: number;
  cardTerminalInr: number;
  unsettledOrdersCount: number;
  unsettledExposureInr: number;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'inventory' | 'reports'>('inventory');
  const [staffToken, setStaffToken] = useState<string>('');
  const [staffUser, setStaffUser] = useState<any>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Inventory State
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [lowStockCount, setLowStockCount] = useState<number>(0);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [newItemUnit, setNewItemUnit] = useState('kg');
  const [newItemQuantity, setNewItemQuantity] = useState('');
  const [newItemReorder, setNewItemReorder] = useState('');
  const [adjustingItem, setAdjustingItem] = useState<InventoryItem | null>(null);
  const [adjType, setAdjType] = useState<'PURCHASE' | 'ADJUSTMENT' | 'WASTE' | 'RETURN'>('PURCHASE');
  const [adjDelta, setAdjDelta] = useState('');
  const [adjReason, setAdjReason] = useState('');
  const [invError, setInvError] = useState<string | null>(null);
  const [invSuccess, setInvSuccess] = useState<string | null>(null);

  // Reports State
  const [salesSummary, setSalesSummary] = useState<SalesSummary | null>(null);
  const [byMethod, setByMethod] = useState<any>({});
  const [byType, setByType] = useState<any>({});
  const [productMix, setProductMix] = useState<ProductMixItem[]>([]);
  const [reconciliation, setReconciliation] = useState<ReconciliationData | null>(null);
  const [loadingReports, setLoadingReports] = useState(false);

  // 1. Initial Auto-Login as mock Admin for demonstration
  useEffect(() => {
    async function loginAdminMock() {
      try {
        const res = await fetch('http://localhost:4000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: 'admin_mock',
            password: 'Admin@Katha2026!',
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setStaffToken(data.token);
          setStaffUser(data.user);
        } else {
          setAuthError('Admin access required. Please log in.');
        }
      } catch (err) {
        setAuthError('Cannot reach API server at http://localhost:4000.');
      }
    }

    loginAdminMock();
  }, []);

  // 2. Fetch Inventory Items
  const fetchInventory = async () => {
    if (!staffToken) return;
    setLoadingInventory(true);
    try {
      const res = await fetch('http://localhost:4000/api/admin/inventory', {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setInventoryItems(data.items || []);
        setLowStockCount(data.lowStockCount || 0);
      }
    } catch (err) {
      console.error('Failed to fetch inventory:', err);
    } finally {
      setLoadingInventory(false);
    }
  };

  // 3. Fetch Reports
  const fetchReports = async () => {
    if (!staffToken) return;
    setLoadingReports(true);
    try {
      const [salesRes, mixRes, recRes] = await Promise.all([
        fetch('http://localhost:4000/api/admin/reports/sales/daily', {
          headers: { Authorization: `Bearer ${staffToken}` },
        }),
        fetch('http://localhost:4000/api/admin/reports/sales/product-mix', {
          headers: { Authorization: `Bearer ${staffToken}` },
        }),
        fetch('http://localhost:4000/api/admin/reports/reconciliation', {
          headers: { Authorization: `Bearer ${staffToken}` },
        }),
      ]);

      if (salesRes.ok) {
        const salesData = await salesRes.json();
        setSalesSummary(salesData.summary);
        setByMethod(salesData.byPaymentMethod || {});
        setByType(salesData.byOrderType || {});
      }

      if (mixRes.ok) {
        const mixData = await mixRes.json();
        setProductMix(mixData.productMix || []);
      }

      if (recRes.ok) {
        const recData = await recRes.json();
        setReconciliation(recData.reconciliation || null);
      }
    } catch (err) {
      console.error('Failed to fetch reports:', err);
    } finally {
      setLoadingReports(false);
    }
  };

  useEffect(() => {
    if (staffToken) {
      if (activeTab === 'inventory') {
        fetchInventory();
      } else {
        fetchReports();
      }
    }
  }, [activeTab, staffToken]);

  // Handle Add Item
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setInvError(null);
    setInvSuccess(null);

    try {
      const res = await fetch('http://localhost:4000/api/admin/inventory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffToken}`,
        },
        body: JSON.stringify({
          name: newItemName.trim(),
          unit: newItemUnit.trim(),
          initialQuantity: newItemQuantity ? Number(newItemQuantity) : 0,
          reorderLevel: newItemReorder ? Number(newItemReorder) : undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setInvError(data.message || 'Failed to create item.');
        return;
      }

      setInvSuccess(`Created inventory item '${data.item.name}'`);
      setShowAddModal(false);
      setNewItemName('');
      setNewItemQuantity('');
      setNewItemReorder('');
      fetchInventory();
    } catch (err) {
      setInvError('Network error creating item.');
    }
  };

  // Handle Adjust Stock
  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingItem) return;
    setInvError(null);
    setInvSuccess(null);

    const delta = Number(adjDelta);
    if (!delta || delta === 0) {
      setInvError('Adjustment quantity cannot be zero.');
      return;
    }

    try {
      const res = await fetch(`http://localhost:4000/api/admin/inventory/${adjustingItem.id}/adjust`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffToken}`,
        },
        body: JSON.stringify({
          movementType: adjType,
          quantityDelta: delta,
          reason: adjReason.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setInvError(data.message || 'Failed to adjust stock.');
        return;
      }

      setInvSuccess(`Updated stock for '${data.item.name}': New quantity ${data.item.quantity} ${data.item.unit}`);
      setAdjustingItem(null);
      setAdjDelta('');
      setAdjReason('');
      fetchInventory();
    } catch (err) {
      setInvError('Network error updating stock.');
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F0E2] flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-[#063B27] text-white px-6 py-4 flex flex-wrap items-center justify-between border-b border-[#C6922E]/40">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-serif text-2xl font-bold tracking-wide text-[#F7F0E2]">
            Katha Café
          </Link>
          <span className="bg-[#C6922E] text-[#063B27] text-xs font-semibold px-2.5 py-0.5 rounded tracking-wider uppercase">
            Management & Reports
          </span>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right text-xs">
            <span className="text-[#F7F0E2]/70">Admin: </span>
            <span className="font-semibold text-white">
              {staffUser ? staffUser.fullName : 'Connecting...'}
            </span>
            <span className="ml-2 bg-[#063B27] border border-[#C6922E]/60 text-[#C6922E] px-1.5 py-0.5 rounded text-[10px]">
              {staffUser?.role || 'ADMIN'}
            </span>
          </div>

          <div className="flex gap-2 text-xs">
            <Link
              href="/pos"
              className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded transition"
            >
              POS Terminal
            </Link>
            <Link
              href="/kds"
              className="bg-[#C6922E] hover:bg-[#b58326] text-[#063B27] font-semibold px-3 py-1.5 rounded transition"
            >
              Kitchen KDS →
            </Link>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-[#063B27]/10 px-6 py-3 border-b border-[#063B27]/15 flex gap-4">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition flex items-center gap-2 ${
            activeTab === 'inventory'
              ? 'bg-[#063B27] text-white shadow'
              : 'bg-white text-[#063B27] hover:bg-[#063B27]/5'
          }`}
        >
          <span>📦 Inventory & Stock Alerts</span>
          {lowStockCount > 0 && (
            <span className="bg-red-500 text-white font-bold text-xs px-2 py-0.5 rounded-full">
              {lowStockCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
            activeTab === 'reports'
              ? 'bg-[#063B27] text-white shadow'
              : 'bg-white text-[#063B27] hover:bg-[#063B27]/5'
          }`}
        >
          📊 Sales Reports & Reconciliation
        </button>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {authError && (
          <div className="mb-4 p-4 bg-red-100 border border-red-300 text-red-800 rounded-lg text-sm">
            {authError}
          </div>
        )}

        {invSuccess && (
          <div className="mb-4 p-3 bg-green-100 border border-green-300 text-green-900 rounded-lg text-xs font-semibold">
            {invSuccess}
          </div>
        )}

        {invError && (
          <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-900 rounded-lg text-xs font-semibold">
            {invError}
          </div>
        )}

        {/* Modal: Add Inventory Item */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
              <h3 className="font-serif text-lg font-bold text-[#063B27] mb-3">Add Inventory Item</h3>
              <form onSubmit={handleAddItem} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Item Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Amul Butter, Coffee Beans, Cheese Block"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="w-full p-2 border rounded text-xs focus:ring-1 focus:ring-[#063B27] focus:outline-none"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Unit</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. kg, litres, pcs"
                      value={newItemUnit}
                      onChange={(e) => setNewItemUnit(e.target.value)}
                      className="w-full p-2 border rounded text-xs focus:ring-1 focus:ring-[#063B27] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-700 block mb-1">Initial Stock</label>
                    <input
                      type="number"
                      step="any"
                      min="0"
                      placeholder="0"
                      value={newItemQuantity}
                      onChange={(e) => setNewItemQuantity(e.target.value)}
                      className="w-full p-2 border rounded text-xs focus:ring-1 focus:ring-[#063B27] focus:outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Reorder Level (Low Stock Alert)</label>
                  <input
                    type="number"
                    step="any"
                    min="0"
                    placeholder="e.g. 5 (triggers alert when <= 5)"
                    value={newItemReorder}
                    onChange={(e) => setNewItemReorder(e.target.value)}
                    className="w-full p-2 border rounded text-xs focus:ring-1 focus:ring-[#063B27] focus:outline-none"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-4 py-2 border rounded text-xs font-semibold text-gray-700 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-[#063B27] hover:bg-[#084d33] text-white py-2 rounded font-bold text-xs"
                  >
                    Save Item
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Adjust Stock */}
        {adjustingItem && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
              <h3 className="font-serif text-lg font-bold text-[#063B27] mb-1">
                Adjust Stock: {adjustingItem.name}
              </h3>
              <p className="text-xs text-gray-500 mb-4">
                Current Quantity: <span className="font-bold text-[#063B27]">{adjustingItem.quantity} {adjustingItem.unit}</span>
              </p>
              <form onSubmit={handleAdjustStock} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">Movement Type</label>
                  <select
                    value={adjType}
                    onChange={(e: any) => setAdjType(e.target.value)}
                    className="w-full p-2 border rounded text-xs focus:ring-1 focus:ring-[#063B27] focus:outline-none"
                  >
                    <option value="PURCHASE">Purchase / Restock (+)</option>
                    <option value="ADJUSTMENT">Physical Count Adjustment (+/-)</option>
                    <option value="WASTE">Spoilage / Kitchen Waste (-)</option>
                    <option value="RETURN">Vendor Return (-)</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Quantity Delta ({adjustingItem.unit}) — use minus (-) to reduce stock
                  </label>
                  <input
                    type="number"
                    step="any"
                    required
                    placeholder="e.g. +10 or -2.5"
                    value={adjDelta}
                    onChange={(e) => setAdjDelta(e.target.value)}
                    className="w-full p-2 border rounded text-xs focus:ring-1 focus:ring-[#063B27] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-700 block mb-1">
                    Reason (Required for audit log)
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Weekly vendor delivery, expired milk packet, shelf stock count"
                    value={adjReason}
                    onChange={(e) => setAdjReason(e.target.value)}
                    className="w-full p-2 border rounded text-xs focus:ring-1 focus:ring-[#063B27] focus:outline-none"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setAdjustingItem(null)}
                    className="px-4 py-2 border rounded text-xs font-semibold text-gray-700 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 bg-[#063B27] hover:bg-[#084d33] text-white py-2 rounded font-bold text-xs"
                  >
                    Confirm Stock Update
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Tab 1: Inventory Management */}
        {activeTab === 'inventory' ? (
          <div className="space-y-6">
            {/* Metric Banner */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-xs text-gray-500 font-semibold uppercase">Tracked Inventory Items</p>
                <p className="font-serif text-2xl font-bold text-[#063B27] mt-1">{inventoryItems.length}</p>
              </div>
              <div className={`p-4 rounded-xl border shadow-sm ${lowStockCount > 0 ? 'bg-red-50 border-red-200' : 'bg-white border-gray-200'}`}>
                <p className="text-xs font-semibold uppercase text-gray-500">Low Stock Warnings</p>
                <p className={`font-serif text-2xl font-bold mt-1 ${lowStockCount > 0 ? 'text-red-700' : 'text-green-700'}`}>
                  {lowStockCount} {lowStockCount > 0 ? '⚠️' : '✓'}
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-semibold uppercase">Recipe Deductions</p>
                  <p className="text-xs text-amber-800 font-semibold mt-1">Manual Audit Mode</p>
                </div>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="bg-[#063B27] hover:bg-[#084d33] text-white text-xs font-bold px-3 py-2 rounded-lg transition"
                >
                  + Add Item
                </button>
              </div>
            </div>

            {/* Inventory Items Table */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-gray-200 flex justify-between items-center">
                <h3 className="font-serif font-bold text-gray-900 text-base">Ingredient & Stock Roster</h3>
                <button
                  onClick={fetchInventory}
                  disabled={loadingInventory}
                  className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-2.5 py-1 rounded"
                >
                  {loadingInventory ? 'Refreshing...' : '↻ Refresh Stock'}
                </button>
              </div>

              {inventoryItems.length === 0 ? (
                <div className="p-12 text-center text-gray-400 text-sm">
                  No inventory items tracked yet. Click &quot;+ Add Item&quot; to begin.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#063B27]/5 border-b border-gray-200 text-gray-700 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="p-3">Item Name</th>
                      <th className="p-3">Quantity</th>
                      <th className="p-3">Unit</th>
                      <th className="p-3">Reorder Threshold</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {inventoryItems.map((item) => (
                      <tr key={item.id} className="hover:bg-gray-50">
                        <td className="p-3 font-semibold text-gray-900">{item.name}</td>
                        <td className="p-3 font-mono font-bold text-sm text-[#063B27]">{item.quantity}</td>
                        <td className="p-3 text-gray-600">{item.unit}</td>
                        <td className="p-3 text-gray-500">{item.reorderLevel !== null ? `${item.reorderLevel} ${item.unit}` : '—'}</td>
                        <td className="p-3">
                          {item.isLowStock ? (
                            <span className="bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded text-[11px]">
                              ⚠️ Low Stock
                            </span>
                          ) : (
                            <span className="bg-green-100 text-green-800 font-bold px-2 py-0.5 rounded text-[11px]">
                              In Stock
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => {
                              setAdjustingItem(item);
                              setAdjDelta('');
                              setAdjReason('');
                            }}
                            className="bg-[#C6922E] hover:bg-[#b58326] text-[#063B27] font-bold px-2.5 py-1 rounded text-xs transition"
                          >
                            Adjust Stock
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        ) : (
          /* Tab 2: Sales Reports & Reconciliation */
          <div className="space-y-6">
            {/* Top Aggregate Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-xs text-gray-500 font-semibold uppercase">Total Settled Revenue</p>
                <p className="font-serif text-2xl font-bold text-[#063B27] mt-1">
                  ₹{salesSummary?.totalRevenueInr || 0}
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-xs text-gray-500 font-semibold uppercase">Settled Orders</p>
                <p className="font-serif text-2xl font-bold text-gray-900 mt-1">
                  {salesSummary?.totalSettledOrders || 0}
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-xs text-gray-500 font-semibold uppercase">Average Order Value (AOV)</p>
                <p className="font-serif text-2xl font-bold text-[#C6922E] mt-1">
                  ₹{salesSummary?.averageOrderValueInr || 0}
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-xs text-gray-500 font-semibold uppercase">Unsettled Exposure</p>
                <p className="font-serif text-2xl font-bold text-amber-700 mt-1">
                  ₹{reconciliation?.unsettledExposureInr || 0}
                </p>
              </div>
            </div>

            {/* Reconciliation Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cash vs UPI Breakdown */}
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
                <h4 className="font-serif font-bold text-base text-[#063B27]">Payment Methods Breakdown</h4>
                <div className="divide-y divide-gray-100 text-xs">
                  <div className="py-2 flex justify-between items-center">
                    <span className="font-semibold text-gray-700">💵 Cash at Counter:</span>
                    <span className="font-bold text-[#063B27] font-serif text-sm">
                      ₹{byMethod.CASH?.totalInr || 0} ({byMethod.CASH?.count || 0} orders)
                    </span>
                  </div>
                  <div className="py-2 flex justify-between items-center">
                    <span className="font-semibold text-gray-700">📱 UPI at Counter:</span>
                    <span className="font-bold text-[#063B27] font-serif text-sm">
                      ₹{byMethod.UPI_AT_COUNTER?.totalInr || 0} ({byMethod.UPI_AT_COUNTER?.count || 0} orders)
                    </span>
                  </div>
                  <div className="py-2 flex justify-between items-center">
                    <span className="font-semibold text-gray-700">💳 Card Terminal:</span>
                    <span className="font-bold text-[#063B27] font-serif text-sm">
                      ₹{byMethod.CARD_AT_COUNTER?.totalInr || 0} ({byMethod.CARD_AT_COUNTER?.count || 0} orders)
                    </span>
                  </div>
                </div>
              </div>

              {/* Order Types Breakdown */}
              <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
                <h4 className="font-serif font-bold text-base text-[#063B27]">Order Channels Breakdown</h4>
                <div className="divide-y divide-gray-100 text-xs">
                  <div className="py-2 flex justify-between items-center">
                    <span className="font-semibold text-gray-700">🍽️ Dine In:</span>
                    <span className="font-bold text-gray-900 font-serif text-sm">
                      ₹{byType.DINE_IN?.totalInr || 0} ({byType.DINE_IN?.count || 0} orders)
                    </span>
                  </div>
                  <div className="py-2 flex justify-between items-center">
                    <span className="font-semibold text-gray-700">🥡 Takeaway:</span>
                    <span className="font-bold text-gray-900 font-serif text-sm">
                      ₹{byType.TAKEAWAY?.totalInr || 0} ({byType.TAKEAWAY?.count || 0} orders)
                    </span>
                  </div>
                  <div className="py-2 flex justify-between items-center">
                    <span className="font-semibold text-gray-700">🛎️ Counter:</span>
                    <span className="font-bold text-gray-900 font-serif text-sm">
                      ₹{byType.COUNTER?.totalInr || 0} ({byType.COUNTER?.count || 0} orders)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Product Mix (Top Selling Menu Items) */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-gray-200">
                <h4 className="font-serif font-bold text-base text-[#063B27]">Product Mix & Popular Items</h4>
              </div>

              {productMix.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-xs">No sales recorded yet.</div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#063B27]/5 border-b border-gray-200 text-gray-700 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="p-3">Item Name</th>
                      <th className="p-3">Quantity Sold</th>
                      <th className="p-3">Revenue Generated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {productMix.map((item, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="p-3 font-semibold text-gray-900">{item.name}</td>
                        <td className="p-3 font-bold text-gray-800">{item.quantitySold} units</td>
                        <td className="p-3 font-serif font-bold text-[#063B27]">₹{item.revenueInr}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
