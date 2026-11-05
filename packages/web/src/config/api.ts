// Katha Cafe API Configuration
// Automatically adapts between local development and live cloud production

function resolveApiBaseUrl(): string {
  const envVal = process.env.NEXT_PUBLIC_API_URL ? String(process.env.NEXT_PUBLIC_API_URL).trim().replace(/\/$/, '') : '';

  // 1. If a valid absolute URL was configured (e.g. http://localhost:4000 or https://katha-cafe-api.onrender.com)
  if (envVal && (envVal.startsWith('http://') || envVal.startsWith('https://'))) {
    return envVal;
  }

  // 2. If running in browser on a live cloud domain
  if (typeof window !== 'undefined' && !window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
    return 'https://katha-cafe-api.onrender.com';
  }

  // 3. Official live production backend API on Render
  return 'https://katha-cafe-api.onrender.com';
}

export const API_BASE_URL = resolveApiBaseUrl();
