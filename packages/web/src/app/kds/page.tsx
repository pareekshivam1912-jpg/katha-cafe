'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { API_BASE_URL } from '../../config/api';

interface KdsItem {
  name: string;
  quantity: number;
  notes: string | null;
}

interface KdsOrder {
  id: string;
  orderNumber: string;
  orderType: string;
  status: 'SUBMITTED' | 'ACCEPTED' | 'PREPARING' | 'READY';
  tableLabel: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  elapsedMinutes: number;
  items: KdsItem[];
}

export default function KdsPage() {
  const [orders, setOrders] = useState<KdsOrder[]>([]);
  const [staffToken, setStaffToken] = useState<string>('');
  const [staffUser, setStaffUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'SUBMITTED' | 'ACCEPTED' | 'PREPARING' | 'READY'>('ALL');

  // 1. Initial Authentication: check localStorage first, or fallback to Kitchen credentials
  useEffect(() => {
    async function loginKitchenMock() {
      try {
        const storedToken = typeof window !== 'undefined' ? localStorage.getItem('katha_staff_token') : null;
        const storedUser = typeof window !== 'undefined' ? localStorage.getItem('katha_staff_user') : null;
        if (storedToken && storedUser) {
          try {
            const parsed = JSON.parse(storedUser);
            setStaffToken(storedToken);
            setStaffUser(parsed);
            return;
          } catch (e) {
            // Ignore parse error
          }
        }

        const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: 'kitchen_mock',
            password: 'Kitchen@Katha2026!',
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setStaffToken(data.token);
          setStaffUser(data.user);
          localStorage.setItem('katha_staff_token', data.token);
          localStorage.setItem('katha_staff_user', JSON.stringify(data.user));
        } else {
          setError('Kitchen authentication required. Please log in.');
        }
      } catch (err) {
        setError(`Cannot reach API server at ${API_BASE_URL}.`);
      }
    }

    loginKitchenMock();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('katha_staff_token');
    localStorage.removeItem('katha_staff_user');
    window.location.href = '/login';
  };

  // 2. Fetch KDS orders
  const fetchKdsOrders = async () => {
    if (!staffToken) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/kds/orders`, {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.orders || []);
        setLastUpdated(new Date());
      } else {
        const errData = await res.json().catch(() => ({}));
        setError(errData.message || 'Failed to fetch kitchen orders.');
      }
    } catch (err) {
      console.error('KDS fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (staffToken) {
      fetchKdsOrders();
      const interval = setInterval(fetchKdsOrders, 8000);
      return () => clearInterval(interval);
    }
  }, [staffToken]);

  // 3. Progress Status
  const handleAdvanceStatus = async (orderId: string, currentStatus: string) => {
    let nextStatus: string;
    if (currentStatus === 'SUBMITTED') nextStatus = 'PREPARING';
    else if (currentStatus === 'ACCEPTED') nextStatus = 'PREPARING';
    else if (currentStatus === 'PREPARING') nextStatus = 'READY';
    else if (currentStatus === 'READY') nextStatus = 'SERVED';
    else return;

    try {
      const res = await fetch(`${API_BASE_URL}/api/kds/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffToken}`,
        },
        body: JSON.stringify({ status: nextStatus }),
      });

      if (res.ok) {
        fetchKdsOrders();
      }
    } catch (err) {
      console.error('Error advancing order status:', err);
    }
  };

  const filteredOrders = orders.filter((o) => {
    if (statusFilter === 'ALL') return true;
    return o.status === statusFilter;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-slate-900 border-b border-slate-800 px-6 py-4 flex flex-wrap items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-serif text-2xl font-bold tracking-wide text-amber-400">
            Katha Café
          </Link>
          <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold px-2.5 py-0.5 rounded tracking-wider uppercase">
            Kitchen Display System (KDS)
          </span>
        </div>

        {/* Center Filter Buttons */}
        <div className="flex gap-2">
          {(['ALL', 'SUBMITTED', 'ACCEPTED', 'PREPARING', 'READY'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded text-xs font-semibold transition ${
                statusFilter === s
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {s === 'ALL' ? `All Active (${orders.length})` : `${s} (${orders.filter((o) => o.status === s).length})`}
            </button>
          ))}
        </div>

        {/* Right Info */}
        <div className="flex items-center gap-5 text-xs">
          <div className="text-right">
            <span className="text-slate-400">Station: </span>
            <span className="font-bold text-slate-200">
              {staffUser ? staffUser.fullName : 'Connecting...'}
            </span>
          </div>

          <button
            onClick={fetchKdsOrders}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2.5 py-1 rounded text-xs border border-slate-700"
          >
            ↻ Sync
          </button>

          <Link
            href="/pos"
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-2.5 py-1 rounded border border-slate-700"
          >
            ← POS Terminal
          </Link>

          <Link
            href="/login"
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-2.5 py-1 rounded border border-slate-700"
          >
            Switch Role
          </Link>

          <button
            onClick={handleLogout}
            className="bg-rose-950/70 hover:bg-rose-900 text-rose-300 text-xs px-2.5 py-1 rounded border border-rose-800/80 transition"
          >
            Logout
          </button>
        </div>
      </header>

      {/* Main KDS Grid */}
      <main className="flex-1 p-6 overflow-y-auto">
        {error && (
          <div className="mb-6 p-4 bg-red-950/50 border border-red-800 text-red-300 rounded-lg text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-center py-20 text-slate-500">Loading kitchen tickets...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="text-center py-20 border-2 border-dashed border-slate-800 rounded-2xl max-w-xl mx-auto text-slate-500">
            <p className="text-lg font-semibold text-slate-400">All caught up! 🎉</p>
            <p className="text-sm mt-1">No pending orders in the kitchen queue right now.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {filteredOrders.map((order) => {
              const isUrgent = order.elapsedMinutes >= 15;
              const isWarning = order.elapsedMinutes >= 10 && order.elapsedMinutes < 15;

              return (
                <div
                  key={order.id}
                  className={`bg-slate-900 rounded-xl border flex flex-col justify-between shadow-lg overflow-hidden ${
                    order.status === 'READY'
                      ? 'border-emerald-500/50'
                      : order.status === 'PREPARING'
                      ? 'border-sky-500/50'
                      : order.status === 'SUBMITTED'
                      ? 'border-yellow-400/80 shadow-yellow-500/10'
                      : 'border-amber-500/50'
                  }`}
                >
                  {/* Ticket Header */}
                  <div
                    className={`px-4 py-3 border-b flex items-center justify-between ${
                      order.status === 'READY'
                        ? 'bg-emerald-950/40 border-emerald-900/50'
                        : order.status === 'PREPARING'
                        ? 'bg-sky-950/40 border-sky-900/50'
                        : order.status === 'SUBMITTED'
                        ? 'bg-yellow-950/50 border-yellow-800/60'
                        : 'bg-amber-950/40 border-amber-900/50'
                    }`}
                  >
                    <div>
                      <span className="font-black text-sm text-slate-100 tracking-wide">
                        {order.orderNumber}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-xs font-semibold text-amber-300">
                          {order.tableLabel}
                        </span>
                        <span className="text-[10px] text-slate-400">({order.orderType})</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span
                        className={`text-xs font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                          order.status === 'READY'
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                            : order.status === 'PREPARING'
                            ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                            : order.status === 'SUBMITTED'
                            ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-400/50'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        }`}
                      >
                        {order.status === 'SUBMITTED' ? 'NEW QR' : order.status}
                      </span>
                      <p
                        className={`text-xs mt-1 font-mono font-semibold ${
                          isUrgent ? 'text-rose-400 font-bold animate-pulse' : isWarning ? 'text-amber-400' : 'text-slate-400'
                        }`}
                      >
                        ⏱ {order.elapsedMinutes}m ago
                      </p>
                    </div>
                  </div>

                  {/* Items List */}
                  <div className="p-4 flex-1 space-y-2">
                    <ul className="divide-y divide-slate-800/80">
                      {order.items.map((item, idx) => (
                        <li key={idx} className="py-2 flex items-start justify-between">
                          <div className="flex-1 pr-2">
                            <span className="font-bold text-slate-100 text-sm">
                              <span className="text-amber-400 text-base font-black mr-2">
                                {item.quantity}x
                              </span>
                              {item.name}
                            </span>
                            {item.notes && (
                              <p className="text-xs text-amber-300/90 italic mt-0.5 pl-6">
                                ↳ &quot;{item.notes}&quot;
                              </p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>

                    {order.notes && (
                      <div className="mt-3 p-2 bg-slate-800/60 border border-slate-700/60 rounded text-xs text-slate-300 italic">
                        Order Note: {order.notes}
                      </div>
                    )}
                  </div>

                  {/* Action Button */}
                  <div className="p-3 border-t border-slate-800 bg-slate-900/60">
                    {order.status === 'SUBMITTED' && (
                      <button
                        onClick={() => handleAdvanceStatus(order.id, 'SUBMITTED')}
                        className="w-full bg-yellow-400 hover:bg-yellow-300 text-slate-950 font-black py-2.5 rounded-lg text-sm transition shadow flex items-center justify-center gap-1.5 animate-pulse"
                      >
                        <span>🔔</span> Accept &amp; Start Prep →
                      </button>
                    )}

                    {order.status === 'ACCEPTED' && (
                      <button
                        onClick={() => handleAdvanceStatus(order.id, 'ACCEPTED')}
                        className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 rounded-lg text-sm transition shadow"
                      >
                        ▶ Start Preparing
                      </button>
                    )}

                    {order.status === 'PREPARING' && (
                      <button
                        onClick={() => handleAdvanceStatus(order.id, 'PREPARING')}
                        className="w-full bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold py-2.5 rounded-lg text-sm transition shadow"
                      >
                        ✓ Mark Ready for Pickup
                      </button>
                    )}

                    {order.status === 'READY' && (
                      <button
                        onClick={() => handleAdvanceStatus(order.id, 'READY')}
                        className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 rounded-lg text-sm transition shadow"
                      >
                        ★ Mark Served (Clear)
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Status Bar */}
      <footer className="bg-slate-900/80 border-t border-slate-800 px-6 py-2 flex items-center justify-between text-xs text-slate-500">
        <span>Katha Café Kitchen Operational Queue</span>
        <span>Last synced: {lastUpdated.toLocaleTimeString()}</span>
      </footer>
    </div>
  );
}
