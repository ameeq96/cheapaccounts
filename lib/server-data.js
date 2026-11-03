import { cache } from 'react';
import { SUPPORTED_LOCALES } from './site.js';
const apiOrigin = process.env.LANDING_API_ORIGIN || 'https://opplexiptv.com';
if (!['https://opplexiptv.com', 'http://127.0.0.1:8001'].includes(apiOrigin)) throw new Error('Invalid catalogue origin');
export const catalogFor = cache(async locale => {
  if (!SUPPORTED_LOCALES.includes(locale)) throw new Error('Invalid catalogue language');
  const response = await fetch(apiOrigin + '/api/v1/site/brands/cheapaccounts/content?locale=' + locale, {
    headers: { Accept: 'application/json' }, cache: 'force-cache', signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error('Store catalogue returned HTTP ' + response.status);
  const data = (await response.json()).data;
  if (data?.brand !== 'cheapaccounts' || data.locale !== locale || !Array.isArray(data.packages)
    || !data.packages.length || !data.content?.hero_heading) throw new Error('Incomplete store catalogue');
  return data;
});
