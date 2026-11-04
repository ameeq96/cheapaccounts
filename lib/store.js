export const BRAND = 'cheapaccounts';
export const LOCALES = ['en', 'es', 'fr', 'it', 'nl', 'pt', 'ru', 'ur', 'ar', 'hi'];
export const CART_KEY = 'cheapaccounts.cart.package.v1';
export const PROVIDERS = ['Opplex', 'Filex'];
const TERMS = [1, 3, 6, 12];
const PHONE = /^[1-9]\d{6,14}$/;
export const ENQUIRY_PRODUCTS = [
  { id: 'netflix', name: 'Netflix', category: 'ott', plans: ['Subscription enquiry'], planKeys: ['subscriptionEnquiry'], source: 'https://help.netflix.com/en/node/24926', noteKey: 'netflixHouseholdMonthly' },
  { id: 'hbo-max', name: 'HBO Max', category: 'ott', plans: ['Basic with Ads', 'Standard', 'Premium'], source: 'https://help.hbomax.com/US/Answer/Detail/000002547', noteKey: 'hboMaxRegionalTiers' },
  { id: 'ullu', name: 'ULLU', category: 'ott', plans: ['Subscription enquiry'], planKeys: ['subscriptionEnquiry'], source: 'https://play.google.com/store/apps/details?id=cdi.videostreaming.app', noteKey: 'ulluConfirmCurrentMembership' },
  { id: 'prime-video', name: 'Prime Video', category: 'ott', plans: ['Prime Video membership', 'Amazon Prime membership'], source: 'https://www.primevideo.com/help?nodeId=GD5REBNJD74BURF6', noteKey: 'primeVideoSeparateAddons' },
  { id: 'disney-plus', name: 'Disney+', category: 'ott', plans: ['Standard with Ads', 'Standard', 'Premium'], source: 'https://help.disneyplus.com/it/article/disneyplus-it-it-price', noteKey: 'disneyRegionalPlanNames' },
  { id: 'apple-tv', name: 'Apple TV', category: 'ott', plans: ['Apple TV subscription'], source: 'https://www.apple.com/apple-tv/', noteKey: 'appleTvServiceNotHardware' },
  { id: 'jiohotstar', name: 'JioHotstar', category: 'ott', plans: ['Mobile', 'Super', 'Premium'], source: 'https://cdn.jiostar.com/jiostar/wp-content/uploads/2026/01/JioHotstar-Introduces-Monthly-Plans.pdf', noteKey: 'jioHotstarIndiaDeviceTier' },
  { id: 'sony-liv', name: 'Sony LIV', category: 'ott', plans: ['Mobile Only (yearly)', 'LIV Premium (monthly)', 'LIV Premium (yearly)'], source: 'https://www.sonyliv.com/subscription', noteKey: 'sonyLivRegionalDeviceTerms' },
  { id: 'zee5', name: 'ZEE5', category: 'ott', plans: ['Premium enquiry'], planKeys: ['premiumEnquiry'], source: 'https://www.zee5.com/', noteKey: 'zee5ConfirmCurrentRegionalPack' },
  { id: 'crunchyroll', name: 'Crunchyroll', category: 'ott', plans: ['Fan', 'Mega Fan', 'Ultimate Fan'], source: 'https://www.crunchyroll.com/premium/', noteKey: 'crunchyrollRegionalTierBenefits' },
  { id: 'paramount-plus', name: 'Paramount+', category: 'ott', plans: ['Essential', 'Premium'], source: 'https://www.paramountplus.com/', noteKey: 'paramountSelectedMarkets' },
  { id: 'peacock', name: 'Peacock', category: 'ott', plans: ['Select', 'Premium', 'Premium Plus'], source: 'https://www.peacocktv.com/', noteKey: 'peacockDistinctContentTiers' },
  { id: 'chatgpt', name: 'ChatGPT', category: 'ai', plans: ['Go', 'Plus', 'Pro'], source: 'https://chatgpt.com/pricing/', noteKey: 'chatgptSubscriptionNotApi' },
  { id: 'claude', name: 'Claude', category: 'ai', plans: ['Pro', 'Max', 'Ultra'], source: 'https://claude.com/pricing', noteKey: 'claudeUsageAndAccountRequirements' },
  { id: 'gemini', name: 'Google Gemini', category: 'ai', plans: ['Google AI Plus', 'Google AI Pro', 'Google AI Ultra'], source: 'https://gemini.google/subscriptions/', noteKey: 'geminiCountryAndPersonalAccount' },
  { id: 'grok', name: 'Grok / The X Subscription', category: 'ai', plans: ['Plus', 'Premium', 'Super', 'Ultra'], source: 'https://x.ai/pricing', noteKey: 'grokUnifiedSubscriptionEligibility' },
  { id: 'deepseek', name: 'DeepSeek', category: 'ai', plans: ['Chat setup enquiry', 'API usage enquiry'], planKeys: ['chatSetupEnquiry', 'apiUsageEnquiry'], source: 'https://www.deepseek.com/', noteKey: 'deepseekChatAndApiSeparate' }
];
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
  const phone = typeof value.support?.phone === 'string' && PHONE.test(value.support.phone) ? value.support.phone : null;
  const display = value.support?.phone_display;
  return { brand: BRAND, locale, currency: 'USD',
    packages: packages.sort((a, b) => PROVIDERS.indexOf(a.service) - PROVIDERS.indexOf(b.service) || a.duration_months - b.duration_months),
    content: value.content && typeof value.content === 'object' && !Array.isArray(value.content) ? value.content : null,
    support: { email: typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null, phone,
      phone_display: phone && typeof display === 'string' && display.replace(/[+ ()-]/g, '') === phone ? display : null } };
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

export function whatsappUrl(phone, message) {
  if (typeof phone !== 'string' || !PHONE.test(phone) || typeof message !== 'string'
    || !message.trim() || message.length > 2000 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(message)) return null;
  const url = new URL('https://wa.me/' + phone);
  url.searchParams.set('text', message.trim());
  return url.href;
}
