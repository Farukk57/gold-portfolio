const YEAR_MS = 365 * 24 * 60 * 60 * 1000;

export function getCookie(key) {
  const match = document.cookie.split(';').find(c => c.trim().startsWith(key + '='));
  if (match) return decodeURIComponent(match.split('=').slice(1).join('='));
  // One-time migration: promote existing localStorage value on first read
  try { return localStorage.getItem(key); } catch { return null; }
}

export function setCookie(key, value) {
  const expires = new Date(Date.now() + YEAR_MS).toUTCString();
  document.cookie = `${key}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}
