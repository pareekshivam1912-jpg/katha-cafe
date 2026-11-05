'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
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

interface PendingOrder {
  id: string;
  orderNumber: string;
  orderType: string;
  status: string;
  tableLabel: string;
  customerName: string;
  customerMobile: string | null;
  totalInr: number;
  notes: string | null;
  createdAt: string;
  items: Array<{
    name: string;
    unitPriceInr: number;
    quantity: number;
    lineTotalInr: number;
    notes: string | null;
  }>;
}

export default function PosPage() {
  const [activeTab, setActiveTab] = useState<'terminal' | 'pending'>('terminal');
  const [staffToken, setStaffToken] = useState<string>('');
  const [staffUser, setStaffUser] = useState<any>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  // Menu & Categories for POS
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  // POS Order Form State
  const [orderType, setOrderType] = useState<'COUNTER' | 'TAKEAWAY' | 'DINE_IN'>('COUNTER');
  const [customerName, setCustomerName] = useState('');
  const [customerMobile, setCustomerMobile] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [orderNotes, setOrderNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pending QR Orders State
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [rejectingOrderId, setRejectingOrderId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // 1. Initial Auto-Login as mock Cashier for demonstration
  useEffect(() => {
    async function loginCashierMock() {
      try {
        const res = await fetch('http://localhost:4000/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            username: 'cashier_mock',
            password: 'Cashier@Katha2026!',
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setStaffToken(data.token);
          setStaffUser(data.user);
        } else {
          setAuthError('Staff authentication required. Please log in.');
        }
      } catch (err) {
        setAuthError('API server unreachable at http://localhost:4000.');
      }
    }

    loginCashierMock();
  }, []);

  // 2. Fetch Menu Items
  useEffect(() => {
    async function fetchMenu() {
      try {
        const res = await fetch('http://localhost:4000/api/menu');
        if (res.ok) {
          const data = await res.json();
          const items: MenuItem[] = [];
          const catSet = new Set<string>();

          for (const cat of data.categories || []) {
            catSet.add(cat.name);
            for (const item of cat.items || []) {
              items.push({
                ...item,
                categoryName: cat.name,
              });
            }
          }
          setMenuItems(items);
          setCategories(['All', ...Array.from(catSet)]);
        }
      } catch (err) {
        console.error('Failed to load menu for POS:', err);
      }
    }

    fetchMenu();
  }, []);

  // 3. Fetch Pending Orders when tab is active or poll
  const fetchPendingOrders = async () => {
    if (!staffToken) return;
    setLoadingPending(true);
    try {
      const res = await fetch('http://localhost:4000/api/pos/orders/pending', {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setPendingOrders(data.orders || []);
      }
    } catch (err) {
      console.error('Failed to fetch pending orders:', err);
    } finally {
      setLoadingPending(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'pending' && staffToken) {
      fetchPendingOrders();
      const interval = setInterval(fetchPendingOrders, 10000);
      return () => clearInterval(interval);
    }
  }, [activeTab, staffToken]);

  // Cart operations
  const addToCart = (item: MenuItem) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.menuItemId === item.id);
      if (existing) {
        return prev.map((c) =>
          c.menuItemId === item.id ? { ...c, quantity: c.quantity + 1 } : c
        );
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

  const updateQuantity = (itemId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.menuItemId === itemId) {
            const newQty = c.quantity + delta;
            return newQty > 0 ? { ...c, quantity: newQty } : null;
          }
          return c;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const cartTotal = cart.reduce((sum, item) => sum + item.unitPriceInr * item.quantity, 0);

  // Submit POS Order
  const handleCreatePosOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) {
      setErrorMessage('Please add at least one item to the order.');
      return;
    }

    setSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      const payload: any = {
        orderType,
        items: cart.map((c) => ({
          menuItemId: c.menuItemId,
          quantity: c.quantity,
          notes: c.notes,
        })),
        notes: orderNotes.trim() || undefined,
      };

      if (customerName.trim() && customerMobile.trim()) {
        payload.customerName = customerName.trim();
        payload.customerMobile = customerMobile.replace(/[\s\-()]/g, '');
      }

      const res = await fetch('http://localhost:4000/api/pos/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffToken}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.message || 'Failed to create order at POS.');
        return;
      }

      setSuccessMessage(`Order #${data.orderNumber} placed and sent to Kitchen! Total: ₹${data.totalInr}`);
      setCart([]);
      setCustomerName('');
      setCustomerMobile('');
      setOrderNotes('');
    } catch (err) {
      setErrorMessage('Network connection error while submitting order.');
    } finally {
      setSubmitting(false);
    }
  };

  // Accept QR Order
  const handleAcceptOrder = async (orderId: string) => {
    try {
      const res = await fetch(`http://localhost:4000/api/pos/orders/${orderId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      if (res.ok) {
        fetchPendingOrders();
      }
    } catch (err) {
      console.error('Error accepting order:', err);
    }
  };

  // Reject QR Order
  const handleRejectOrder = async (orderId: string) => {
    if (!rejectionReason.trim()) return;

    try {
      const res = await fetch(`http://localhost:4000/api/pos/orders/${orderId}/reject`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffToken}`,
        },
        body: JSON.stringify({ reason: rejectionReason.trim() }),
      });
      if (res.ok) {
        setRejectingOrderId(null);
        setRejectionReason('');
        fetchPendingOrders();
      }
    } catch (err) {
      console.error('Error rejecting order:', err);
    }
  };

  const filteredItems = menuItems.filter((item) => {
    const matchesCat = selectedCategory === 'All' || item.categoryName === selectedCategory;
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-[#F7F0E2] flex flex-col font-sans">
      {/* Top Staff Navigation Header */}
      <header className="bg-[#063B27] text-white px-6 py-4 flex flex-wrap items-center justify-between border-b border-[#C6922E]/40">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-serif text-2xl font-bold tracking-wide text-[#F7F0E2]">
            Katha Café
          </Link>
          <span className="bg-[#C6922E] text-[#063B27] text-xs font-semibold px-2 py-0.5 rounded tracking-wider uppercase">
            POS Terminal
          </span>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right text-xs">
            <span className="text-[#F7F0E2]/70">Operator: </span>
            <span className="font-semibold text-white">
              {staffUser ? staffUser.fullName : 'Connecting...'}
            </span>
            <span className="ml-2 bg-[#063B27] border border-[#C6922E]/60 text-[#C6922E] px-1.5 py-0.5 rounded text-[10px]">
              {staffUser?.role || 'CASHIER'}
            </span>
          </div>

          <Link
            href="/kds"
            className="bg-[#C6922E] hover:bg-[#b58326] text-[#063B27] font-semibold text-xs px-3 py-1.5 rounded transition"
          >
            Go to Kitchen KDS →
          </Link>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="bg-[#063B27]/10 px-6 py-3 border-b border-[#063B27]/15 flex gap-4">
        <button
          onClick={() => setActiveTab('terminal')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition ${
            activeTab === 'terminal'
              ? 'bg-[#063B27] text-white shadow'
              : 'bg-white text-[#063B27] hover:bg-[#063B27]/5'
          }`}
        >
          🛒 Cashier Terminal (New Order)
        </button>
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition flex items-center gap-2 ${
            activeTab === 'pending'
              ? 'bg-[#063B27] text-white shadow'
              : 'bg-white text-[#063B27] hover:bg-[#063B27]/5'
          }`}
        >
          <span>📥 Incoming QR Orders</span>
          {pendingOrders.length > 0 && (
            <span className="bg-[#C6922E] text-[#063B27] font-bold text-xs px-2 py-0.5 rounded-full">
              {pendingOrders.length}
            </span>
          )}
        </button>
      </div>

      {/* Main View Area */}
      <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {authError && (
          <div className="mb-4 p-4 bg-red-100 border border-red-300 text-red-800 rounded-lg text-sm">
            {authError}
          </div>
        )}

        {activeTab === 'terminal' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Columns: Menu Selection */}
            <div className="lg:col-span-2 space-y-4">
              {/* Search & Category Pills */}
              <div className="bg-white p-4 rounded-xl border border-[#063B27]/10 shadow-sm space-y-3">
                <input
                  type="text"
                  placeholder="Search menu item (e.g. Garlic Bread, Cold Coffee, Pizza)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#063B27]"
                />

                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition ${
                        selectedCategory === cat
                          ? 'bg-[#063B27] text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Items Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[600px] overflow-y-auto pr-1">
                {filteredItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => addToCart(item)}
                    disabled={!item.isAvailable}
                    className={`p-3 rounded-xl border text-left flex flex-col justify-between transition ${
                      item.isAvailable
                        ? 'bg-white hover:border-[#063B27] hover:shadow-md cursor-pointer border-gray-200'
                        : 'bg-gray-100 opacity-60 border-gray-200 cursor-not-allowed'
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-xs text-gray-900 line-clamp-2 leading-tight">
                        {item.name}
                      </p>
                      <p className="text-[11px] text-gray-500 mt-1">{item.categoryName}</p>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="font-serif font-bold text-sm text-[#063B27]">
                        ₹{item.priceInr}
                      </span>
                      {item.isAvailable ? (
                        <span className="text-xs bg-[#063B27]/10 text-[#063B27] font-bold px-2 py-0.5 rounded">
                          + Add
                        </span>
                      ) : (
                        <span className="text-[10px] bg-red-100 text-red-700 font-semibold px-1.5 py-0.5 rounded">
                          Out of stock
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Right Column: POS Cart & Checkout */}
            <div className="bg-white p-5 rounded-xl border border-[#063B27]/10 shadow-sm flex flex-col justify-between h-fit">
              <div>
                <h3 className="font-serif text-lg font-bold text-[#063B27] mb-3">
                  Current Order
                </h3>

                {/* Order Type Selector */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {(['COUNTER', 'DINE_IN', 'TAKEAWAY'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setOrderType(type)}
                      className={`py-1.5 text-xs font-semibold rounded-lg border transition ${
                        orderType === type
                          ? 'bg-[#063B27] text-white border-[#063B27]'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {type === 'COUNTER' ? 'Counter' : type === 'DINE_IN' ? 'Dine In' : 'Takeaway'}
                    </button>
                  ))}
                </div>

                {/* Customer Details (Optional) */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                  <input
                    type="text"
                    placeholder="Customer Name"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#063B27]"
                  />
                  <input
                    type="tel"
                    placeholder="Mobile (10 digits)"
                    value={customerMobile}
                    onChange={(e) => setCustomerMobile(e.target.value)}
                    className="px-3 py-1.5 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#063B27]"
                  />
                </div>

                {/* Cart Line Items */}
                <div className="divide-y divide-gray-100 max-h-64 overflow-y-auto mb-4">
                  {cart.length === 0 ? (
                    <p className="text-gray-400 text-xs py-8 text-center">
                      No items added yet. Click menu items to add to order.
                    </p>
                  ) : (
                    cart.map((item) => (
                      <div key={item.menuItemId} className="py-2 flex items-center justify-between text-xs">
                        <div className="flex-1 pr-2">
                          <p className="font-medium text-gray-900">{item.name}</p>
                          <p className="text-gray-500">₹{item.unitPriceInr} each</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateQuantity(item.menuItemId, -1)}
                            className="w-5 h-5 bg-gray-100 rounded text-gray-700 font-bold hover:bg-gray-200"
                          >
                            -
                          </button>
                          <span className="font-semibold">{item.quantity}</span>
                          <button
                            onClick={() => updateQuantity(item.menuItemId, 1)}
                            className="w-5 h-5 bg-gray-100 rounded text-gray-700 font-bold hover:bg-gray-200"
                          >
                            +
                          </button>
                          <span className="font-semibold text-gray-900 w-12 text-right">
                            ₹{item.unitPriceInr * item.quantity}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Special Instructions */}
                <textarea
                  placeholder="Special order notes / preparation instructions..."
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                  rows={2}
                  className="w-full p-2 border border-gray-200 rounded text-xs mb-3 focus:outline-none focus:ring-1 focus:ring-[#063B27]"
                />
              </div>

              {/* Order Total & Submit */}
              <div className="border-t border-gray-200 pt-3 space-y-3">
                <div className="flex justify-between items-center text-sm font-bold text-gray-900">
                  <span>Order Total:</span>
                  <span className="font-serif text-lg text-[#063B27]">₹{cartTotal}</span>
                </div>

                {successMessage && (
                  <div className="p-2 bg-green-50 border border-green-200 text-green-800 rounded text-xs">
                    {successMessage}
                  </div>
                )}

                {errorMessage && (
                  <div className="p-2 bg-red-50 border border-red-200 text-red-800 rounded text-xs">
                    {errorMessage}
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleCreatePosOrder}
                  disabled={submitting || cart.length === 0}
                  className="w-full bg-[#063B27] hover:bg-[#084d33] text-white py-2.5 rounded-lg font-semibold text-sm transition disabled:opacity-50"
                >
                  {submitting ? 'Placing Order...' : 'Send Order to Kitchen →'}
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Incoming QR Orders View */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-serif text-xl font-bold text-[#063B27]">
                Pending QR Customer Orders
              </h2>
              <button
                onClick={fetchPendingOrders}
                disabled={loadingPending}
                className="text-xs bg-white border border-[#063B27]/20 text-[#063B27] font-semibold px-3 py-1.5 rounded-lg hover:bg-gray-50 transition"
              >
                {loadingPending ? 'Refreshing...' : '🔄 Refresh Queue'}
              </button>
            </div>

            {pendingOrders.length === 0 ? (
              <div className="bg-white p-8 rounded-xl border border-dashed border-gray-300 text-center text-gray-500 text-sm">
                No pending customer QR orders at the moment.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pendingOrders.map((order) => (
                  <div
                    key={order.id}
                    className="bg-white p-5 rounded-xl border border-[#063B27]/20 shadow-sm flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between border-b pb-2 mb-3">
                        <div>
                          <span className="bg-[#C6922E]/20 text-[#063B27] font-bold text-xs px-2 py-0.5 rounded">
                            {order.tableLabel}
                          </span>
                          <h4 className="font-bold text-sm text-gray-900 mt-1">
                            {order.orderNumber}
                          </h4>
                          <p className="text-xs text-gray-500">
                            Customer: {order.customerName} ({order.customerMobile || 'No phone'})
                          </p>
                        </div>
                        <span className="text-xs bg-amber-100 text-amber-800 font-semibold px-2 py-0.5 rounded">
                          {order.status}
                        </span>
                      </div>

                      {/* Items */}
                      <ul className="divide-y divide-gray-100 text-xs mb-3">
                        {order.items.map((item, idx) => (
                          <li key={idx} className="py-1.5 flex justify-between">
                            <span>
                              <span className="font-bold mr-1">{item.quantity}x</span>
                              {item.name}
                              {item.notes && (
                                <span className="text-gray-500 italic block pl-4">
                                  Notes: {item.notes}
                                </span>
                              )}
                            </span>
                            <span className="font-semibold text-gray-700">₹{item.lineTotalInr}</span>
                          </li>
                        ))}
                      </ul>

                      {order.notes && (
                        <p className="text-xs bg-gray-50 p-2 rounded text-gray-600 mb-3 italic">
                          Special instructions: {order.notes}
                        </p>
                      )}
                    </div>

                    <div>
                      <div className="flex justify-between items-center text-sm font-bold text-gray-900 border-t pt-2 mb-3">
                        <span>Total Amount:</span>
                        <span className="font-serif text-base text-[#063B27]">
                          ₹{order.totalInr}
                        </span>
                      </div>

                      {rejectingOrderId === order.id ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            placeholder="Reason for rejection (e.g. item sold out)..."
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            className="w-full p-2 border border-red-300 rounded text-xs focus:outline-none"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleRejectOrder(order.id)}
                              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-semibold text-xs py-1.5 rounded"
                            >
                              Confirm Rejection
                            </button>
                            <button
                              onClick={() => setRejectingOrderId(null)}
                              className="px-3 bg-gray-200 text-gray-700 text-xs py-1.5 rounded"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleAcceptOrder(order.id)}
                            className="flex-1 bg-[#063B27] hover:bg-[#084d33] text-white font-semibold text-xs py-2 rounded transition"
                          >
                            ✓ Accept to Kitchen
                          </button>
                          <button
                            onClick={() => {
                              setRejectingOrderId(order.id);
                              setRejectionReason('');
                            }}
                            className="px-3 bg-red-50 hover:bg-red-100 text-red-700 font-semibold text-xs py-2 rounded border border-red-200 transition"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
