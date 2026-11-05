// Katha Cafe API Configuration
// Automatically adapts between local development and live cloud production

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ||
  (typeof window !== 'undefined' && !window.location.hostname.includes('localhost')
    ? 'https://katha-cafe-api.onrender.com'
    : 'http://localhost:4000');
