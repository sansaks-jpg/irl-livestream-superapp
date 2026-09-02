// Utility for API requests with configurable backend server URL

const DEFAULT_SERVER_URL = 'http://192.168.100.11:5000';

export function getServerUrl() {
  if (typeof window === 'undefined') return DEFAULT_SERVER_URL;

  const saved = localStorage.getItem('serverUrl');
  if (saved) return saved.replace(/\/$/, '');

  // If in Capacitor WebView (https://localhost or capacitor://)
  if (window.location.origin.includes('localhost') && (!window.location.port || window.location.port === '80' || window.location.port === '443')) {
    return DEFAULT_SERVER_URL;
  }

  // If running in browser dev or web
  return window.location.origin;
}

export function setServerUrl(url) {
  if (!url) return;
  const clean = url.trim().replace(/\/$/, '');
  localStorage.setItem('serverUrl', clean);
}

export async function apiFetch(path, options = {}) {
  const baseUrl = getServerUrl();
  const url = path.startsWith('http') ? path : `${baseUrl}${path.startsWith('/') ? '' : '/'}${path}`;

  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Accept': 'application/json',
        ...(options.headers || {})
      }
    });

    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await res.text();
      console.warn(`[API] Non-JSON response from ${url}:`, text.slice(0, 100));
      throw new Error(`Server tidak mengembalikan JSON dari ${url}. Pastikan backend server 'npm start' aktif di komputer.`);
    }

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || `Request gagal dengan status ${res.status}`);
    }
    return data;
  } catch (err) {
    console.error(`[API] Request failed for ${url}:`, err.message);
    throw err;
  }
}
