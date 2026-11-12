'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { API_BASE_URL } from '../../config/api';

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

interface AdminLiveOrder {
  id: string;
  orderNumber: string;
  orderType: string;
  status: string;
  tableLabel: string;
  customerName: string;
  customerMobile: string | null;
  totalInr: number;
  subtotalInr: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPriceInr: number;
    lineTotalInr: number;
    notes: string | null;
  }>;
}

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'orders' | 'inventory' | 'reports'>('orders');
  const [staffToken, setStaffToken] = useState<string>('');
  const [staffUser, setStaffUser] = useState<any>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Live Orders State
  const [liveOrders, setLiveOrders] = useState<AdminLiveOrder[]>([]);
  const [orderFilter, setOrderFilter] = useState<string>('ALL');
  const [loadingOrders, setLoadingOrders] = useState(false);

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

  // 1. Initial Authentication: check localStorage first, or fallback to Admin credentials
  const loginAdminMock = async (): Promise<string | null> => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
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
        localStorage.setItem('katha_staff_token', data.token);
        localStorage.setItem('katha_staff_user', JSON.stringify(data.user));
        setAuthError(null);
        return data.token;
      } else {
        setAuthError('Admin access required. Please log in.');
        return null;
      }
    } catch (err) {
      setAuthError(`Cannot reach API server at ${API_BASE_URL}.`);
      return null;
    }
  };

  useEffect(() => {
    async function initAuth() {
      const storedToken = typeof window !== 'undefined' ? localStorage.getItem('katha_staff_token') : null;
      const storedUser = typeof window !== 'undefined' ? localStorage.getItem('katha_staff_user') : null;
      if (storedToken && storedUser) {
        try {
          const parsed = JSON.parse(storedUser);
          if (parsed.role === 'ADMIN' || parsed.role === 'MANAGER') {
            setStaffToken(storedToken);
            setStaffUser(parsed);
            return;
          }
        } catch (e) {
          // Ignore parse error
        }
      }
      await loginAdminMock();
    }

    initAuth();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('katha_staff_token');
    localStorage.removeItem('katha_staff_user');
    window.location.href = '/login';
  };

  // 2. Fetch Inventory Items
  const fetchInventory = async (tokenOverride?: unknown) => {
    const token = (typeof tokenOverride === 'string' ? tokenOverride : null) || staffToken;
    if (!token) return;
    setLoadingInventory(true);
    try {
      let res = await fetch(`${API_BASE_URL}/api/admin/inventory`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if ((res.status === 401 || res.status === 403) && typeof tokenOverride !== 'string') {
        const freshToken = await loginAdminMock();
        if (freshToken) {
          res = await fetch(`${API_BASE_URL}/api/admin/inventory`, {
            headers: { Authorization: `Bearer ${freshToken}` },
          });
        }
      }
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
  const fetchReports = async (tokenOverride?: unknown) => {
    const token = (typeof tokenOverride === 'string' ? tokenOverride : null) || staffToken;
    if (!token) return;
    setLoadingReports(true);
    try {
      let [salesRes, mixRes, recRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/reports/sales/daily`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/api/admin/reports/sales/product-mix`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch(`${API_BASE_URL}/api/admin/reports/reconciliation`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if ((salesRes.status === 401 || salesRes.status === 403) && typeof tokenOverride !== 'string') {
        const freshToken = await loginAdminMock();
        if (freshToken) {
          [salesRes, mixRes, recRes] = await Promise.all([
            fetch(`${API_BASE_URL}/api/admin/reports/sales/daily`, {
              headers: { Authorization: `Bearer ${freshToken}` },
            }),
            fetch(`${API_BASE_URL}/api/admin/reports/sales/product-mix`, {
              headers: { Authorization: `Bearer ${freshToken}` },
            }),
            fetch(`${API_BASE_URL}/api/admin/reports/reconciliation`, {
              headers: { Authorization: `Bearer ${freshToken}` },
            }),
          ]);
        }
      }

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

  // Fetch Live Orders across all tables and statuses
  const fetchLiveOrders = async (tokenOverride?: unknown) => {
    const token = (typeof tokenOverride === 'string' ? tokenOverride : null) || staffToken;
    if (!token) return;
    setLoadingOrders(true);
    try {
      let res = await fetch(`${API_BASE_URL}/api/admin/reports/orders/live`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if ((res.status === 401 || res.status === 403) && typeof tokenOverride !== 'string') {
        const freshToken = await loginAdminMock();
        if (freshToken) {
          res = await fetch(`${API_BASE_URL}/api/admin/reports/orders/live`, {
            headers: { Authorization: `Bearer ${freshToken}` },
          });
        }
      }
      if (res.ok) {
        const data = await res.json();
        setLiveOrders(data.orders || []);
      }
    } catch (err) {
      console.error('Failed to fetch live orders for admin:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (staffToken) {
      // Always poll live orders every 5 seconds so Admin sees all changes immediately
      fetchLiveOrders();
      const interval = setInterval(fetchLiveOrders, 5000);

      if (activeTab === 'inventory') {
        fetchInventory();
      } else if (activeTab === 'reports') {
        fetchReports();
      }

      return () => clearInterval(interval);
    }
  }, [activeTab, staffToken]);

  // Handle Add Item
  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    setInvError(null);
    setInvSuccess(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/admin/inventory`, {
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
      const res = await fetch(`${API_BASE_URL}/api/admin/inventory/${adjustingItem.id}/adjust`, {
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
            <Link
              href="/login"
              className="bg-white/10 hover:bg-white/20 text-white px-2.5 py-1.5 rounded transition"
            >
              Switch Role
            </Link>
            <button
              onClick={handleLogout}
              className="bg-red-900/60 hover:bg-red-800 text-red-200 border border-red-700/60 px-2.5 py-1.5 rounded transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="bg-[#063B27]/10 px-6 py-3 border-b border-[#063B27]/15 flex gap-4">
        <button
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition flex items-center gap-2 ${
            activeTab === 'orders'
              ? 'bg-[#063B27] text-white shadow'
              : 'bg-white text-[#063B27] hover:bg-[#063B27]/5'
          }`}
        >
          <span>📋 Live Orders &amp; KOTs</span>
          {liveOrders.filter((o) => o.status !== 'CLOSED' && o.status !== 'CANCELLED' && o.status !== 'REJECTED').length > 0 && (
            <span className="bg-[#C6922E] text-[#063B27] font-bold text-xs px-2 py-0.5 rounded-full shadow animate-pulse">
              {liveOrders.filter((o) => o.status !== 'CLOSED' && o.status !== 'CANCELLED' && o.status !== 'REJECTED').length} Active
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('inventory')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition flex items-center gap-2 ${
            activeTab === 'inventory'
              ? 'bg-[#063B27] text-white shadow'
              : 'bg-white text-[#063B27] hover:bg-[#063B27]/5'
          }`}
        >
          <span>📦 Inventory &amp; Stock Alerts</span>
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
          📊 Sales Reports &amp; Reconciliation
        </button>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {authError && (
          <div className="mb-4 p-4 bg-red-100 border border-red-300 text-red-800 rounded-lg text-sm flex items-center justify-between">
            <span>{authError}</span>
            <button
              onClick={() => loginAdminMock()}
              className="bg-red-800 text-white font-bold px-3 py-1.5 rounded text-xs hover:bg-red-900 transition"
            >
              Re-connect as Admin
            </button>
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

        {/* Tab 0: Live Orders & KOTs */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            {/* Top Metric Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-xs text-gray-500 font-semibold uppercase">Total Recorded Orders</p>
                <p className="font-serif text-2xl font-bold text-[#063B27] mt-1">{liveOrders.length}</p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-xs text-gray-500 font-semibold uppercase">Awaiting Cashier Acceptance</p>
                <p className="font-serif text-2xl font-bold text-yellow-600 mt-1">
                  {liveOrders.filter((o) => o.status === 'SUBMITTED').length}
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-xs text-gray-500 font-semibold uppercase">In Kitchen / Preparing</p>
                <p className="font-serif text-2xl font-bold text-sky-600 mt-1">
                  {liveOrders.filter((o) => o.status === 'ACCEPTED' || o.status === 'PREPARING').length}
                </p>
              </div>
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <p className="text-xs text-gray-500 font-semibold uppercase">Ready / Served</p>
                <p className="font-serif text-2xl font-bold text-emerald-600 mt-1">
                  {liveOrders.filter((o) => o.status === 'READY' || o.status === 'SERVED').length}
                </p>
              </div>
            </div>

            {/* Orders Header & Filter Controls */}
            <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-gray-700 uppercase mr-1">Status Filter:</span>
                {(['ALL', 'SUBMITTED', 'ACCEPTED', 'PREPARING', 'READY', 'SERVED', 'CLOSED'] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setOrderFilter(s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      orderFilter === s
                        ? 'bg-[#063B27] text-[#C6922E] shadow'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {s === 'ALL'
                      ? `All (${liveOrders.length})`
                      : `${s} (${liveOrders.filter((o) => o.status === s).length})`}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => fetchLiveOrders()}
                  disabled={loadingOrders}
                  className="bg-[#063B27]/10 hover:bg-[#063B27]/20 text-[#063B27] font-semibold text-xs px-3 py-1.5 rounded-lg transition border border-[#063B27]/20 flex items-center gap-1"
                >
                  <span>↻</span> {loadingOrders ? 'Refreshing...' : 'Refresh Orders'}
                </button>
              </div>
            </div>

            {/* Orders List / Cards */}
            {liveOrders.length === 0 ? (
              <div className="bg-white rounded-2xl border-2 border-dashed border-gray-300 p-12 text-center text-gray-500">
                <span className="text-3xl block mb-2">🍽️</span>
                <p className="font-serif text-lg font-bold text-gray-700">No Orders in the System Yet</p>
                <p className="text-xs mt-1 text-gray-500 max-w-sm mx-auto">
                  When customers scan table QR codes or cashier enters orders at the POS terminal, tickets will appear here in real time.
                </p>
                <div className="mt-4 flex justify-center gap-3">
                  <Link
                    href="/order"
                    className="bg-[#063B27] hover:bg-[#084d33] text-[#C6922E] text-xs font-bold px-4 py-2 rounded-lg shadow-sm"
                  >
                    Place a QR Table Order →
                  </Link>
                  <Link
                    href="/pos"
                    className="bg-[#C6922E] hover:bg-[#b58326] text-[#063B27] text-xs font-bold px-4 py-2 rounded-lg shadow-sm"
                  >
                    Open Cashier POS →
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {liveOrders
                  .filter((o) => orderFilter === 'ALL' || o.status === orderFilter)
                  .map((order) => {
                    const statusBadgeClass =
                      order.status === 'SUBMITTED'
                        ? 'bg-yellow-100 text-yellow-800 border-yellow-300'
                        : order.status === 'ACCEPTED'
                        ? 'bg-blue-100 text-blue-800 border-blue-300'
                        : order.status === 'PREPARING'
                        ? 'bg-amber-100 text-amber-800 border-amber-300'
                        : order.status === 'READY'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : order.status === 'SERVED'
                        ? 'bg-indigo-100 text-indigo-800 border-indigo-300'
                        : order.status === 'CLOSED'
                        ? 'bg-gray-100 text-gray-700 border-gray-300'
                        : 'bg-red-100 text-red-800 border-red-300';

                    return (
                      <div
                        key={order.id}
                        className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 hover:border-[#063B27]/40 transition flex flex-col justify-between"
                      >
                        <div>
                          {/* Top Row: Order #, Table, Status */}
                          <div className="flex items-start justify-between border-b border-gray-100 pb-3 mb-3">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-sm text-[#063B27] font-mono">
                                  {order.orderNumber}
                                </span>
                                <span className="bg-[#063B27]/10 text-[#063B27] font-semibold text-xs px-2 py-0.5 rounded">
                                  {order.tableLabel}
                                </span>
                                <span className="text-[10px] text-gray-500 uppercase tracking-wide">
                                  {order.orderType}
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 mt-1">
                                Customer: <strong className="text-gray-900">{order.customerName}</strong>
                                {order.customerMobile && (
                                  <span className="text-gray-500 font-mono text-[11px] ml-1.5">
                                    ({order.customerMobile})
                                  </span>
                                )}
                              </p>
                            </div>

                            <div className="text-right">
                              <span
                                className={`text-xs font-bold px-2.5 py-0.5 rounded-full border uppercase tracking-wider ${statusBadgeClass}`}
                              >
                                {order.status === 'SUBMITTED' ? 'Incoming QR' : order.status}
                              </span>
                              <p className="text-[10px] text-gray-400 mt-1 font-mono">
                                {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>

                          {/* Line items list */}
                          <div className="space-y-1.5 my-2">
                            {order.items.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center text-xs">
                                <span className="text-gray-800">
                                  <span className="font-bold text-[#063B27] mr-1.5">{item.quantity}x</span>
                                  {item.name}
                                  {item.notes && (
                                    <span className="text-[11px] text-gray-400 italic ml-1">
                                      ({item.notes})
                                    </span>
                                  )}
                                </span>
                                <span className="font-mono text-gray-600 font-medium">
                                  ₹{item.lineTotalInr}
                                </span>
                              </div>
                            ))}
                          </div>

                          {order.notes && (
                            <div className="p-2 bg-amber-50/70 border border-amber-200/60 rounded text-[11px] text-amber-900 mt-2">
                              Note: {order.notes}
                            </div>
                          )}
                        </div>

                        {/* Card Bottom: Total Amount & Links */}
                        <div className="border-t border-gray-100 pt-3 mt-3 flex items-center justify-between">
                          <div>
                            <span className="text-xs text-gray-500">Order Total: </span>
                            <span className="font-serif font-bold text-base text-[#063B27]">
                              ₹{order.totalInr}
                            </span>
                          </div>

                          <div className="flex gap-2">
                            <Link
                              href="/kds"
                              className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-[11px] font-semibold px-2.5 py-1 rounded transition"
                            >
                              Kitchen View →
                            </Link>
                            {order.status !== 'CLOSED' && (
                              <Link
                                href="/pos"
                                className="bg-[#C6922E] hover:bg-[#b58326] text-[#063B27] text-[11px] font-bold px-2.5 py-1 rounded transition"
                              >
                                Manage / Settle at POS →
                              </Link>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}

        {/* Tab 1: Inventory Management */}
        {activeTab === 'inventory' && (
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
                  onClick={() => fetchInventory()}
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
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[500px]">
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
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 2: Sales Reports & Reconciliation */}
        {activeTab === 'reports' && (
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
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs min-w-[400px]">
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
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
