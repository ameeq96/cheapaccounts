import test from 'node:test';
import assert from 'node:assert/strict';
import { ENQUIRY_PRODUCTS, normalizeCatalog, packageFor, plansForProvider, quoteKey, storedPackageId, checkoutUrl, centralUrl, sortPlans, whatsappUrl } from '../lib/store.js';
import { ROUTES, NOINDEX_ROUTES, pathFor } from '../lib/site.js';
const row = (id = 62, changes = {}) => ({ id, type: 'iptv', service: 'Opplex', price_amount: 2.99, currency: 'USD', duration_months: 1, max_devices: 1, is_available: true, ...changes });
const payload = packages => ({ brand: 'cheapaccounts', locale: 'en', currency: 'USD', packages, support: { email: 'support@example.test' } });
test('only exact brand/language and valid current catalogue data is usable', () => {
  const value = payload([row(), row(101, { service: 'Filex', max_devices: null, price_amount: 4.5 })]);
  const catalog = normalizeCatalog(value, 'en');
  assert.equal(catalog.packages.length, 2);
  assert.equal(catalog.packages[1].max_devices, null);
  for (const replacement of [{ brand: 'getiptv' }, { locale: 'it' }, { currency: 'EUR' }, { packages: 'wrong' }]) {
    assert.equal(normalizeCatalog({ ...value, ...replacement }, 'en'), null);
  }
  for (const replacement of [{ id: -1 }, { id: 1.5 }, { price_amount: 0 }, { price_amount: '2.99' }, { price_amount: Infinity }, { duration_months: 0 }, { is_available: false }, { service: 'Unknown' }, { type: 'reseller' }, { currency: 'EUR' }, { max_devices: -1 }]) {
    assert.equal(normalizeCatalog(payload([row(62, replacement)]), 'en'), null);
  }
  assert.equal(normalizeCatalog(payload([row(), row()]), 'en'), null);
});
test('plan lookup, provider selection and quote review identify actual current terms', () => {
  const catalog = normalizeCatalog(payload([row(), row(63, { duration_months: 3, price_amount: 7.99 }), row(101, { service: 'Filex', max_devices: null })]));
  assert.equal(packageFor(catalog, 63).duration_months, 3);
  assert.equal(packageFor(catalog, '63'), null);
  assert.equal(packageFor(catalog, 404), null);
  assert.equal(plansForProvider(catalog, 'Filex').length, 1);
  assert.equal(plansForProvider(catalog, 'Netflix').length, 0);
  assert.notEqual(quoteKey(catalog.packages[0]), quoteKey({ ...catalog.packages[0], price_amount: 3.99 }));
  assert.notEqual(quoteKey(catalog.packages[0]), quoteKey({ ...catalog.packages[0], duration_months: 3 }));
});
test('saved cart contains only a positive package identity, never a price or link', () => {
  assert.equal(storedPackageId('62'), 62);
  for (const value of [null, '', '0', '-2', '1.2', '1e2', '{"id":62,"price":1}', 'https://example.test/checkout', '9007199254740992']) assert.equal(storedPackageId(value), null);
});
test('checkout hands off package identity only to fixed central origin', () => {
  const url = new URL(checkoutUrl(62));
  assert.equal(url.origin, 'https://opplexiptv.com');
  assert.equal(url.pathname, '/checkout');
  assert.equal(url.searchParams.get('package_id'), '62');
  assert.equal(url.searchParams.get('utm_source'), 'cheapaccounts');
  assert.equal(url.searchParams.get('utm_medium'), 'landing');
  assert.equal(url.searchParams.has('amount'), false);
  assert.equal(url.searchParams.has('price'), false);
  assert.equal(checkoutUrl('62'), null);
  assert.equal(checkoutUrl(-2), null);
  assert.equal(centralUrl('//evil.example'), null);
  assert.equal(centralUrl('/contact').startsWith('https://opplexiptv.com/contact?'), true);
});
test('price sorting does not mutate the trusted catalogue', () => {
  const plans = [row(62, { price_amount: 7 }), row(101, { service: 'Filex', price_amount: 3 })];
  assert.equal(sortPlans(plans, 'price-low')[0].id, 101);
  assert.equal(sortPlans(plans, 'price-high')[0].id, 62);
  assert.equal(plans[0].id, 62);
});

test('only the verified catalog phone can become a WhatsApp destination', () => {
  const value = payload([row()]);
  value.support.phone = '923054136663'; value.support.phone_display = '+923054136663';
  const catalog = normalizeCatalog(value);
  assert.equal(catalog.support.phone, '923054136663');
  assert.equal(catalog.support.phone_display, '+923054136663');
  assert.equal(catalog.support.email, value.support.email);
  const message = 'Please quote Netflix Premium & Claude Max.\nقیمت اور دستیابی؟ #plans';
  const url = new URL(whatsappUrl(catalog.support.phone, message));
  assert.equal(url.origin, 'https://wa.me');
  assert.equal(url.pathname, '/923054136663');
  assert.equal(url.searchParams.get('text'), message);
  assert.equal(url.searchParams.size, 1);
  for (const phone of [null, undefined, 923054136663, '', '123456', '0123456789', '+923054136663', '92305 4136663', '1234567890123456', '923054136663/evil', '923054136663?text=wrong', '923054136663\n']) {
    assert.equal(whatsappUrl(phone, message), null);
    assert.equal(normalizeCatalog({ ...value, support: { ...value.support, phone } }).support.phone, null);
  }
  assert.equal(normalizeCatalog({ ...value, support: { phone: '923054136663', phone_display: '+923000000000' } }).support.phone_display, null);
});
test('WhatsApp messages cannot change the destination or silently lose non-English text', () => {
  for (const message of [undefined, null, {}, '', '   ', 'a'.repeat(2001), 'secret\0text', 'text\u001f']) assert.equal(whatsappUrl('923054136663', message), null);
  const text = 'Ask for plan: https://example.test/?x=1&text=changed + 日本語';
  const url = new URL(whatsappUrl('923054136663', '  ' + text + '  '));
  assert.equal(url.host, 'wa.me');
  assert.equal(url.searchParams.get('text'), text);
  assert.equal(whatsappUrl('1234567', 'hello')?.startsWith('https://wa.me/1234567?'), true);
  assert.equal(whatsappUrl('123456789012345', 'hello')?.startsWith('https://wa.me/123456789012345?'), true);
});
test('OTT and AI enquiries have official references and no invented sellable offer', () => {
  assert.equal(ENQUIRY_PRODUCTS.length, 17);
  assert.equal(new Set(ENQUIRY_PRODUCTS.map(product => product.id)).size, 17);
  assert.equal(ENQUIRY_PRODUCTS.filter(product => product.category === 'ott').length, 12);
  assert.equal(ENQUIRY_PRODUCTS.filter(product => product.category === 'ai').length, 5);
  const hosts = new Set(['help.netflix.com', 'help.hbomax.com', 'play.google.com', 'www.primevideo.com', 'help.disneyplus.com', 'www.apple.com', 'cdn.jiostar.com', 'www.sonyliv.com', 'www.zee5.com', 'www.crunchyroll.com', 'www.paramountplus.com', 'www.peacocktv.com', 'chatgpt.com', 'claude.com', 'gemini.google', 'x.ai', 'www.deepseek.com']);
  for (const product of ENQUIRY_PRODUCTS) {
    const source = new URL(product.source);
    assert.equal(source.protocol, 'https:'); assert.equal(source.username + source.password, ''); assert.ok(hosts.has(source.hostname));
    assert.match(product.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    assert.ok(product.name && product.noteKey && product.plans.length && product.plans.every(plan => typeof plan === 'string' && plan.trim()));
    if (product.planKeys) assert.equal(product.planKeys.length, product.plans.length);
    for (const field of ['price', 'price_amount', 'currency', 'stock', 'is_available', 'available']) assert.equal(Object.hasOwn(product, field), false);
    assert.equal(checkoutUrl(product.id), null);
  }
  assert.deepEqual(ENQUIRY_PRODUCTS.find(product => product.id === 'deepseek').planKeys, ['chatSetupEnquiry', 'apiUsageEnquiry']);
  for (const route of ['categories/ott', 'categories/ai']) {
    assert.ok(ROUTES.includes(route)); assert.ok(!NOINDEX_ROUTES.includes(route)); assert.equal(pathFor('it', route), '/it/' + route + '/');
  }
  assert.deepEqual(NOINDEX_ROUTES, ['cart', 'categories/chatgpt', 'categories/netflix', 'categories/hbo-max']);
});
