export const site = { brand: 'cheapaccounts', name: 'Cheap Accounts', domain: 'cheapaccounts.shop', source: 'cheapaccounts' };
export const SUPPORTED_LOCALES = ['en', 'es', 'fr', 'it', 'nl', 'pt', 'ru', 'ur', 'ar', 'hi'];
export const LANGUAGE_NAMES = { en: 'English', es: 'Español', fr: 'Français', it: 'Italiano', nl: 'Nederlands', pt: 'Português', ru: 'Русский', ur: 'اردو', ar: 'العربية', hi: 'हिन्दी' };
export const ROUTES = ['', 'shop', 'categories/iptv', 'categories/ott', 'categories/ai', 'categories/chatgpt', 'categories/netflix', 'categories/hbo-max', 'products/opplex-iptv', 'products/filex-iptv', 'cart', 'about', 'contact', 'faqs', 'buying-guide', 'privacy-policy', 'terms-of-service', 'refund-policy'];
export const NOINDEX_ROUTES = ['cart', 'categories/chatgpt', 'categories/netflix', 'categories/hbo-max'];
export const isRtl = locale => ['ar', 'ur'].includes(locale);
export function pathFor(locale, slug = '') {
  if (!SUPPORTED_LOCALES.includes(locale) || !ROUTES.includes(slug)) throw new Error('Invalid store route');
  return '/' + (locale === 'en' ? '' : locale + '/') + (slug ? slug + '/' : '');
}
export function resolveRoute(segments = []) {
  const parts = [...segments];
  const locale = SUPPORTED_LOCALES.includes(parts[0]) && parts[0] !== 'en' ? parts.shift() : 'en';
  const slug = parts.join('/');
  return { locale, slug, valid: ROUTES.includes(slug) };
}
