// Katha Cafe API Configuration
// Automatically adapts between local development and live cloud production
//
// NEXT_PUBLIC_API_URL is a BUILD-TIME variable in Next.js.
// For local dev, set NEXT_PUBLIC_API_URL=http://localhost:4000 in .env.local
// For production, we hardcode the Render URL as fallback so it always works.

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ||
  'https://katha-cafe-api.onrender.com';
