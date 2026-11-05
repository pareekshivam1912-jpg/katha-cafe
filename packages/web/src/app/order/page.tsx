'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

function OrderContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tableInfo, setTableInfo] = useState<{ tableLabel: string; sessionId: string } | null>(null);

  // Customer form state
  const [fullName, setFullName] = useState('');
  const [mobile, setMobile] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [customer, setCustomer] = useState<{ id: string; fullName: string; mobileE164: string } | null>(null);

  useEffect(() => {
    if (!token) {
      setError('No table QR token detected. Please scan the QR code placed on your table.');
      setLoading(false);
      return;
    }

    async function resolveTable() {
      try {
        const res = await fetch(`http://localhost:4000/api/tables/resolve/${token}`);
        if (!res.ok) {
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
      } catch (err) {
        setError('Unable to connect to the café server. Please check your network or ask staff.');
      } finally {
        setLoading(false);
      }
    }

    resolveTable();
  }, [token]);

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

    setSubmitting(true);
    try {
      const res = await fetch('http://localhost:4000/api/table-sessions/identify-customer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: tableInfo.sessionId,
          fullName: fullName.trim(),
          mobile: cleanMobile,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.message || 'Failed to verify details. Please try again.');
        return;
      }

      setCustomer(data.customer);
    } catch (err) {
      setFormError('Network connection failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-ivory flex flex-col justify-between p-4 sm:p-6">
      <div className="max-w-md w-full mx-auto my-auto py-8">
        {/* Header Branding */}
        <div className="text-center mb-8">
          <div className="inline-flex w-12 h-12 rounded-full bg-brand-forest text-brand-gold text-2xl font-serif font-bold items-center justify-center mb-3 shadow-sm">
            कथा
          </div>
          <h1 className="text-2xl font-serif font-bold text-brand-forest">
            Katha Cafe Table Ordering
          </h1>
          <p className="text-xs text-kathaText-muted">Pure Vegetarian • Jaipur</p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="bg-surface-paper rounded-xl p-8 border border-kathaBorder-subtle text-center shadow-sm">
            <p className="text-sm text-kathaText-muted animate-pulse">Resolving table session...</p>
          </div>
        )}

        {/* Error State (Invalid/Disabled QR) */}
        {!loading && error && (
          <div className="bg-surface-paper rounded-xl p-8 border border-red-200 text-center shadow-sm">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-4 text-xl font-bold">
              ✕
            </div>
            <h2 className="text-lg font-serif font-bold text-red-800 mb-2">
              QR Code Unavailable
            </h2>
            <p className="text-sm text-kathaText-muted mb-6">
              {error}
            </p>
            <a
              href="/"
              className="inline-block px-5 py-2.5 rounded-lg bg-brand-forest text-surface-paper text-xs font-semibold hover:bg-brand-forestDeep transition-all"
            >
              Return to Homepage
            </a>
          </div>
        )}

        {/* Valid Table Detected */}
        {!loading && !error && tableInfo && (
          <div className="bg-surface-paper rounded-xl p-6 sm:p-8 border border-kathaBorder-subtle shadow-md">
            {/* Read-only Table Badge */}
            <div className="flex items-center justify-between pb-4 mb-6 border-b border-kathaBorder-subtle">
              <div>
                <span className="block text-[11px] uppercase tracking-wider text-kathaText-muted font-semibold">
                  Detected Table
                </span>
                <span className="block text-xl font-serif font-bold text-brand-forest">
                  {tableInfo.tableLabel}
                </span>
              </div>
              <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold">
                Dine In Active
              </span>
            </div>

            {/* Customer Identification Form */}
            {!customer ? (
              <form onSubmit={handleIdentifyCustomer} className="space-y-4">
                <div className="mb-2">
                  <h2 className="text-base font-serif font-bold text-kathaText-primary">
                    Please Enter Your Details
                  </h2>
                  <p className="text-xs text-kathaText-muted">
                    Required to associate your order with your table. No account or password needed.
                  </p>
                </div>

                {formError && (
                  <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
                    {formError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-kathaText-primary mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Aarav Sharma"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-kathaBorder-subtle bg-surface-ivory/50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-gold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-kathaText-primary mb-1">
                    10-digit Mobile Number
                  </label>
                  <div className="flex rounded-lg border border-kathaBorder-subtle overflow-hidden focus-within:ring-2 focus-within:ring-brand-gold">
                    <span className="bg-surface-ivory px-3 py-2.5 text-xs text-kathaText-muted font-medium border-r border-kathaBorder-subtle flex items-center">
                      +91
                    </span>
                    <input
                      type="tel"
                      required
                      placeholder="9876543210"
                      maxLength={10}
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-surface-ivory/50 text-sm focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full mt-4 py-3 rounded-lg bg-brand-forest hover:bg-brand-forestDeep text-brand-gold font-semibold text-sm transition-all shadow-sm disabled:opacity-50"
                >
                  {submitting ? 'Verifying...' : 'Continue to Menu →'}
                </button>
              </form>
            ) : (
              <div className="text-center py-4">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
                  ✓
                </div>
                <h3 className="font-serif font-bold text-lg text-brand-forest">
                  Welcome, {customer.fullName}!
                </h3>
                <p className="text-xs text-kathaText-muted mb-4">
                  Mobile: {customer.mobileE164}
                </p>
                <div className="p-3 bg-brand-gold/10 border border-brand-gold/30 rounded-lg text-xs text-brand-forestDeep font-medium">
                  Ready to browse menu and add dishes to your cart (Phase 5).
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="text-center text-[11px] text-kathaText-muted py-4">
        Katha Cafe • B-82A Ganga Jamuna Colony, Murlipura, Jaipur
      </div>
    </div>
  );
}

export default function OrderPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-kathaText-muted">Loading table...</div>}>
      <OrderContent />
    </Suspense>
  );
}
