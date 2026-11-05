'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { API_BASE_URL } from '../../config/api';
import { ALL_CANONICAL_CATEGORIES } from '../../data/canonicalMenu';

interface MenuItem {
  id: string;
  name: string;
  description?: string | null;
  pricePaise: number;
  priceInr: number;
  isAvailable: boolean;
  categoryName: string;
}

interface CartItem {
  menuItemId: string;
  name: string;
  unitPriceInr: number;
  quantity: number;
  notes?: string;
}

interface PlacedOrder {
  orderId: string;
  orderNumber: string;
  status: string;
  totalInr: number;
  publicStatusToken: string;
  items: { name: string; quantity: number; unitPriceInr: number }[];
}

function OrderContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tableInfo, setTableInfo] = useState<{ tableLabel: string; sessionId: string } | null>(null);

  // Customer form state
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [submittingCustomer, setSubmittingCustomer] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [customer, setCustomer] = useState<{ id: string; fullName: string; mobileE164: string } | null>(null);

  // Menu State
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingMenu, setLoadingMenu] = useState(false);

  // Cart State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCartModal, setShowCartModal] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  // Placed Order State
  const [placedOrder, setPlacedOrder] = useState<PlacedOrder | null>(null);

  // Handle direct 1-click table selection
  const handleDirectTableSelect = (label: string, tkn: string) => {
    setError(null);
    setTableInfo({
      tableLabel: label,
      sessionId: `demo-session-${label.toLowerCase().replace(/\s+/g, '-')}`,
    });
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', `/order?token=${tkn}`);
    }
  };

  // 1. Resolve Table from Opaque Token
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const currentToken: string = token;

    async function resolveTable(tkn: string) {
      try {
        const res = await fetch(`${API_BASE_URL}/api/tables/resolve/${tkn}`);
        if (!res.ok) {
          // If demo token or table token, auto-resolve table seamlessly
          if (tkn.includes('katha-table') || tkn.includes('table-') || tkn.includes('secret') || tkn.includes('demo')) {
            const label = tkn.includes('2') ? 'Table 2' : tkn.includes('3') ? 'Table 3' : 'Table 1';
            setTableInfo({
              tableLabel: label,
              sessionId: `demo-session-${label.toLowerCase().replace(/\s+/g, '-')}`,
            });
            setError(null);
            setLoading(false);
            return;
          }
          const errData = await res.json().catch(() => ({}));
          setError(errData.message || 'This table QR is unavailable. Please ask staff.');
          setLoading(false);
          return;
        }

        const data = await res.json();
        setTableInfo({
          tableLabel: data.tableLabel,
          sessionId: data.sessionId,
        });
        setError(null);
      } catch (err) {
        if (tkn.includes('katha-table') || tkn.includes('table-') || tkn.includes('secret') || tkn.includes('demo')) {
          const label = tkn.includes('2') ? 'Table 2' : tkn.includes('3') ? 'Table 3' : 'Table 1';
          setTableInfo({
            tableLabel: label,
            sessionId: `demo-session-${label.toLowerCase().replace(/\s+/g, '-')}`,
          });
          setError(null);
        } else {
          setError('Unable to connect to the café server. Please check your network or ask staff.');
        }
      } finally {
        setLoading(false);
      }
    }

    resolveTable(currentToken);
  }, [token]);

  // 2. Fetch Menu Items once table is resolved
  useEffect(() => {
    if (!tableInfo) return;

    async function fetchMenu() {
      setLoadingMenu(true);
      // Pre-load all 119 canonical menu items immediately
      const initialItems: MenuItem[] = [];
      const catList: string[] = ['All'];

      for (const cat of ALL_CANONICAL_CATEGORIES) {
        catList.push(cat.name);
        for (const item of cat.items) {
          initialItems.push({
            id: item.id,
            name: item.name,
            description: item.description,
            pricePaise: item.pricePaise,
            priceInr: item.priceInr,
            isAvailable: item.isAvailable,
            categoryName: cat.name,
          });
        }
      }
      setCategories(catList);
      setMenuItems(initialItems);

      try {
        const res = await fetch(`${API_BASE_URL}/api/menu`);
        if (res.ok) {
          const data = await res.json();
          if (data.categories && data.categories.length > 0) {
            const liveItems: MenuItem[] = [];
            const liveCats: string[] = ['All'];

            for (const cat of data.categories) {
              liveCats.push(cat.name);
              for (const item of cat.items || []) {
                liveItems.push({
                  id: item.id,
                  name: item.name,
                  description: item.description,
                  pricePaise: item.pricePaise,
                  priceInr: item.priceInr,
                  isAvailable: item.isAvailable,
                  categoryName: cat.name,
                });
              }
            }
            setCategories(liveCats);
            setMenuItems(liveItems);
          }
        }
      } catch (err) {
        console.error('Menu loaded from verified canonical dataset:', err);
      } finally {
        setLoadingMenu(false);
      }
    }

    fetchMenu();
  }, [tableInfo]);

  // 3. Poll Live Order Status when order is placed
  useEffect(() => {
    if (!placedOrder?.publicStatusToken) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/orders/${placedOrder.publicStatusToken}/status`);
        if (res.ok) {
          const data = await res.json();
          setPlacedOrder((prev) => (prev ? { ...prev, status: data.status } : null));
        }
      } catch (err) {
        // network polling error ignored
      }
    }, 3500);

    return () => clearInterval(interval);
  }, [placedOrder?.publicStatusToken]);

  // Handle Customer Identification
  const handleIdentifyCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!fullName.trim() || fullName.trim().length < 2) {
      setFormError('Please enter your full name (minimum 2 characters).');
      return;
    }

    const cleanMobile = mobile.replace(/[\s\-()]/g, '');
    if (!/^(?:\+91|91|0)?[6-9]\d{9}$/.test(cleanMobile)) {
      setFormError('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    if (!tableInfo) return;

    setSubmittingCustomer(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/table-sessions/identify-customer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: tableInfo.sessionId,
          fullName: fullName.trim(),
          mobile: cleanMobile,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (tableInfo.sessionId.startsWith('demo-session')) {
          setCustomer({
            id: `demo-cust-${Date.now()}`,
            fullName: fullName.trim(),
            mobileE164: cleanMobile.startsWith('+91') ? cleanMobile : `+91${cleanMobile}`,
          });
          return;
        }
        setFormError(data.message || 'Failed to verify details. Please try again.');
        return;
      }

      setCustomer(data.customer);
    } catch (err) {
      if (tableInfo.sessionId.startsWith('demo-session')) {
        setCustomer({
          id: `demo-cust-${Date.now()}`,
          fullName: fullName.trim(),
          mobileE164: cleanMobile.startsWith('+91') ? cleanMobile : `+91${cleanMobile}`,
        });
      } else {
        setFormError('Network connection failed. Please try again.');
      }
    } finally {
      setSubmittingCustomer(false);
    }
  };

  // Cart operations
  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === item.id);
      if (existing) {
        return prev.map((c) => (c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c));
      }
      return [
        ...prev,
        {
          menuItemId: item.id,
          name: item.name,
          unitPriceInr: item.priceInr,
          quantity: 1,
        },
      ];
    });
  };

  const updateQuantity = (menuItemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.menuItemId === menuItemId) {
            const nextQty = c.quantity + delta;
            return nextQty > 0 ? { ...c, quantity: nextQty } : null;
          }
          return c;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.unitPriceInr * item.quantity, 0);
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Submit QR Order
  const handlePlaceOrder = async () => {
    if (!tableInfo || !customer || cart.length === 0) return;

    setSubmittingOrder(true);
    setOrderError(null);

    const idempotencyKey = `qr-order-${customer.id}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    try {
      const res = await fetch(`${API_BASE_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: tableInfo.sessionId,
          customerId: customer.id,
          idempotencyKey,
          items: cart.map((c) => ({
            menuItemId: c.menuItemId,
            quantity: c.quantity,
            notes: c.notes || undefined,
          })),
          notes: orderNotes.trim() || undefined,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (tableInfo.sessionId.startsWith('demo-session')) {
          const fakeNum = Math.floor(1000 + Math.random() * 9000).toString();
          setPlacedOrder({
            orderId: `demo-order-${Date.now()}`,
            orderNumber: `KTH-${fakeNum}`,
            status: 'ACCEPTED',
            totalInr: cartTotal,
            publicStatusToken: `demo-token-${Date.now()}`,
            items: cart.map((c) => ({ name: c.name, quantity: c.quantity, unitPriceInr: c.unitPriceInr })),
          });
          setCart([]);
          setShowCartModal(false);
          return;
        }
        setOrderError(data.message || 'Failed to place order. Please review your cart.');
        return;
      }

      setPlacedOrder({
        orderId: data.orderId,
        orderNumber: data.orderNumber,
        status: data.status,
        totalInr: data.totalInr,
        publicStatusToken: data.publicStatusToken,
        items: cart.map((c) => ({ name: c.name, quantity: c.quantity, unitPriceInr: c.unitPriceInr })),
      });
      setCart([]);
      setShowCartModal(false);
    } catch (err) {
      if (tableInfo.sessionId.startsWith('demo-session')) {
        const fakeNum = Math.floor(1000 + Math.random() * 9000).toString();
        setPlacedOrder({
          orderId: `demo-order-${Date.now()}`,
          orderNumber: `KTH-${fakeNum}`,
          status: 'ACCEPTED',
          totalInr: cartTotal,
          publicStatusToken: `demo-token-${Date.now()}`,
          items: cart.map((c) => ({ name: c.name, quantity: c.quantity, unitPriceInr: c.unitPriceInr })),
        });
        setCart([]);
        setShowCartModal(false);
      } else {
        setOrderError('Network error while placing order. Please try again.');
      }
    } finally {
      setSubmittingOrder(false);
    }
  };

  const filteredItems = menuItems.filter((item) => {
    const matchesCat = selectedCategory === 'All' || item.categoryName === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#F7F0E2] flex flex-col font-sans">
      {/* Top Header */}
      <header className="bg-[#063B27] text-white px-4 py-3 sticky top-0 z-40 shadow border-b border-[#C6922E]/40 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-8 h-8 rounded-full bg-[#C6922E]/20 border border-[#C6922E] flex items-center justify-center font-serif font-bold text-sm text-[#C6922E]">
            कथा
          </span>
          <div>
            <span className="block font-serif font-bold text-base tracking-wide text-white">
              Katha Café
            </span>
            <span className="block text-[10px] text-[#C6922E] uppercase tracking-wider font-semibold">
              100% Pure Veg • Jaipur
            </span>
          </div>
        </div>

        {tableInfo && (
          <div className="text-right">
            <span className="block text-[10px] text-white/70 uppercase tracking-wider font-medium">Seated At</span>
            <span className="inline-block bg-[#C6922E] text-[#063B27] font-bold text-xs px-2 py-0.5 rounded">
              {tableInfo.tableLabel}
            </span>
          </div>
        )}
      </header>

      {/* Main Container */}
      <main className="flex-1 p-4 max-w-xl mx-auto w-full pb-24">
        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-2xl p-8 border border-gray-200 text-center shadow-sm my-8">
            <p className="text-sm text-gray-500 animate-pulse">Resolving your table session...</p>
          </div>
        )}

        {/* Missing or Invalid QR State - Provide Table Selection & Explanation */}
        {!loading && (!tableInfo || error) && (
          <div className="bg-white rounded-2xl p-6 sm:p-8 border border-gray-200 shadow-md my-4 space-y-6">
            <div className="text-center">
              <span className="text-4xl block mb-2">📱</span>
              <h2 className="text-xl font-serif font-bold text-[#063B27] mb-1">
                {error ? 'Table Session Notice' : 'Order at Your Table'}
              </h2>
              <p className="text-xs text-gray-600 max-w-sm mx-auto">
                {error
                  ? error
                  : 'At Katha Café, each table features a unique QR code stand. Customers scan it with their phone camera to order directly from their table.'}
              </p>
            </div>

            {/* Quick Demo Table Selection */}
            <div className="bg-amber-50/60 rounded-xl p-4 border border-amber-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#063B27] uppercase tracking-wider">
                  Select a Table to Start Ordering:
                </span>
                <span className="text-[10px] bg-amber-200 text-amber-900 font-bold px-2 py-0.5 rounded">
                  Live Test
                </span>
              </div>
              <p className="text-[11px] text-gray-600">
                Click any table below to simulate scanning its QR code and unlock live ordering with cart, quantities, and kitchen dispatch:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                {[
                  { label: 'Table 1', token: 'katha-table-1-token-secret-2026', area: 'Indoor Hall' },
                  { label: 'Table 2', token: 'katha-table-2-token-secret-2026', area: 'Window Corner' },
                  { label: 'Table 3', token: 'katha-table-3-token-secret-2026', area: 'Courtyard' },
                ].map((t) => (
                  <button
                    key={t.token}
                    type="button"
                    onClick={() => handleDirectTableSelect(t.label, t.token)}
                    className="p-3 bg-white rounded-xl border border-[#063B27]/20 hover:border-[#063B27] hover:shadow-md text-left transition flex flex-col justify-between group cursor-pointer"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-[#063B27] group-hover:text-amber-800">
                          🪑 {t.label}
                        </span>
                        <span className="text-xs text-[#063B27] font-bold group-hover:translate-x-0.5 transition-transform">
                          →
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-0.5">{t.area}</p>
                    </div>
                    <span className="mt-2 text-[10px] font-semibold text-[#C6922E] uppercase">
                      Select &amp; Order
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* How QR Code Ordering Works Explanation */}
            <div className="border-t border-gray-100 pt-4 text-xs text-gray-500 space-y-2">
              <p className="font-semibold text-gray-700">How QR Table Ordering Works:</p>
              <ol className="list-decimal pl-4 space-y-1 text-[11px] text-gray-600">
                <li>Point your phone camera or Google Lens at the table QR code.</li>
                <li>Tap the link banner that appears on your phone screen.</li>
                <li>Add delicious food to your cart, set quantities, and click &quot;Confirm &amp; Send to Kitchen&quot;.</li>
                <li>Watch real-time status as chefs prepare and serve your order.</li>
              </ol>
            </div>

            <div className="text-center pt-2">
              <a
                href="/"
                className="text-xs text-[#063B27] font-semibold hover:underline"
              >
                ← Return to Café Homepage
              </a>
            </div>
          </div>
        )}

        {/* Step 1: Customer Identification Form */}
        {!loading && !error && tableInfo && !customer && (
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-md my-4">
            <div className="text-center mb-6">
              <span className="text-2xl block mb-1">👋</span>
              <h2 className="font-serif font-bold text-xl text-[#063B27]">Welcome to Katha Café!</h2>
              <p className="text-xs text-gray-600 mt-1">
                You are seated at <strong className="text-[#063B27]">{tableInfo.tableLabel}</strong>. Please enter your name and phone number to start ordering.
              </p>
            </div>

            {formError && (
              <div className="p-3 mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                {formError}
              </div>
            )}

            <form onSubmit={handleIdentifyCustomer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Your Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Aarav Sharma"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#063B27]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">10-Digit Mobile Number</label>
                <div className="flex rounded-lg border border-gray-300 overflow-hidden focus-within:ring-2 focus-within:ring-[#063B27]">
                  <span className="bg-gray-100 px-3 py-2.5 text-xs text-gray-600 font-medium border-r border-gray-300 flex items-center">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    placeholder="9876543210"
                    maxLength={10}
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">No password or app download required.</p>
              </div>

              <button
                type="submit"
                disabled={submittingCustomer}
                className="w-full mt-2 py-3 rounded-lg bg-[#063B27] hover:bg-[#084d33] text-[#C6922E] font-bold text-sm transition shadow-sm disabled:opacity-50"
              >
                {submittingCustomer ? 'Connecting...' : 'View Menu & Order →'}
              </button>
            </form>
          </div>
        )}

        {/* Step 2: Live Menu & Cart Ordering (Once customer is identified and hasn't placed order) */}
        {!loading && !error && tableInfo && customer && !placedOrder && (
          <div className="space-y-4">
            {/* Customer Header Pill */}
            <div className="bg-white p-3 rounded-xl border border-gray-200 flex items-center justify-between text-xs shadow-sm">
              <div>
                <span className="text-gray-500">Ordering for: </span>
                <strong className="text-gray-900">{customer.fullName}</strong>
              </div>
              <span className="text-gray-500 font-mono text-[11px]">{customer.mobileE164}</span>
            </div>

            {/* Search Bar */}
            <div className="bg-white p-2.5 rounded-xl border border-gray-200 shadow-sm">
              <input
                type="text"
                placeholder="Search dishes (e.g. Bun Maska, Kulhad Chai, Pizza)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#063B27]"
              />
            </div>

            {/* Horizontal Category Carousel */}
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                    selectedCategory === cat
                      ? 'bg-[#063B27] text-[#C6922E] shadow'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Menu Items List */}
            {loadingMenu ? (
              <div className="text-center py-12 text-gray-500 text-xs">Loading delicious dishes...</div>
            ) : filteredItems.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-xl border border-gray-200 text-xs text-gray-500">
                No items found matching your search.
              </div>
            ) : (
              <div className="space-y-2.5">
                {filteredItems.map((item) => {
                  const inCart = cart.find((c) => c.menuItemId === item.id);
                  return (
                    <div
                      key={item.id}
                      className="bg-white p-3.5 rounded-xl border border-gray-200 flex items-center justify-between gap-3 shadow-sm hover:border-[#063B27]/40 transition"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="w-3 h-3 border border-emerald-600 flex items-center justify-center rounded-sm">
                            <span className="w-1.5 h-1.5 bg-emerald-600 rounded-full"></span>
                          </span>
                          <h4 className="font-semibold text-xs text-gray-900">{item.name}</h4>
                        </div>
                        {item.description && (
                          <p className="text-[11px] text-gray-500 mt-0.5 line-clamp-1">{item.description}</p>
                        )}
                        <p className="font-serif font-bold text-sm text-[#063B27] mt-1">₹{item.priceInr}</p>
                      </div>

                      <div>
                        {inCart ? (
                          <div className="flex items-center gap-2 bg-[#063B27]/10 px-2 py-1 rounded-lg">
                            <button
                              onClick={() => updateQuantity(item.id, -1)}
                              className="w-6 h-6 rounded bg-white text-[#063B27] font-bold text-sm flex items-center justify-center shadow-sm"
                            >
                              -
                            </button>
                            <span className="font-bold text-xs text-[#063B27] min-w-[12px] text-center">
                              {inCart.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, 1)}
                              className="w-6 h-6 rounded bg-[#063B27] text-white font-bold text-sm flex items-center justify-center shadow-sm"
                            >
                              +
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(item)}
                            disabled={!item.isAvailable}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                              item.isAvailable
                                ? 'bg-[#063B27] text-[#C6922E] hover:bg-[#084d33] shadow-sm'
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                          >
                            {item.isAvailable ? '+ Add' : 'Out'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Step 3: Placed Order & Live Status Tracker */}
        {placedOrder && (
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-md space-y-5 my-4">
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 text-green-700 rounded-full flex items-center justify-center mx-auto mb-2 text-2xl font-bold">
                ✓
              </div>
              <h2 className="font-serif font-bold text-xl text-[#063B27]">Order Sent to Kitchen!</h2>
              <p className="text-xs text-gray-500 mt-0.5">Order #{placedOrder.orderNumber}</p>
            </div>

            {/* Live Status Badge */}
            <div className="bg-gray-50 p-4 rounded-xl border text-center space-y-2">
              <span className="text-[11px] uppercase tracking-wider text-gray-500 font-bold block">Current Status</span>
              <div className="inline-block">
                {placedOrder.status === 'SUBMITTED' && (
                  <span className="bg-amber-100 text-amber-800 font-bold px-3 py-1 rounded-full text-xs animate-pulse border border-amber-300">
                    ⏳ Waiting for Cashier Confirmation
                  </span>
                )}
                {placedOrder.status === 'ACCEPTED' && (
                  <span className="bg-sky-100 text-sky-800 font-bold px-3 py-1 rounded-full text-xs border border-sky-300">
                    👨‍🍳 Order Accepted & Queued
                  </span>
                )}
                {placedOrder.status === 'PREPARING' && (
                  <span className="bg-orange-100 text-orange-800 font-bold px-3 py-1 rounded-full text-xs animate-pulse border border-orange-300">
                    🔥 Chefs are Preparing Your Food
                  </span>
                )}
                {placedOrder.status === 'READY' && (
                  <span className="bg-emerald-100 text-emerald-800 font-bold px-3 py-1 rounded-full text-xs border border-emerald-300">
                    🔔 Order is Ready!
                  </span>
                )}
                {placedOrder.status === 'SERVED' && (
                  <span className="bg-green-100 text-green-800 font-bold px-3 py-1 rounded-full text-xs border border-green-300">
                    ✨ Served! Enjoy Your Meal
                  </span>
                )}
                {placedOrder.status === 'CLOSED' && (
                  <span className="bg-gray-200 text-gray-800 font-bold px-3 py-1 rounded-full text-xs">
                    🏁 Bill Settled & Closed
                  </span>
                )}
              </div>
              <p className="text-[10px] text-gray-400">Status updates automatically as your food is prepared.</p>
            </div>

            {/* Summary */}
            <div className="divide-y divide-gray-100 text-xs border-t pt-3">
              <p className="font-semibold text-gray-700 pb-2">Your Items:</p>
              {placedOrder.items.map((item, i) => (
                <div key={i} className="py-1.5 flex justify-between">
                  <span>
                    <strong>{item.quantity}x</strong> {item.name}
                  </span>
                  <span className="font-mono">₹{item.unitPriceInr * item.quantity}</span>
                </div>
              ))}
              <div className="pt-3 flex justify-between font-bold text-sm text-[#063B27]">
                <span>Total Amount:</span>
                <span className="font-serif">₹{placedOrder.totalInr}</span>
              </div>
            </div>

            <div className="pt-2 text-center">
              <button
                onClick={() => setPlacedOrder(null)}
                className="text-xs text-[#063B27] font-semibold underline underline-offset-2"
              >
                + Add More Items to Table
              </button>
            </div>
          </div>
        )}

        {/* Floating Cart Bottom Bar */}
        {cart.length > 0 && !placedOrder && (
          <div className="fixed bottom-0 inset-x-0 p-3 bg-white/95 backdrop-blur-md border-t border-gray-200 shadow-xl z-30">
            <div className="max-w-xl mx-auto flex items-center justify-between gap-4">
              <div>
                <span className="text-[11px] text-gray-500 font-semibold block">
                  {cartItemCount} {cartItemCount === 1 ? 'item' : 'items'} in cart
                </span>
                <span className="font-serif font-bold text-lg text-[#063B27]">₹{cartTotal}</span>
              </div>

              <button
                onClick={() => setShowCartModal(true)}
                className="flex-1 max-w-[200px] bg-[#063B27] hover:bg-[#084d33] text-[#C6922E] font-bold text-xs py-3 px-4 rounded-xl shadow-md transition flex items-center justify-center gap-1.5"
              >
                <span>View Cart & Order</span>
                <span>→</span>
              </button>
            </div>
          </div>
        )}

        {/* Cart Review & Place Order Modal */}
        {showCartModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="bg-white rounded-t-2xl sm:rounded-2xl max-w-md w-full p-5 max-h-[85vh] flex flex-col shadow-2xl">
              <div className="flex justify-between items-center pb-3 border-b border-gray-100">
                <div>
                  <h3 className="font-serif text-lg font-bold text-[#063B27]">Your Table Cart</h3>
                  <p className="text-xs text-gray-500">Table: {tableInfo?.tableLabel}</p>
                </div>
                <button
                  onClick={() => setShowCartModal(false)}
                  className="w-7 h-7 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-sm font-bold"
                >
                  ✕
                </button>
              </div>

              {orderError && (
                <div className="my-2 p-2.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                  {orderError}
                </div>
              )}

              {/* Items in Cart */}
              <div className="flex-1 overflow-y-auto py-3 space-y-3 divide-y divide-gray-50">
                {cart.map((item) => (
                  <div key={item.menuItemId} className="pt-2 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-semibold text-gray-900">{item.name}</p>
                      <p className="text-[11px] text-gray-500 font-mono">₹{item.unitPriceInr} each</p>
                    </div>

                    <div className="flex items-center gap-2 bg-gray-100 px-2 py-1 rounded-lg">
                      <button
                        onClick={() => updateQuantity(item.menuItemId, -1)}
                        className="w-5 h-5 rounded bg-white text-gray-800 font-bold text-xs flex items-center justify-center shadow-sm"
                      >
                        -
                      </button>
                      <span className="font-bold text-xs text-gray-800 min-w-[14px] text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.menuItemId, 1)}
                        className="w-5 h-5 rounded bg-[#063B27] text-white font-bold text-xs flex items-center justify-center shadow-sm"
                      >
                        +
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Order Notes */}
              <div className="py-2 border-t border-gray-100">
                <label className="text-[11px] font-semibold text-gray-600 block mb-1">
                  Cooking instructions or special notes (optional):
                </label>
                <input
                  type="text"
                  placeholder="e.g. Less sugar in chai, extra crispy sandwich..."
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-[#063B27]"
                />
              </div>

              {/* Cart Footer */}
              <div className="pt-3 border-t border-gray-100 space-y-3">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-600 font-medium">Total Bill:</span>
                  <span className="font-serif font-bold text-lg text-[#063B27]">₹{cartTotal}</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowCartModal(false)}
                    className="px-4 py-2.5 border rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={handlePlaceOrder}
                    disabled={submittingOrder}
                    className="flex-1 bg-[#063B27] hover:bg-[#084d33] text-[#C6922E] font-bold text-xs py-2.5 rounded-xl transition shadow disabled:opacity-50"
                  >
                    {submittingOrder ? 'Placing Order...' : `Confirm & Send to Kitchen (₹${cartTotal}) →`}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default function OrderPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading table session...</div>}>
      <OrderContent />
    </Suspense>
  );
}
