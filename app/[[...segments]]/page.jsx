import { notFound } from 'next/navigation';
import Storefront from '../../components/Storefront.jsx';
import { site, SUPPORTED_LOCALES, ROUTES, NOINDEX_ROUTES, pathFor, resolveRoute } from '../../lib/site.js';
import { getCopy } from '../../lib/i18n.js';
import { catalogFor } from '../../lib/server-data.js';
export const dynamicParams = false;
const origin = 'https://' + site.domain;
function routeCopy(copy, slug) {
  if (copy.pages?.[slug]) return copy.pages[slug];
  const map = {
    '': [copy.homeTitle, copy.homeIntro], shop: [copy.shop, copy.homeIntro],
    'categories/iptv': [copy.iptv, copy.iptvSummary],
    'categories/ott': [copy.ott, copy.ottSummary],
    'categories/ai': [copy.ai, copy.aiSummary],
    'categories/chatgpt': ['ChatGPT — ' + copy.requestPricing, copy.chatgptSummary],
    'categories/netflix': ['Netflix — ' + copy.requestPricing, copy.netflixSummary],
    'categories/hbo-max': ['HBO Max — ' + copy.requestPricing, copy.hboSummary],
    'products/opplex-iptv': ['Opplex IPTV', copy.opplexSummary],
    'products/filex-iptv': ['Filex IPTV', copy.filexSummary],
    cart: [copy.cart, copy.onePlanDetail + ' ' + copy.checkoutNote],
  };
  const [title, intro] = map[slug] || [];
  if (!title || !intro) throw new Error('Localized page metadata is missing: ' + slug);
  return { title, intro };
}
export function generateStaticParams() {
  return SUPPORTED_LOCALES.flatMap(locale => ROUTES.map(slug => ({ segments: [...(locale === 'en' ? [] : [locale]), ...(slug ? slug.split('/') : [])] })));
}
export async function generateMetadata({ params }) {
  const { locale, slug, valid } = resolveRoute((await params).segments);
  if (!valid) notFound();
  const page = routeCopy(getCopy(locale), slug), url = origin + pathFor(locale, slug);
  const title = page.title + ' | Cheap Accounts';
  return {
    metadataBase: new URL(origin), title, description: page.intro,
    verification: { google: 'bzQep3YfxwN3w-sj5og2Ltjr1D2dVm8gAwm98LDTw-U', other: { 'msvalidate.01': '240C1FB5E68E5237A1E929DE29E999EC' } },
    alternates: { canonical: url, languages: Object.fromEntries([...SUPPORTED_LOCALES.map(code => [code, origin + pathFor(code, slug)]), ['x-default', origin + pathFor('en', slug)]]) },
    robots: { index: !NOINDEX_ROUTES.includes(slug), follow: true },
    openGraph: { title, description: page.intro, url, siteName: site.name, type: 'website', locale, images: [{ url: '/share-card.png', width: 1200, height: 630, alt: site.name }] },
    twitter: { card: 'summary_large_image', title, description: page.intro, images: ['/share-card.png'] },
    icons: { icon: { url: '/favicon.svg', type: 'image/svg+xml', sizes: 'any' } },
  };
}
export default async function Page({ params }) {
  const { locale, slug, valid } = resolveRoute((await params).segments);
  if (!valid) notFound();
  const initialCatalog = await catalogFor(locale), copy = getCopy(locale), page = routeCopy(copy, slug);
  const url = origin + pathFor(locale, slug);
  const data = [
    { '@context': 'https://schema.org', '@type': 'Organization', '@id': origin + '/#organization', name: site.name, url: origin, logo: origin + '/favicon.svg' },
    { '@context': 'https://schema.org', '@type': slug ? 'WebPage' : 'WebSite', name: page.title, description: page.intro, url, inLanguage: locale, publisher: { '@id': origin + '/#organization' } },
  ];
  if (['products/opplex-iptv', 'products/filex-iptv'].includes(slug)) {
    const provider = slug.endsWith('opplex-iptv') ? 'Opplex' : 'Filex';
    const plans = initialCatalog.packages.filter(plan => plan.service === provider && plan.is_available === true);
    if (plans.length) data.push({ '@context': 'https://schema.org', '@type': 'Product', name: provider + ' IPTV', description: page.intro, url, image: origin + '/share-card.png', brand: { '@type': 'Brand', name: provider }, offers: { '@type': 'AggregateOffer', priceCurrency: initialCatalog.currency, lowPrice: Math.min(...plans.map(plan => Number(plan.price_amount))), highPrice: Math.max(...plans.map(plan => Number(plan.price_amount))), offerCount: plans.length } });
  }
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\u003c') }} /><Storefront locale={locale} slug={slug} initialCatalog={initialCatalog} homeContent={initialCatalog.content} /></>;
}
