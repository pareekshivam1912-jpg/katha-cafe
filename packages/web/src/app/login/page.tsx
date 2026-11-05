'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { API_BASE_URL } from '../../config/api';

const QUICK_ACCOUNTS = [
  {
    role: 'ADMIN',
    label: 'Admin / Manager',
    username: 'admin_mock',
    password: 'Admin@Katha2026!',
    target: '/admin',
    description: 'Inventory, Sales Reports & Reconciliation',
    icon: '📊',
  },
  {
    role: 'CASHIER',
    label: 'Cashier / POS',
    username: 'cashier_mock',
    password: 'Cashier@Katha2026!',
    target: '/pos',
    description: 'Counter Terminal, QR Approval & Bill Settlement',
    icon: '💳',
  },
  {
    role: 'KITCHEN',
    label: 'Kitchen Chef / KDS',
    username: 'kitchen_mock',
    password: 'Kitchen@Katha2026!',
    target: '/kds',
    description: 'Kitchen Order Tickets & Food Preparation',
    icon: '👨‍🍳',
  },
];

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get('redirect');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSelectQuickAccount = (acc: typeof QUICK_ACCOUNTS[0]) => {
    setUsername(acc.username);
    setPassword(acc.password);
    setError(null);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password) {
      setError('Please provide both username and password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          password,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.message || 'Login failed. Please check your credentials.');
        setLoading(false);
        return;
      }

      // Store in localStorage for client-side authentication
      localStorage.setItem('katha_staff_token', data.token);
      localStorage.setItem('katha_staff_user', JSON.stringify(data.user));

      // Redirect user to their destination or role-specific portal
      if (redirectUrl) {
        router.push(redirectUrl);
      } else if (data.user.role === 'ADMIN' || data.user.role === 'MANAGER') {
        router.push('/admin');
      } else if (data.user.role === 'KITCHEN') {
        router.push('/kds');
      } else {
        router.push('/pos');
      }
    } catch (err) {
      console.error('[login] Connection error:', err);
      setError(`Cannot reach API server at ${API_BASE_URL}. Please check internet connection.`);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F7F0E2] flex flex-col justify-between font-sans">
      {/* Top Header */}
      <header className="bg-[#063B27] text-white px-6 py-4 flex items-center justify-between border-b border-[#C6922E]/40 shadow-sm">
        <Link href="/" className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-[#C6922E]/20 border border-[#C6922E] flex items-center justify-center font-serif font-bold text-base text-[#C6922E]">
            कथा
          </span>
          <div>
            <span className="block font-serif font-bold text-lg text-white">Katha Café</span>
            <span className="block text-[10px] text-[#C6922E] uppercase tracking-wider font-semibold">
              Operations & Staff Portal
            </span>
          </div>
        </Link>

        <Link
          href="/"
          className="text-xs text-white/80 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded transition"
        >
          ← Return to Website
        </Link>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 my-6">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-[#063B27]/10 p-6 sm:p-8">
          <div className="text-center mb-6">
            <span className="inline-block p-3 rounded-full bg-[#063B27]/10 text-2xl mb-2">🔐</span>
            <h1 className="font-serif font-bold text-2xl text-[#063B27]">Staff & Station Sign In</h1>
            <p className="text-xs text-gray-500 mt-1">
              Select your role below or enter assigned staff credentials.
            </p>
          </div>

          {/* Quick Demo Credentials Selector */}
          <div className="mb-6 space-y-2">
            <label className="block text-[11px] font-bold text-gray-500 uppercase tracking-wider">
              1-Click Role Login (Testing / Live Demo)
            </label>
            <div className="grid grid-cols-1 gap-2">
              {QUICK_ACCOUNTS.map((acc) => (
                <button
                  key={acc.role}
                  type="button"
                  onClick={() => handleSelectQuickAccount(acc)}
                  className={`p-2.5 rounded-xl border text-left flex items-center justify-between text-xs transition ${
                    username === acc.username
                      ? 'bg-[#063B27] text-white border-[#063B27] shadow'
                      : 'bg-gray-50 hover:bg-gray-100 text-gray-700 border-gray-200'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-base">{acc.icon}</span>
                    <div>
                      <p className="font-semibold">{acc.label}</p>
                      <p className={`text-[10px] ${username === acc.username ? 'text-amber-200' : 'text-gray-500'}`}>
                        {acc.description}
                      </p>
                    </div>
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded ${
                    username === acc.username ? 'bg-amber-400 text-[#063B27]' : 'bg-gray-200 text-gray-700'
                  }`}>
                    Use
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs">
              {error}
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Username</label>
              <input
                type="text"
                required
                placeholder="e.g. cashier_mock or admin_mock"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#063B27]"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Password</label>
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#063B27]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-[#063B27] hover:bg-[#084d33] text-[#C6922E] font-bold text-sm transition shadow-md disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : 'Sign In to Station →'}
            </button>
          </form>

          {/* Direct Station Links */}
          <div className="mt-6 pt-4 border-t border-gray-100 flex items-center justify-around text-xs text-gray-500">
            <Link href="/pos" className="hover:text-[#063B27] hover:underline">
              POS Terminal
            </Link>
            <span>•</span>
            <Link href="/kds" className="hover:text-[#063B27] hover:underline">
              Kitchen KDS
            </Link>
            <span>•</span>
            <Link href="/admin" className="hover:text-[#063B27] hover:underline">
              Admin & Reports
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-xs text-gray-500 border-t border-gray-200">
        Katha Café Jaipur • Internal Operational Portal • Zero External Cloud Charges
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-gray-500">Loading sign in...</div>}>
      <LoginContent />
    </Suspense>
  );
}
