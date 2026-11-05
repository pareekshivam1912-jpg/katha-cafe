'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { API_BASE_URL } from '../../config/api';

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

interface SettledPayment {
  id: string;
  orderId: string;
  orderNumber: string;
  amountInr: number;
  method: string;
  status: string;
  bankReference: string | null;
  verifiedBy: string;
  verifiedAt: string;
  createdAt: string;
}

export default function PosPage() {
  const [activeTab, setActiveTab] = useState<'terminal' | 'pending' | 'payments'>('terminal');
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
  const [lastCreatedOrder, setLastCreatedOrder] = useState<{ id: string; orderNumber: string; totalInr: number } | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Pending QR Orders State
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [loadingPending, setLoadingPending] = useState(false);
  const [rejectingOrderId, setRejectingOrderId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // Settled Payments State
  const [settledPayments, setSettledPayments] = useState<SettledPayment[]>([]);
  const [totalSettledInr, setTotalSettledInr] = useState<number>(0);
  const [loadingPayments, setLoadingPayments] = useState(false);

  // Settlement Modal State
  const [settleModalOrder, setSettleModalOrder] = useState<{ id: string; orderNumber: string; totalInr: number } | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'CASH' | 'UPI_AT_COUNTER' | 'CARD_AT_COUNTER'>('CASH');
  const [bankRef, setBankRef] = useState('');
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [paymentReceipt, setPaymentReceipt] = useState<any | null>(null);

  // 1. Initial Authentication: check localStorage first, or fallback to Cashier credentials
  useEffect(() => {
    async function loginCashierMock() {
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
            username: 'cashier_mock',
            password: 'Cashier@Katha2026!',
          }),
        });
        if (res.ok) {
          const data = await res.json();
          setStaffToken(data.token);
          setStaffUser(data.user);
          localStorage.setItem('katha_staff_token', data.token);
          localStorage.setItem('katha_staff_user', JSON.stringify(data.user));
        } else {
          setAuthError('Staff authentication required. Please log in.');
        }
      } catch (err) {
        setAuthError(`API server unreachable at ${API_BASE_URL}.`);
      }
    }

    loginCashierMock();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('katha_staff_token');
    localStorage.removeItem('katha_staff_user');
    window.location.href = '/login';
  };

  // 2. Fetch Menu Items
  useEffect(() => {
    async function fetchMenu() {
      try {
        const res = await fetch(`${API_BASE_URL}/api/menu`);
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

  // 3. Fetch Pending Orders
  const fetchPendingOrders = async () => {
    if (!staffToken) return;
    setLoadingPending(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/pos/orders/pending`, {
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

  // 4. Fetch Settled Payments
  const fetchSettledPayments = async () => {
    if (!staffToken) return;
    setLoadingPayments(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/pos/payments`, {
        headers: { Authorization: `Bearer ${staffToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setSettledPayments(data.payments || []);
        setTotalSettledInr(data.totalSettledInr || 0);
      }
    } catch (err) {
      console.error('Failed to fetch payments:', err);
    } finally {
      setLoadingPayments(false);
    }
  };

  useEffect(() => {
    if (!staffToken) return;

    // Always poll pending orders so the incoming QR badge updates in real time
    fetchPendingOrders();
    const interval = setInterval(fetchPendingOrders, 5000);

    if (activeTab === 'payments') {
      fetchSettledPayments();
    }

    return () => clearInterval(interval);
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
          name: c.name,
          quantity: c.quantity,
          notes: c.notes,
        })),
        notes: orderNotes.trim() || undefined,
      };

      if (customerName.trim()) {
        payload.customerName = customerName.trim();
      }
      if (customerMobile.trim()) {
        payload.customerMobile = customerMobile.replace(/[\s\-()]/g, '');
      }

      const res = await fetch(`${API_BASE_URL}/api/pos/orders`, {
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

      setLastCreatedOrder({
        id: data.orderId,
        orderNumber: data.orderNumber,
        totalInr: data.totalInr,
      });
      setSuccessMessage(`Order #${data.orderNumber} sent to kitchen! Total: ₹${data.totalInr}`);
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

  // Settle Payment at Counter
  const handleRecordPayment = async () => {
    if (!settleModalOrder || isProcessingPayment) return;

    setIsProcessingPayment(true);
    setErrorMessage(null);

    try {
      const idempotencyKey = `pay-${settleModalOrder.id}-${Date.now()}`;
      const res = await fetch(`${API_BASE_URL}/api/pos/orders/${settleModalOrder.id}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${staffToken}`,
        },
        body: JSON.stringify({
          amountInr: settleModalOrder.totalInr,
          method: paymentMethod,
          bankReference: bankRef.trim() || undefined,
          idempotencyKey,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMessage(data.message || 'Payment recording failed.');
        return;
      }

      setPaymentReceipt(data);
      if (lastCreatedOrder?.id === settleModalOrder.id) {
        setLastCreatedOrder(null);
      }
    } catch (err) {
      setErrorMessage('Network error recording payment.');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Accept QR Order
  const handleAcceptOrder = async (orderId: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/api/pos/orders/${orderId}/accept`, {
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
      const res = await fetch(`${API_BASE_URL}/api/pos/orders/${orderId}/reject`, {
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
            POS Terminal & Payments
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
            Kitchen KDS →
          </Link>

          <Link
            href="/login"
            className="bg-white/10 hover:bg-white/20 text-white text-xs px-2.5 py-1.5 rounded transition"
          >
            Switch Role
          </Link>

          <button
            onClick={handleLogout}
            className="text-xs bg-red-900/60 hover:bg-red-800 text-red-200 border border-red-700/60 px-2.5 py-1.5 rounded transition"
          >
            Logout
          </button>
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
            <span className="bg-[#C6922E] text-[#063B27] font-bold text-xs px-2 py-0.5 rounded-full animate-pulse shadow">
              {pendingOrders.length} New
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`px-4 py-2 rounded-lg font-medium text-sm transition flex items-center gap-2 ${
            activeTab === 'payments'
              ? 'bg-[#063B27] text-white shadow'
              : 'bg-white text-[#063B27] hover:bg-[#063B27]/5'
          }`}
        >
          <span>💰 Settled Payments & Cash Up</span>
        </button>
      </div>

      {/* Main View Area */}
      <div className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {authError && (
          <div className="mb-4 p-4 bg-red-100 border border-red-300 text-red-800 rounded-lg text-sm">
            {authError}
          </div>
        )}

        {/* Payment Settlement Modal */}
        {settleModalOrder && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-100">
              {paymentReceipt ? (
                <div className="text-center space-y-4">
                  <div className="w-12 h-12 bg-green-100 text-green-700 rounded-full flex items-center justify-center mx-auto text-2xl font-bold">
                    ✓
                  </div>
                  <h3 className="font-serif text-xl font-bold text-[#063B27]">Payment Settled!</h3>
                  <div className="bg-gray-50 p-4 rounded-xl text-left text-xs space-y-2 border">
                    <p className="flex justify-between"><span className="text-gray-500">Receipt Ref:</span> <span className="font-mono font-bold">{paymentReceipt.paymentId.slice(0, 8)}</span></p>
                    <p className="flex justify-between"><span className="text-gray-500">Order Number:</span> <span className="font-bold">{paymentReceipt.orderNumber}</span></p>
                    <p className="flex justify-between"><span className="text-gray-500">Amount Paid:</span> <span className="font-bold text-base text-[#063B27]">₹{paymentReceipt.amountInr}</span></p>
                    <p className="flex justify-between"><span className="text-gray-500">Payment Method:</span> <span className="font-semibold">{paymentReceipt.method}</span></p>
                    {paymentReceipt.bankReference && (
                      <p className="flex justify-between"><span className="text-gray-500">Bank Ref:</span> <span className="font-mono">{paymentReceipt.bankReference}</span></p>
                    )}
                    <p className="flex justify-between"><span className="text-gray-500">Verified By:</span> <span>{paymentReceipt.verifiedBy}</span></p>
                  </div>
                  <button
                    onClick={() => {
                      setSettleModalOrder(null);
                      setPaymentReceipt(null);
                    }}
                    className="w-full bg-[#063B27] text-white py-2.5 rounded-lg font-semibold text-sm hover:bg-[#084d33] transition"
                  >
                    Close Receipt
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-start border-b pb-3">
                    <div>
                      <h3 className="font-serif text-lg font-bold text-[#063B27]">Record Payment at Counter</h3>
                      <p className="text-xs text-gray-500">Order #{settleModalOrder.orderNumber}</p>
                    </div>
                    <span className="font-serif text-xl font-bold text-[#063B27]">₹{settleModalOrder.totalInr}</span>
                  </div>

                  {errorMessage && (
                    <div className="p-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded">
                      {errorMessage}
                    </div>
                  )}

                  {/* Payment Method Selector */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-gray-700">Select Counter Payment Method:</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['CASH', 'UPI_AT_COUNTER', 'CARD_AT_COUNTER'] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setPaymentMethod(m)}
                          className={`py-2 px-2 text-xs font-bold rounded-lg border text-center transition ${
                            paymentMethod === m
                              ? 'bg-[#063B27] text-white border-[#063B27]'
                              : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                          }`}
                        >
                          {m === 'CASH' ? '💵 Cash' : m === 'UPI_AT_COUNTER' ? '📱 UPI' : '💳 Card'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {paymentMethod === 'UPI_AT_COUNTER' && (
                    <div>
                      <label className="text-xs font-semibold text-gray-700 block mb-1">
                        Bank/UPI Reference Note (Optional):
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. 12-digit UTR or txn ID..."
                        value={bankRef}
                        onChange={(e) => setBankRef(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-[#063B27] focus:outline-none"
                      />
                    </div>
                  )}

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setSettleModalOrder(null)}
                      disabled={isProcessingPayment}
                      className="px-4 py-2 border border-gray-300 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-100 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleRecordPayment}
                      disabled={isProcessingPayment}
                      className="flex-1 bg-[#063B27] hover:bg-[#084d33] text-white py-2 rounded-lg font-bold text-xs transition disabled:opacity-50"
                    >
                      {isProcessingPayment ? 'Recording Settlement...' : `Confirm & Record ₹${settleModalOrder.totalInr} →`}
                    </button>
                  </div>
                </div>
              )}
            </div>
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
                  <div className="p-3 bg-green-50 border border-green-200 text-green-900 rounded-lg text-xs space-y-2">
                    <p className="font-semibold">{successMessage}</p>
                    {lastCreatedOrder && (
                      <button
                        onClick={() => {
                          setSettleModalOrder(lastCreatedOrder);
                          setPaymentReceipt(null);
                        }}
                        className="w-full bg-[#C6922E] hover:bg-[#b58326] text-[#063B27] font-bold py-1.5 rounded transition text-xs"
                      >
                        💳 Record Payment Now (₹{lastCreatedOrder.totalInr})
                      </button>
                    )}
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
        ) : activeTab === 'pending' ? (
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
                              setSettleModalOrder({
                                id: order.id,
                                orderNumber: order.orderNumber,
                                totalInr: order.totalInr,
                              });
                              setPaymentReceipt(null);
                            }}
                            className="px-3 bg-[#C6922E] hover:bg-[#b58326] text-[#063B27] font-bold text-xs py-2 rounded transition"
                          >
                            💳 Settle
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
        ) : (
          /* Settled Payments View */
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-serif text-xl font-bold text-[#063B27]">
                  Counter Payments & Reconciliation
                </h2>
                <p className="text-xs text-gray-500">
                  Total Settled: <span className="font-bold text-base text-[#063B27]">₹{totalSettledInr}</span> across {settledPayments.length} recorded payments
                </p>
              </div>
              <button
                onClick={fetchSettledPayments}
                disabled={loadingPayments}
                className="text-xs bg-white border border-[#063B27]/20 text-[#063B27] font-semibold px-3 py-1.5 rounded-lg hover:bg-gray-50 transition"
              >
                {loadingPayments ? 'Refreshing...' : '🔄 Refresh Ledger'}
              </button>
            </div>

            {settledPayments.length === 0 ? (
              <div className="bg-white p-8 rounded-xl border border-dashed border-gray-300 text-center text-gray-500 text-sm">
                No settled payments recorded yet today.
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#063B27]/5 border-b border-gray-200 text-gray-700 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="p-3">Order Number</th>
                      <th className="p-3">Method</th>
                      <th className="p-3">Amount</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Reference</th>
                      <th className="p-3">Cashier</th>
                      <th className="p-3">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {settledPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="p-3 font-bold text-gray-900">{p.orderNumber}</td>
                        <td className="p-3">
                          <span className="bg-gray-100 px-2 py-0.5 rounded text-[11px] font-semibold text-gray-800">
                            {p.method}
                          </span>
                        </td>
                        <td className="p-3 font-serif font-bold text-sm text-[#063B27]">₹{p.amountInr}</td>
                        <td className="p-3">
                          <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded text-[11px] font-bold">
                            {p.status}
                          </span>
                        </td>
                        <td className="p-3 text-gray-500 font-mono text-[11px]">{p.bankReference || '—'}</td>
                        <td className="p-3 text-gray-700">{p.verifiedBy || 'Cashier'}</td>
                        <td className="p-3 text-gray-500">{new Date(p.createdAt).toLocaleTimeString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
