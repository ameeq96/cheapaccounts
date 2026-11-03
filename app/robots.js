import { site } from '../lib/site.js';
export const dynamic = 'force-static';
export default function robots() { return { rules: { userAgent: '*', allow: '/' }, sitemap: 'https://' + site.domain + '/sitemap.xml' }; }
