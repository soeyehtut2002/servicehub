/**
 * Central config — reads from Vite env vars so the same code
 * works in dev (localhost) AND on Render (production).
 *
 * Set in Render → Static Site → Environment Variables:
 *   VITE_API_URL  = https://your-backend.onrender.com/api
 *   VITE_BASE_URL = https://your-backend.onrender.com
 */

// Full API base URL  e.g. http://localhost:5000/api
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Backend root URL (for /uploads file serving)  e.g. http://localhost:5000
export const BASE_URL = import.meta.env.VITE_BASE_URL
  || API_URL.replace(/\/api$/, '')   // auto-derive from VITE_API_URL if not set
  || 'http://localhost:5000';

// Socket.io URL (same as backend root, no /api)
export const SOCKET_URL = BASE_URL;

/**
 * Resolves an upload path to a full URL.
 * e.g. "/uploads/avatar.jpg"  →  "https://my-backend.onrender.com/uploads/avatar.jpg"
 */
export function resolveUploadUrl(path) {
  if (!path) return null;
  if (path.startsWith('http')) return path;         // already absolute
  return `${BASE_URL}${path}`;
}
