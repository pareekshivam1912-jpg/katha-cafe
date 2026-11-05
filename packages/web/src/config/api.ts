// Katha Cafe API Configuration
// In development, defaults to http://localhost:4000
// In production (Render, Vercel, VPS), configured via NEXT_PUBLIC_API_URL environment variable

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') || 'http://localhost:4000';
