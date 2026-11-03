import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROUTES, SUPPORTED_LOCALES, NOINDEX_ROUTES, pathFor, isRtl } from '../lib/site.js';
import { getCopy } from '../lib/i18n.js';
const origin = 'https://cheapaccounts.shop';
const read = path => readFileSync(join('out', path), 'utf8');
const attr = (tag, name) => tag.match(new RegExp('(?:^|\\s)' + name + '="([^"]*)"'))?.[1];
const tags = (html, name) => [...html.matchAll(new RegExp('<' + name + '\\b[^>]*>', 'g'))].map(m => m[0]);
const decode = s => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;/g, "'");
const schemaTypes = [];
let pages = 0;
for (const locale of SUPPORTED_LOCALES) {
  const copy = getCopy(locale);
  assert.equal(Object.keys(copy.pages).length, 7);
  for (const slug of ROUTES) {
    const path = pathFor(locale, slug);
    const html = read(path.slice(1) + 'index.html');
    assert.match(html, new RegExp('<html[^>]*lang="' + locale + '"'));
    assert.match(html, new RegExp('<html[^>]*dir="' + (isRtl(locale) ? 'rtl' : 'ltr') + '"'));
    assert.equal((html.match(/<h1\b/g) || []).length, 1, path + ': single H1');
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
    assert.ok(title && !/undefined|null/.test(title), path + ': localized title');
    const metas = tags(html, 'meta');
    const description = metas.find(t => attr(t, 'name') === 'description');
    assert.ok(attr(description || '', 'content')?.length > 20, path + ': description');
    const robots = attr(metas.find(t => attr(t, 'name') === 'robots') || '', 'content') || '';
    assert.equal(robots.includes('noindex'), NOINDEX_ROUTES.includes(slug), path + ': robots');
    const links = tags(html, 'link');
    assert.equal(decode(attr(links.find(t => attr(t, 'rel') === 'canonical') || '', 'href') || ''), origin + path);
    const alternates = links.filter(t => attr(t, 'rel') === 'alternate' && attr(t, 'hrefLang'));
    assert.equal(alternates.length, 11, path + ': language alternates');
    for (const target of SUPPORTED_LOCALES) assert.ok(alternates.some(t => attr(t, 'hrefLang') === target && decode(attr(t, 'href')) === origin + pathFor(target, slug)));
    assert.ok(links.some(t => attr(t, 'rel') === 'icon' && attr(t, 'href') === '/favicon.svg'));
    for (const match of html.matchAll(/<script type="application\/ld\+json">(.*?)<\/script>/gs)) {
      const data = JSON.parse(match[1]);
      for (const item of (Array.isArray(data) ? data : [data])) {
        schemaTypes.push(item['@type']);
        if (item['@type'] === 'Product') {
          assert.ok(slug.startsWith('products/'));
          assert.equal(item.offers['@type'], 'AggregateOffer');
          assert.ok(item.offers.lowPrice > 0 && item.offers.highPrice >= item.offers.lowPrice && item.offers.offerCount > 0);
          assert.match(item.offers.priceCurrency, /^[A-Z]{3}$/);
          assert.equal(item.aggregateRating, undefined);
        }
      }
    }
    for (const a of tags(html, 'a')) {
      const href = attr(a, 'href');
      if (!href || !href.startsWith('/') || href.startsWith('//') || href.startsWith('/_next/')) continue;
      const target = decode(href).split(/[?#]/)[0];
      if (!target) continue;
      assert.ok(existsSync(join('out', target.slice(1), 'index.html')) || existsSync(join('out', target.slice(1))), path + ': internal link ' + href);
    }
    assert.ok(!html.includes('wa.me/undefined'));
    pages++;
  }
}
const sitemap = read('sitemap.xml');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => decode(m[1]));
const expected = SUPPORTED_LOCALES.flatMap(locale => ROUTES.filter(slug => !NOINDEX_ROUTES.includes(slug)).map(slug => origin + pathFor(locale, slug)));
assert.deepEqual([...urls].sort(), expected.sort());
assert.equal(new Set(urls).size, 120);
assert.ok(schemaTypes.filter(t => t === 'Product').length === 20);
assert.match(read('robots.txt'), /Sitemap: https:\/\/cheapaccounts\.shop\/sitemap\.xml/);
assert.ok(existsSync('out/404.html'));
for (const file of ['favicon.svg', 'share-card.png']) assert.ok(existsSync(join('out', file)));
console.log(JSON.stringify({ pages, indexableSitemapUrls: urls.length, languages: SUPPORTED_LOCALES.length, productSchemas: 20, noindexPages: 40, checks: 'passed' }));
