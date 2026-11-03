import '../../styles.css';
import { resolveRoute, isRtl } from '../../lib/site.js';
export default async function RootLayout({ children, params }) {
  const { locale } = resolveRoute((await params).segments);
  return <html lang={locale} dir={isRtl(locale) ? 'rtl' : 'ltr'}><body>{children}</body></html>;
}
