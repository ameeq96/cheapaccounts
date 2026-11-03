import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeCatalog, packageFor, plansForProvider, quoteKey, storedPackageId, checkoutUrl, centralUrl, sortPlans } from '../lib/store.js';
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
