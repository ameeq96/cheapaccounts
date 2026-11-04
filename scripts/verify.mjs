import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { ROUTES, SUPPORTED_LOCALES, NOINDEX_ROUTES, pathFor, isRtl } from '../lib/site.js';
import { getCopy } from '../lib/i18n.js';
import { ENQUIRY_PRODUCTS } from '../lib/store.js';
const origin = 'https://cheapaccounts.shop';
const read = path => readFileSync(join('out', path), 'utf8');
const attr = (tag, name) => tag.match(new RegExp('(?:^|\\s)' + name + '="([^"]*)"'))?.[1];
const tags = (html, name) => [...html.matchAll(new RegExp('<' + name + '\\b[^>]*>', 'g'))].map(m => m[0]);
const decode = s => s.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;/g, "'");
const schemaTypes = [];
const browserChunks = new Set();
const plain = value => decode(value.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' ').trim();
let pages = 0;
for (const locale of SUPPORTED_LOCALES) {
  const copy = getCopy(locale);
  assert.equal(Object.keys(copy.pages).length, 7);
  const titles = new Set(), descriptions = new Set();
  for (const slug of ROUTES) {
    const path = pathFor(locale, slug);
    const html = read(path.slice(1) + 'index.html');
    assert.match(html, new RegExp('<html[^>]*lang="' + locale + '"'));
    assert.match(html, new RegExp('<html[^>]*dir="' + (isRtl(locale) ? 'rtl' : 'ltr') + '"'));
    assert.equal((html.match(/<h1\b/g) || []).length, 1, path + ': single H1');
    const title = html.match(/<title>([^<]+)<\/title>/)?.[1];
    assert.ok(title && !/undefined|null/.test(title), path + ': localized title');
    const metas = tags(html, 'meta');
    assert.equal(attr(metas.find(t => attr(t, 'name') === 'google-site-verification') || '', 'content'), 'bzQep3YfxwN3w-sj5og2Ltjr1D2dVm8gAwm98LDTw-U', path + ': Google ownership tag');
    assert.equal(attr(metas.find(t => attr(t, 'name') === 'msvalidate.01') || '', 'content'), '240C1FB5E68E5237A1E929DE29E999EC', path + ': Bing ownership tag');
    const description = metas.find(t => attr(t, 'name') === 'description');
    const descriptionText = decode(attr(description || '', 'content') || '');
    assert.ok(descriptionText.length > 20, path + ': description');
    if (copy.seo?.[slug]) {
      assert.equal(decode(title), copy.seo[slug].title + ' | Cheap Accounts', path + ': intended search title');
      assert.equal(descriptionText, copy.seo[slug].description, path + ': intended search description');
    }
    if (!NOINDEX_ROUTES.includes(slug)) {
      assert.ok(!titles.has(decode(title)), path + ': unique indexable title');
      assert.ok(!descriptions.has(descriptionText), path + ': unique indexable description');
      titles.add(decode(title)); descriptions.add(descriptionText);
    }
    const breadcrumbNavs = [...html.matchAll(/<nav\b[^>]*class="breadcrumbs"[^>]*>(.*?)<\/nav>/gs)];
    assert.equal(breadcrumbNavs.length, slug ? 1 : 0, path + ': one visible breadcrumb trail');
    const trail = breadcrumbNavs[0]?.[1] || '';
    const breadcrumbLinks = [...trail.matchAll(/<a\b([^>]*)>(.*?)<\/a>/gs)].map(match => ({ name: plain(match[2]), item: origin + decode(attr('<a' + match[1] + '>', 'href') || '') }));
    const current = trail.match(/<span[^>]*aria-current="page"[^>]*>(.*?)<\/span>/s);
    if (slug) assert.ok(current && plain(current[1]), path + ': current breadcrumb');
    const visibleTrail = slug ? [...breadcrumbLinks, { name: plain(current[1]), item: origin + path }] : [];
    let breadcrumbSchemas = 0;
    for (const tag of tags(html, 'script')) {
      const src = attr(tag, 'src');
      if (src?.startsWith('/_next/static/') && src.endsWith('.js')) browserChunks.add(src);
    }
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
        if (item['@type'] === 'BreadcrumbList') {
          breadcrumbSchemas++;
          assert.deepEqual(item.itemListElement.map(({ name, item, position }, index) => { assert.equal(position, index + 1); return { name, item }; }), visibleTrail, path + ': visible and structured hierarchy match');
          assert.equal(visibleTrail[0].item, origin + pathFor(locale, ''), path + ': trail starts at localized home');
          if (slug.startsWith('products/')) assert.deepEqual(visibleTrail.map(item => item.item), ['', 'shop', 'categories/iptv', slug].map(route => origin + pathFor(locale, route)), path + ': product hierarchy');
        }
        if (item['@type'] === 'Product') {
          assert.ok(slug.startsWith('products/'));
          assert.equal(item.offers['@type'], 'AggregateOffer');
          assert.ok(item.offers.lowPrice > 0 && item.offers.highPrice >= item.offers.lowPrice && item.offers.offerCount > 0);
          assert.match(item.offers.priceCurrency, /^[A-Z]{3}$/);
          assert.equal(item.aggregateRating, undefined);
        }
      }
    }
    assert.equal(breadcrumbSchemas, slug ? 1 : 0, path + ': breadcrumb schema count');
    if (['categories/ott', 'categories/ai', 'buying-guide', 'faqs'].includes(slug)) {
      const guidance = slug.startsWith('categories/') ? html.match(/<section class="document-section">(.*?)<\/section>/s)?.[1] || '' : html.match(/<div class="document-content">(.*?)<aside class="document-sidebar">/s)?.[1] || '';
      assert.ok(guidance, path + ': contextual guidance is rendered');
      for (const target of (slug.startsWith('categories/') ? ['buying-guide', 'contact'] : ['categories/iptv', 'categories/ott', 'categories/ai'])) assert.ok(tags(guidance, 'a').some(tag => decode(attr(tag, 'href') || '') === pathFor(locale, target)), path + ': contextual guidance link ' + target);
    }
    for (const a of tags(html, 'a')) {
      const href = attr(a, 'href');
      if (!href || !href.startsWith('/') || href.startsWith('//') || href.startsWith('/_next/')) continue;
      const target = decode(href).split(/[?#]/)[0];
      if (!target) continue;
      assert.ok(existsSync(join('out', target.slice(1), 'index.html')) || existsSync(join('out', target.slice(1))), path + ': internal link ' + href);
    }
    const whatsappLinks = tags(html, 'a').map(t => attr(t, 'href')).filter(href => href?.startsWith('https://wa.me/'));
    assert.ok(whatsappLinks.length, path + ': WhatsApp support');
    for (const href of whatsappLinks) {
      const target = new URL(decode(href));
      assert.match(target.pathname, /^\/[1-9]\d{6,14}$/);
      assert.deepEqual([...target.searchParams.keys()], ['text']);
      const message = target.searchParams.get('text');
      assert.ok(message && message.length <= 2000 && !/\{(?:product|plan)\}/.test(message), path + ': resolved WhatsApp message');
    }
    const enquiryCategory = slug === 'categories/ott' ? 'ott' : slug === 'categories/ai' ? 'ai' : null;
    if (enquiryCategory) {
      for (const product of ENQUIRY_PRODUCTS.filter(item => item.category === enquiryCategory)) {
        assert.ok(html.includes('id="quote-' + product.id + '"'), path + ': product ' + product.id);
        assert.ok(tags(html, 'a').some(t => decode(attr(t, 'href') || '') === product.source), path + ': official reference ' + product.id);
        assert.ok(typeof copy[product.noteKey] === 'string' && copy[product.noteKey].length > 12, path + ': localized product note');
      }
    }
    assert.ok(!html.includes('wa.me/undefined'));
    pages++;
  }
}
for (const chunk of browserChunks) {
  const code = read(decodeURIComponent(chunk.slice(1)));
  for (const locale of SUPPORTED_LOCALES) assert.ok(!code.includes(getCopy(locale).homeIntro), chunk + ': locale dictionaries stay out of shared browser JS');
}
const sitemap = read('sitemap.xml');
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => decode(m[1]));
const expected = SUPPORTED_LOCALES.flatMap(locale => ROUTES.filter(slug => !NOINDEX_ROUTES.includes(slug)).map(slug => origin + pathFor(locale, slug)));
assert.deepEqual([...urls].sort(), expected.sort());
assert.equal(new Set(urls).size, 140);
assert.equal(pages, 180);
assert.equal(ENQUIRY_PRODUCTS.filter(p => p.category === 'ott').length, 12);
assert.equal(ENQUIRY_PRODUCTS.filter(p => p.category === 'ai').length, 5);
assert.ok(!NOINDEX_ROUTES.includes('categories/ott') && !NOINDEX_ROUTES.includes('categories/ai'));
assert.ok(schemaTypes.filter(t => t === 'Product').length === 20);
assert.match(read('robots.txt'), /Sitemap: https:\/\/cheapaccounts\.shop\/sitemap\.xml/);
assert.ok(existsSync('out/404.html'));
for (const file of ['favicon.svg', 'share-card.png']) assert.ok(existsSync(join('out', file)));
console.log(JSON.stringify({ pages, indexableSitemapUrls: urls.length, languages: SUPPORTED_LOCALES.length, productSchemas: 20, noindexPages: 40, enquiryProducts: ENQUIRY_PRODUCTS.length, breadcrumbSchemas: schemaTypes.filter(type => type === 'BreadcrumbList').length, uniqueLocalizedMetadata: true, currentLanguageOnly: true, checks: 'passed' }));
