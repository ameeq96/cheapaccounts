import { LOCALES, normalizeCatalog } from './store.js';
export function apiOrigin() {
  const configured = process.env.NEXT_PUBLIC_LANDING_API_ORIGIN;
  if (configured && !['https://opplexiptv.com', 'http://127.0.0.1:8001'].includes(configured)) throw new Error('Invalid public catalogue origin');
  return configured || 'https://opplexiptv.com';
}
export async function fetchCatalog(locale = 'en', { signal } = {}) {
  if (!LOCALES.includes(locale)) throw new Error('Unsupported catalogue language');
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(abort, 12000);
  try {
    const url = new URL('/api/v1/site/brands/cheapaccounts/content', apiOrigin());
    url.searchParams.set('locale', locale);
    const response = await fetch(url.href, { credentials: 'omit', cache: 'no-store', redirect: 'error',
      headers: { Accept: 'application/json' }, signal: controller.signal });
    if (!response.ok) throw new Error('Catalogue request failed');
    const body = await response.json();
    const catalog = normalizeCatalog(body?.data, locale);
    if (!catalog) throw new Error('Invalid catalogue response');
    return catalog;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}
