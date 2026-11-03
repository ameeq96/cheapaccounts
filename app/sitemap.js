import { site, ROUTES, NOINDEX_ROUTES, SUPPORTED_LOCALES, pathFor } from '../lib/site.js';
export const dynamic = 'force-static';
export default function sitemap() {
  const origin = 'https://' + site.domain;
  return ROUTES.filter(slug => !NOINDEX_ROUTES.includes(slug)).flatMap(slug => SUPPORTED_LOCALES.map(locale => ({
    url: origin + pathFor(locale, slug),
    alternates: { languages: Object.fromEntries([...SUPPORTED_LOCALES.map(code => [code, origin + pathFor(code, slug)]), ['x-default', origin + pathFor('en', slug)]]) },
  })));
}
