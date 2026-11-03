export const BRAND = 'cheapaccounts';
export const LOCALES = ['en', 'es', 'fr', 'it', 'nl', 'pt', 'ru', 'ur', 'ar', 'hi'];
export const CART_KEY = 'cheapaccounts.cart.package.v1';
export const PROVIDERS = ['Opplex', 'Filex'];
const TERMS = [1, 3, 6, 12];
export function normalizeCatalog(value, locale = 'en') {
  if (!LOCALES.includes(locale) || !value || value.brand !== BRAND || value.locale !== locale
    || value.currency !== 'USD' || !Array.isArray(value.packages)) return null;
  const seen = new Set(), packages = [];
  for (const plan of value.packages) {
    if (!plan || plan.type !== 'iptv' || plan.is_available !== true || !Number.isSafeInteger(plan.id)
      || plan.id <= 0 || seen.has(plan.id) || !PROVIDERS.includes(plan.service)
      || plan.currency !== value.currency || typeof plan.price_amount !== 'number'
      || !Number.isFinite(plan.price_amount) || plan.price_amount <= 0
      || !TERMS.includes(plan.duration_months)
      || !(plan.max_devices == null || (Number.isSafeInteger(plan.max_devices) && plan.max_devices > 0))) return null;
    seen.add(plan.id);
    packages.push({ id: plan.id, type: 'iptv', service: plan.service, currency: plan.currency,
      price_amount: plan.price_amount, duration_months: plan.duration_months,
      max_devices: plan.max_devices ?? null, is_available: true });
  }
  const email = value.support?.email;
  return { brand: BRAND, locale, currency: 'USD',
    packages: packages.sort((a, b) => PROVIDERS.indexOf(a.service) - PROVIDERS.indexOf(b.service) || a.duration_months - b.duration_months),
    content: value.content && typeof value.content === 'object' && !Array.isArray(value.content) ? value.content : null,
    support: { email: typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null } };
}
export function packageFor(catalog, id) {
  return Number.isSafeInteger(id) ? catalog?.packages?.find(plan => plan.id === id) || null : null;
}
export function plansForProvider(catalog, provider) {
  return PROVIDERS.includes(provider) ? (catalog?.packages || []).filter(plan => plan.service === provider) : [];
}
export function quoteKey(plan) {
  return plan ? [plan.id, plan.service, plan.currency, plan.price_amount, plan.duration_months, plan.max_devices ?? 'unknown'].join('|') : '';
}
export function storedPackageId(value) {
  if (typeof value !== 'string' || !/^[1-9]\d{0,14}$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) ? id : null;
}
export function checkoutUrl(id) {
  if (!Number.isSafeInteger(id) || id <= 0) return null;
  const url = new URL('https://opplexiptv.com/checkout');
  url.searchParams.set('package_id', String(id));
  url.searchParams.set('utm_source', BRAND);
  url.searchParams.set('utm_medium', 'landing');
  return url.href;
}
export function centralUrl(path) {
  if (!['/account', '/account/setup', '/contact', '/terms-of-service', '/privacy-policy', '/refund-policy'].includes(path)) return null;
  const url = new URL(path, 'https://opplexiptv.com');
  url.searchParams.set('utm_source', BRAND);
  url.searchParams.set('utm_medium', 'landing');
  return url.href;
}
export function sortPlans(plans, order = 'recommended') {
  const copy = [...plans];
  if (order === 'price-low') return copy.sort((a, b) => a.price_amount - b.price_amount || a.id - b.id);
  if (order === 'price-high') return copy.sort((a, b) => b.price_amount - a.price_amount || a.id - b.id);
  return copy.sort((a, b) => PROVIDERS.indexOf(a.service) - PROVIDERS.indexOf(b.service) || a.duration_months - b.duration_months);
}
