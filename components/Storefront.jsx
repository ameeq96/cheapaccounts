'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Icon from './Icons.jsx';
import { LANGUAGE_NAMES, SUPPORTED_LOCALES, pathFor } from '../lib/site.js';
import { fetchCatalog } from '../lib/api.js';
import { CART_KEY, ENQUIRY_PRODUCTS, PROVIDERS, centralUrl, checkoutUrl, normalizeCatalog, packageFor, plansForProvider, quoteKey, sortPlans, storedPackageId, whatsappUrl } from '../lib/store.js';

const providerSlug = provider => provider.toLowerCase() + '-iptv';
const currency = (plan, locale) => new Intl.NumberFormat(locale, { style: 'currency', currency: plan.currency }).format(plan.price_amount);
const term = (months, locale) => new Intl.NumberFormat(locale, { style: 'unit', unit: 'month', unitDisplay: 'long' }).format(months);
const categories = [
  { id: 'iptv', icon: 'screen', copy: 'iptvSummary', live: true },
  { id: 'ott', icon: 'screen', copy: 'ottSummary' },
  { id: 'ai', icon: 'spark', copy: 'aiSummary' }
];
const productPlan = (product, index, t) => product.planKeys?.[index] ? t(product.planKeys[index]) : product.plans[index];
function PricingLink({ phone, product, plan, t, className = 'button button-outline' }) {
  const message = t('whatsappProductMessage').replaceAll('{product}', product).replaceAll('{plan}', plan);
  const href = whatsappUrl(phone, message);
  return href ? <a className={className} href={href} target="_blank" rel="noopener noreferrer"><Icon name="whatsapp" size={19} />{t('requestPricing')}<Icon name="arrowUp" size={16} /></a>
    : <span className="quote-unavailable" role="status">{t('quotePhoneUnavailable')}</span>;
}
function EnquiryCard({ product, phone, t, heading = 'h3' }) {
  const [selected, setSelected] = useState(0);
  const Heading = heading;
  return <article className={'enquiry-card enquiry-' + product.category} id={'quote-' + product.id}>
    <div className="enquiry-card-top"><span className="category-symbol"><Icon name={product.category === 'ai' ? 'spark' : 'screen'} size={23} /></span><span className="availability">{t('enquiryOnly')}</span></div>
    <span className="eyebrow">{t(product.category)}</span><Heading>{product.name}</Heading><p>{t(product.noteKey)}</p>
    <label className="enquiry-plan" htmlFor={'enquiry-plan-' + product.id}><span>{t('choosePlan')}</span><select id={'enquiry-plan-' + product.id} value={selected} onChange={event => setSelected(Number(event.target.value))}>{product.plans.map((plan, index) => <option key={plan} value={index}>{productPlan(product, index, t)}</option>)}</select></label>
    <div className="enquiry-card-actions"><PricingLink phone={phone} product={product.name} plan={productPlan(product, selected, t)} t={t} className="button button-primary" /><a className="official-reference" href={product.source} target="_blank" rel="noopener noreferrer">{t('officialDetails')}<Icon name="arrowUp" size={14} /></a></div>
  </article>;
}
function Mark({ light = false }) {
  return <span className={'brand-lockup' + (light ? ' light' : '')}><span className="brand-monogram" aria-hidden="true">c<span>a</span><i /></span><span className="brand-word">cheap<span>accounts</span><small>.shop</small></span></span>;
}
function ProductArt({ provider, compact = false }) {
  return <div className={'product-art art-' + provider.toLowerCase() + (compact ? ' compact' : '')} aria-hidden="true">
    <span className="art-grid" /><span className="art-orbit" /><span className="art-label">{provider}</span>
    <div className="art-window"><span className="art-window-dots"><i /><i /><i /></span><span className="art-play">▶</span><span className="art-line" /><span className="art-line short" /></div>
    <span className="art-type">IPTV</span><span className="art-corner">↗</span>
  </div>;
}
function CategoryCard({ category, locale, t }) {
  return <Link className={'category-card category-' + category.id} href={pathFor(locale, 'categories/' + category.id)}>
    <span className="category-symbol"><Icon name={category.icon} size={25} /></span>
    <span className={'availability ' + (category.live ? 'available' : '')}><i />{t(category.live ? 'availableNow' : 'enquiryOnly')}</span>
    <h3>{t(category.id)}</h3><p>{t(category.copy)}</p><Icon name="arrowUp" className="category-arrow" />
  </Link>;
}
function ProductCard({ provider, plans, locale, t }) {
  if (!plans.length) return null;
  const least = [...plans].sort((a, b) => a.price_amount - b.price_amount)[0];
  return <article className="product-card"><Link tabIndex={-1} aria-hidden="true" href={pathFor(locale, 'products/' + providerSlug(provider))}><ProductArt provider={provider} /></Link>
    <div className="product-card-content"><div className="product-card-top"><span className="product-type">{t('subscription')}</span><span className="live-dot" role="img" aria-label={t('availableNow')} /></div>
      <h3><Link href={pathFor(locale, 'products/' + providerSlug(provider))}>{provider} IPTV</Link></h3>
      <p>{t(provider === 'Opplex' ? 'opplexSummary' : 'filexSummary')}</p>
      <div className="term-pills">{plans.map(plan => <span key={plan.id}>{term(plan.duration_months, locale)}</span>)}</div>
      <div className="product-bottom"><div className="product-price"><small>{t('from')}</small><strong>{currency(least, locale)}</strong><span>{term(least.duration_months, locale)}</span></div>
        <Link className="round-link" aria-label={t('viewProduct') + ': ' + provider + ' IPTV'} href={pathFor(locale, 'products/' + providerSlug(provider))}><Icon name="arrow" /></Link></div>
    </div>
  </article>;
}
function CatalogueNotice({ loading, fresh, error, onRefresh, t }) {
  return <div className={'catalogue-notice' + (error ? ' has-error' : '')} role={error ? 'alert' : 'status'}><span><Icon name={error ? 'info' : fresh ? 'check' : 'clock'} size={17} />{t(error ? 'pricesUnavailable' : loading ? 'refreshing' : 'currentCatalogue')}</span>
    <button type="button" className="text-button" onClick={onRefresh} disabled={loading}>{t(error ? 'retry' : 'refreshPrices')}<Icon name="arrowUp" size={15} /></button></div>;
}
function HowItWorks({ t }) {
  return <section className="how-section" id="how-it-works"><div className="section-heading"><div><span className="eyebrow">{t('howItWorks')}</span><h2>{t('checkoutHeading')}</h2></div><p>{t('onePlanDetail')}</p></div>
    <div className="steps-grid">{[['stepChoose', 'stepChooseBody', 'bag'], ['stepReview', 'stepReviewBody', 'check'], ['stepCheckout', 'stepCheckoutBody', 'arrowUp']].map(([title, body, icon], index) => <article className="step-card" key={title}><div className="step-top"><span>0{index + 1}</span><Icon name={icon} size={24} /></div><h3>{t(title)}</h3><p>{t(body)}</p></article>)}</div>
  </section>;
}
function SupportPanel({ t }) {
  return <section className="support-panel"><div><span className="eyebrow">{t('support')}</span><h2>{t('helpTitle')}</h2><p>{t('helpBody')}</p></div><div className="support-panel-actions"><a className="button button-white" href={centralUrl('/contact')}>{t('contactSupport')}<Icon name="arrowUp" size={17} /></a><a className="text-link" href={centralUrl('/account')}>{t('trackOrder')}<Icon name="arrow" size={17} /></a></div></section>;
}
function ProductView({ provider, plans, locale, t, onAdd, fresh, loading, onRefresh, error, selectedId, phone }) {
  const [months, setMonths] = useState(plans[0]?.duration_months || 1);
  useEffect(() => { if (!plans.some(plan => plan.duration_months === months)) setMonths(plans[0]?.duration_months || 1); }, [plans, months]);
  const plan = plans.find(item => item.duration_months === months) || plans[0] || null;
  return <>
    <section className="product-detail"><div className="product-detail-art"><ProductArt provider={provider} /><div className="product-art-note"><Icon name="info" size={17} /><p>{t('playerSeparate')}</p></div></div>
      <div className="product-detail-copy"><span className="eyebrow">{t('availableNow')} / IPTV</span><h1>{provider} IPTV</h1><p className="intro">{t(provider === 'Opplex' ? 'opplexSummary' : 'filexSummary')}</p>
        <CatalogueNotice loading={loading} fresh={fresh} error={error} onRefresh={onRefresh} t={t} />
        <fieldset className="duration-fieldset"><legend>{t('chooseDuration')}</legend><div className="duration-options">{plans.map(item => <button type="button" key={item.id} aria-pressed={plan?.id === item.id} onClick={() => setMonths(item.duration_months)}>{term(item.duration_months, locale)}</button>)}</div></fieldset>
        {plan ? <><div className="detail-price"><strong>{currency(plan, locale)}</strong><span>{t('fullAmount')}<b>{term(plan.duration_months, locale)}</b></span></div>
          <dl className="product-facts"><div><dt>{t('provider')}</dt><dd>{provider}</dd></div><div><dt>{t('connection')}</dt><dd>{plan.max_devices ? new Intl.NumberFormat(locale).format(plan.max_devices) : t('confirmAllowance')}</dd></div></dl>
          <button className="button button-primary add-button" type="button" onClick={event => onAdd(plan.id, event.currentTarget)} disabled={!fresh || loading}><Icon name="bag" size={19} />{t(selectedId === plan.id ? 'inCart' : 'addToCart')}<Icon name="arrow" size={18} /></button><div className="product-pricing-enquiry"><PricingLink phone={phone} product={provider + ' IPTV'} plan={term(plan.duration_months, locale)} t={t} /></div></> : <p role="status">{t('planUnavailable')}</p>}
        <p className="field-note">{t('onePlan')} · {t('checkoutNote')}</p>
      </div>
    </section><section className="product-explainer"><span className="eyebrow">{t('productDetails')}</span><h2>{t('selectionTitle')}</h2><p>{t(provider === 'Opplex' ? 'opplexDetailsBody' : 'filexDetailsBody')}</p><div className="explanation-grid"><p><Icon name="screen" />{t('playerSeparate')}</p><p><Icon name="bag" />{t('onePlanDetail')}</p><p><Icon name="shield" />{t('securityNote')}</p></div><div className="enquiry-browse"><Link className="text-link" href={pathFor(locale, 'buying-guide')}>{t('buyingGuide')}<Icon name="arrow" size={16} /></Link><Link className="text-link" href={pathFor(locale, 'contact')}>{t('contactSupport')}<Icon name="arrow" size={16} /></Link></div></section></>;
}
function ReplaceDialog({ pending, current, locale, t, onKeep, onReplace }) {
  const box = useRef(null);
  useEffect(() => {
    const before = document.activeElement, overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    box.current?.querySelector('button')?.focus();
    const trap = event => {
      if (event.key === 'Escape') { event.preventDefault(); onKeep(); }
      if (event.key === 'Tab') {
        const buttons = box.current?.querySelectorAll('button');
        if (!buttons?.length) return;
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', trap);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', trap); if (before instanceof HTMLElement) before.focus(); };
  }, [onKeep]);
  return <div className="dialog-backdrop" onClick={onKeep}><section className="replace-dialog" ref={box} role="dialog" aria-modal="true" aria-labelledby="replace-title" aria-describedby="replace-description" onClick={event => event.stopPropagation()}><span className="dialog-icon"><Icon name="bag" size={24} /></span><h2 id="replace-title">{t('replaceTitle')}</h2><p id="replace-description">{t('replaceBody')}</p><div className="replace-comparison">{[current, pending].map((plan, index) => <div key={index}><span>{plan ? plan.service + ' IPTV' : t('planUnavailable')}</span><strong>{plan ? term(plan.duration_months, locale) : '—'}</strong>{plan && <small>{currency(plan, locale)}</small>}</div>)}</div><div className="dialog-actions"><button type="button" className="button button-outline" onClick={onKeep}>{t('keepPlan')}</button><button type="button" className="button button-primary" onClick={onReplace}>{t('replacePlan')}</button></div></section></div>;
}

export default function Storefront({ locale = 'en', slug = '', initialCatalog, homeContent, copy, breadcrumbs = [] }) {
  const router = useRouter();
  const t = key => copy[key];
  const initial = normalizeCatalog(initialCatalog, locale);
  const [catalog, setCatalog] = useState(initial);
  const catalogRef = useRef(initial);
  const cartRef = useRef(null);
  const [cartId, setCartId] = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const [fresh, setFresh] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pendingId, setPendingId] = useState(null);
  const [notice, setNotice] = useState('');
  const [reviewed, setReviewed] = useState('');
  const [priceChanged, setPriceChanged] = useState(false);
  const [opening, setOpening] = useState(false);
  const [query, setQuery] = useState('');
  const [providerFilter, setProviderFilter] = useState('');
  const [durationFilter, setDurationFilter] = useState('');
  const [sort, setSort] = useState('recommended');
  const addTrigger = useRef(null);
  const mounted = useRef(false);
  const requestGeneration = useRef(0);
  const manualRefreshes = useRef(new Set());
  const checkoutController = useRef(null);

  const applyCatalog = useCallback(next => {
    const before = packageFor(catalogRef.current, cartRef.current), after = packageFor(next, cartRef.current);
    if (before && after && quoteKey(before) !== quoteKey(after)) { setPriceChanged(true); setReviewed(''); }
    if (cartRef.current && !after) setReviewed('');
    catalogRef.current = next; setCatalog(next); setFresh(true); setError(false);
  }, []);
  const refresh = useCallback(async () => {
    if (!mounted.current) return null;
    const generation = requestGeneration.current, controller = new AbortController();
    manualRefreshes.current.add(controller);
    setLoading(true); setFresh(false); setError(false);
    try {
      const next = await fetchCatalog(locale, { signal: controller.signal });
      if (!mounted.current || requestGeneration.current !== generation || controller.signal.aborted) return null;
      applyCatalog(next); return next;
    } catch {
      if (mounted.current && requestGeneration.current === generation && !controller.signal.aborted) { setError(true); setReviewed(''); }
      return null;
    } finally {
      manualRefreshes.current.delete(controller);
      if (mounted.current && requestGeneration.current === generation) setLoading(false);
    }
  }, [locale, applyCatalog]);
  useEffect(() => {
    let active = true; const controller = new AbortController();
    const generation = ++requestGeneration.current;
    mounted.current = true;
    const nextInitial = normalizeCatalog(initialCatalog, locale);
    catalogRef.current = nextInitial; setCatalog(nextInitial); setFresh(false); setLoading(true); setError(false);
    setReviewed(''); setMenuOpen(false); setOpening(false);
    fetchCatalog(locale, { signal: controller.signal }).then(next => { if (active) applyCatalog(next); }).catch(() => { if (active) setError(true); }).finally(() => { if (active) setLoading(false); });
    return () => {
      active = false; controller.abort();
      if (requestGeneration.current === generation) {
        mounted.current = false;
        checkoutController.current?.abort(); checkoutController.current = null;
        for (const request of manualRefreshes.current) request.abort();
        manualRefreshes.current.clear();
      }
    };
  }, [locale, slug, initialCatalog, applyCatalog]);
  useEffect(() => {
    const load = () => { let id = null; try { id = storedPackageId(window.localStorage.getItem(CART_KEY)); } catch {} cartRef.current = id; setCartId(id); setHydrated(true); setReviewed(''); };
    load(); const onStorage = event => { if (event.key === CART_KEY) load(); };
    window.addEventListener('storage', onStorage);
    const onPageShow = event => {
      checkoutController.current?.abort(); checkoutController.current = null;
      setOpening(false); if (event.persisted) refresh();
    };
    window.addEventListener('pageshow', onPageShow);
    return () => { window.removeEventListener('storage', onStorage); window.removeEventListener('pageshow', onPageShow); };
  }, [refresh]);
  const persist = useCallback(id => {
    cartRef.current = id; setCartId(id); setReviewed(''); setPriceChanged(false);
    try { if (id) window.localStorage.setItem(CART_KEY, String(id)); else window.localStorage.removeItem(CART_KEY); } catch {}
  }, []);
  const closeReplace = useCallback(() => { setPendingId(null); requestAnimationFrame(() => addTrigger.current?.focus()); }, []);
  const add = (id, trigger) => {
    if (!fresh || loading || !packageFor(catalogRef.current, id)) return;
    addTrigger.current = trigger;
    if (cartId && cartId !== id) setPendingId(id);
    else { persist(id); setNotice(t('cartAdded')); }
  };
  const checkout = async () => {
    const requestedId = cartRef.current, before = packageFor(catalogRef.current, requestedId);
    if (!mounted.current || checkoutController.current || !fresh || loading || opening || !before || reviewed !== quoteKey(before)) return;
    const generation = requestGeneration.current, controller = new AbortController();
    checkoutController.current = controller;
    let redirecting = false;
    setOpening(true); setError(false);
    try {
      const next = await fetchCatalog(locale, { signal: controller.signal });
      if (!mounted.current || requestGeneration.current !== generation || controller.signal.aborted) return;
      applyCatalog(next);
      const after = packageFor(next, requestedId);
      if (cartRef.current !== requestedId || !after) { setReviewed(''); return; }
      if (quoteKey(before) !== quoteKey(after)) { setPriceChanged(true); setReviewed(''); return; }
      const url = checkoutUrl(after.id);
      if (!url) return;
      redirecting = true;
      window.location.assign(url);
    } catch {
      if (mounted.current && requestGeneration.current === generation && !controller.signal.aborted) { setError(true); setFresh(false); setReviewed(''); }
      redirecting = false;
    } finally {
      if (!redirecting && checkoutController.current === controller) checkoutController.current = null;
      if (!redirecting && mounted.current && requestGeneration.current === generation) setOpening(false);
    }
  };
  const selected = packageFor(catalog, cartId), pending = packageFor(catalog, pendingId);
  const enquiryProduct = ENQUIRY_PRODUCTS.find(product => slug === 'categories/' + product.id);
  const enquiryCategory = ['ott', 'ai'].find(category => slug === 'categories/' + category);
  const phone = catalog?.support?.phone;
  const generalWhatsApp = whatsappUrl(phone, t('whatsappGeneralMessage'));
  const productProvider = slug === 'products/opplex-iptv' ? 'Opplex' : slug === 'products/filex-iptv' ? 'Filex' : null;
  const page = copy.pages?.[slug];
  const home = catalog?.content || homeContent || {};
  const shopView = slug === 'shop' || slug === 'categories/iptv';
  const productGroups = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(locale);
    return PROVIDERS.filter(provider => !providerFilter || provider === providerFilter).map(provider => {
      let plans = plansForProvider(catalog, provider).filter(plan => !durationFilter || plan.duration_months === Number(durationFilter));
      if (needle && !(provider + ' IPTV ' + t(provider === 'Opplex' ? 'opplexSummary' : 'filexSummary')).toLocaleLowerCase(locale).includes(needle)) plans = [];
      return { provider, plans };
    }).filter(group => group.plans.length).sort((a, b) => {
      if (sort === 'recommended') return 0;
      const first = sortPlans(a.plans, 'price-low')[0]?.price_amount || 0, second = sortPlans(b.plans, 'price-low')[0]?.price_amount || 0;
      return sort === 'price-high' ? second - first : first - second;
    });
  }, [catalog, providerFilter, durationFilter, query, sort, locale, copy]);
  const enquiryResults = slug === 'categories/iptv' || durationFilter ? [] : ENQUIRY_PRODUCTS.filter(product => {
    const needle = query.trim().toLocaleLowerCase(locale);
    return (!providerFilter || providerFilter === product.id) && (!needle || (product.name + ' ' + product.plans.map((plan, index) => productPlan(product, index, t)).join(' ') + ' ' + t(product.noteKey)).toLocaleLowerCase(locale).includes(needle));
  });
  const enquiryPreview = [...ENQUIRY_PRODUCTS.filter(product => product.category === 'ott').slice(0, 3), ...ENQUIRY_PRODUCTS.filter(product => product.category === 'ai').slice(0, 3)];
  const firstPlan = catalog?.packages?.[0];
  const productList = <div className="product-grid">{productGroups.map(group => <ProductCard key={group.provider} {...group} locale={locale} t={t} />)}{enquiryResults.map(product => <EnquiryCard key={locale + ':' + product.id} product={product} phone={phone} t={t} />)}</div>;

  return <div className="storefront" dir={['ar', 'ur'].includes(locale) ? 'rtl' : 'ltr'}>
    <a className="skip-link" href="#main">{t('skipContent')}</a>
    <div className="announcement"><div className="container"><span><i />{t('onePlan')}</span><span>{t('checkoutNote')}</span></div></div>
    <header className="site-header"><div className="container header-main">
      <Link className="brand" href={pathFor(locale, '')} aria-label="Cheap Accounts"><Mark /></Link>
      <nav className={'main-nav' + (menuOpen ? ' is-open' : '')} id="main-nav" aria-label={t('shop')}><Link className={slug === 'shop' ? 'active' : ''} href={pathFor(locale, 'shop')}>{t('shop')}</Link>{categories.map(category => <Link key={category.id} className={slug === 'categories/' + category.id ? 'active' : ''} href={pathFor(locale, 'categories/' + category.id)}>{t(category.id)}</Link>)}<Link href={pathFor(locale, 'buying-guide')}>{t('buyingGuide')}</Link><Link href={pathFor(locale, 'contact')}>{t('support')}</Link></nav>
      <div className="header-tools"><label className="language-control"><Icon name="globe" size={18} /><span className="sr-only">{t('language')}</span><select aria-label={t('language')} value={locale} onChange={event => { router.push(pathFor(event.target.value, slug)); }}>{SUPPORTED_LOCALES.map(code => <option key={code} value={code}>{LANGUAGE_NAMES[code]}</option>)}</select></label>
        <a className="icon-button account-link" href={centralUrl('/account')} aria-label={t('account')}><Icon name="user" /></a>
        <Link className="icon-button cart-link" href={pathFor(locale, 'cart')} aria-label={t('cart') + (cartId ? ': 1' : '')}><Icon name="bag" /><span>{cartId ? '1' : '0'}</span></Link>
        <button className="icon-button mobile-menu-toggle" type="button" aria-expanded={menuOpen} aria-controls="main-nav" aria-label={t(menuOpen ? 'closeMenu' : 'openMenu')} onClick={() => setMenuOpen(value => !value)}><Icon name={menuOpen ? 'close' : 'menu'} /></button></div>
    </div></header>
    <div className="cart-announcement" role="status" aria-live="polite">{notice && <div className="container"><span><Icon name="check" size={17} />{notice}</span><Link href={pathFor(locale, 'cart')}>{t('viewCart')}<Icon name="arrow" size={16} /></Link><button type="button" aria-label={t('closeDialog')} onClick={() => setNotice('')}><Icon name="close" size={16} /></button></div>}</div>
    <main id="main" className="container">
      {breadcrumbs.length > 0 && <nav className="breadcrumbs" aria-label={t('breadcrumbs')}>{breadcrumbs.flatMap((item, index) => [index > 0 && <Icon key={'separator-' + item.path} name="chevron" size={12} />, index === breadcrumbs.length - 1 ? <span key={item.path} aria-current="page">{item.name}</span> : <Link key={item.path} href={item.path}>{item.name}</Link>])}</nav>}
      {!slug && <>
        <section className="hero"><div className="hero-copy"><span className="eyebrow"><i />{t('homeEyebrow')}</span><h1>{home.hero_heading || t('homeTitle')}</h1><p>{t('homeIntro')}</p><div className="hero-actions"><Link className="button button-primary" href={pathFor(locale, 'shop')}>{t('shopPlans')}<Icon name="arrow" size={18} /></Link><a className="text-link" href="#how-it-works">{t('howItWorks')}<Icon name="chevron" size={15} /></a></div><p className="hero-footnote"><Icon name="shield" size={17} />{t('sharedSupport')}</p></div>
          <div className="hero-composition" aria-hidden="true"><span className="hero-orbit" /><div className="hero-product"><div className="hero-product-header"><span className="mini-mark">ca</span><span>IPTV</span><span>↗</span></div><div className="hero-visual-screen"><span className="visual-play">▶</span><i /><i /><i /></div><div className="hero-product-footer"><div><span>Opplex + Filex</span><small>{t('currentCatalogue')}</small></div><span className="hero-product-price">{firstPlan ? currency(firstPlan, locale) : '—'}</span></div></div><div className="hero-mini-card"><Icon name="bag" size={18} /><span>{t('onePlan')}</span><i>↗</i></div><span className="hero-side-label">cheapaccounts.shop</span></div>
        </section>
        <section className="category-section" aria-labelledby="category-heading"><div className="section-heading compact-heading"><h2 id="category-heading">{t('categoryHeading')}</h2><Link className="text-link" href={pathFor(locale, 'shop')}>{t('browseAll')}<Icon name="arrow" size={16} /></Link></div><div className="category-grid">{categories.map(category => <CategoryCard key={category.id} category={category} locale={locale} t={t} />)}</div></section>
        <section className="featured-section"><div className="section-heading"><div><span className="eyebrow">{t('availableNow')}</span><h2>{t('planHeading')}</h2></div><p>{t('planIntro')}</p></div><CatalogueNotice {...{ loading, fresh, error, t }} onRefresh={refresh} /><div className="featured-grid">{PROVIDERS.map(provider => <ProductCard key={provider} provider={provider} plans={plansForProvider(catalog, provider)} locale={locale} t={t} />)}</div></section>
        <section className="enquiry-section"><div className="section-heading"><div><span className="eyebrow">{t('enquiryOnly')}</span><h2>{t('enquiryHeading')}</h2></div><p>{t('enquiryIntro')}</p></div><div className="enquiry-grid">{enquiryPreview.map(product => <EnquiryCard key={locale + ':' + product.id} product={product} phone={phone} t={t} />)}</div><div className="enquiry-browse">{['ott', 'ai'].map(category => <Link key={category} className="button button-outline" href={pathFor(locale, 'categories/' + category)}>{t(category)}<Icon name="arrow" size={17} /></Link>)}</div><p className="quote-note">{t('quoteNote')}</p></section>
        <HowItWorks t={t} /><SupportPanel t={t} />
      </>}
      {shopView && <><section className="page-heading shop-heading"><span className="eyebrow">{t('currentCatalogue')}</span><h1>{slug === 'categories/iptv' ? t('iptvHeading') : t('shopHeading')}</h1><p>{t(slug === 'categories/iptv' ? 'planIntro' : 'shopIntro')}</p></section>
        <div className="shop-layout"><aside className="shop-sidebar"><span className="eyebrow">{t('categoryHeading')}</span><Link className={slug === 'shop' ? 'selected' : ''} href={pathFor(locale, 'shop')}>{t('products')}<Icon name="chevron" size={15} /></Link>{categories.map(category => <Link key={category.id} className={slug.endsWith('/' + category.id) ? 'selected' : ''} href={pathFor(locale, 'categories/' + category.id)}><span>{t(category.id)}</span><Icon name="chevron" size={15} /></Link>)}</aside>
          <section className="shop-results" aria-label={t('products')}><h2 className="sr-only">{t('products')}</h2><div className="shop-filters"><label className="search-field"><Icon name="search" /><span className="sr-only">{t('search')}</span><input type="search" placeholder={t('searchPlaceholder')} value={query} onChange={event => setQuery(event.target.value)} /></label><div className="filter-row"><label><span>{t('provider')}</span><select value={providerFilter} onChange={event => { setProviderFilter(event.target.value); if (ENQUIRY_PRODUCTS.some(product => product.id === event.target.value)) setDurationFilter(''); }}><option value="">{t('allProviders')}</option><optgroup label={t('iptv')}>{PROVIDERS.map(provider => <option key={provider}>{provider}</option>)}</optgroup>{['ott', 'ai'].map(category => <optgroup key={category} label={t(category)}>{ENQUIRY_PRODUCTS.filter(product => product.category === category).map(product => <option key={product.id} value={product.id}>{product.name}</option>)}</optgroup>)}</select></label><label><span>{t('duration')} · IPTV</span><select value={durationFilter} disabled={ENQUIRY_PRODUCTS.some(product => product.id === providerFilter)} onChange={event => setDurationFilter(event.target.value)}><option value="">{t('allDurations')}</option>{[1, 3, 6, 12].map(months => <option key={months} value={months}>{term(months, locale)}</option>)}</select></label><label><span>{t('sort')}</span><select value={sort} onChange={event => setSort(event.target.value)}><option value="recommended">{t('sortDefault')}</option><option value="price-low">{t('sortLow')}</option><option value="price-high">{t('sortHigh')}</option></select></label></div></div>
            <CatalogueNotice {...{ loading, fresh, error, t }} onRefresh={refresh} /><div className="results-summary"><span>{t('results')}: {new Intl.NumberFormat(locale).format(productGroups.length + enquiryResults.length)}</span><button className="text-button" type="button" onClick={() => { setQuery(''); setProviderFilter(''); setDurationFilter(''); setSort('recommended'); }}>{t('clearFilters')}</button></div>
            {enquiryResults.length > 0 && <p className="quote-note">{t('quoteNote')}</p>}{productGroups.length + enquiryResults.length ? productList : <div className="empty-state"><Icon name="search" size={35} /><h2>{t('noResults')}</h2></div>}
          </section></div></>}
      {productProvider && <ProductView key={locale + ':' + productProvider} provider={productProvider} plans={plansForProvider(catalog, productProvider)} locale={locale} t={t} onAdd={add} fresh={fresh} loading={loading} onRefresh={refresh} error={error} selectedId={cartId} phone={phone} />}
      {enquiryCategory && <section className="enquiry-category"><div className="page-heading"><span className="eyebrow">{t('enquiryOnly')}</span><h1>{t(enquiryCategory)}</h1><p>{t(enquiryCategory + 'Summary')}</p></div><div className="section-heading"><div><h2>{t('enquiryHeading')}</h2></div><p>{t('enquiryIntro')}</p></div><div className="enquiry-grid">{ENQUIRY_PRODUCTS.filter(product => product.category === enquiryCategory).map(product => <EnquiryCard key={locale + ':' + product.id} product={product} phone={phone} t={t} heading="h2" />)}</div><section className="document-section"><div><h2>{t(enquiryCategory + 'GuideHeading')}</h2><p>{t(enquiryCategory + 'GuideBody')}</p><div className="enquiry-browse"><Link className="button button-outline" href={pathFor(locale, 'buying-guide')}>{t('readGuide')}<Icon name="arrow" size={16} /></Link><Link className="button button-outline" href={pathFor(locale, 'contact')}>{t('contactSupport')}<Icon name="arrow" size={16} /></Link></div></div></section><p className="quote-note">{t('quoteNote')}</p></section>}
      {enquiryProduct && <section className="enquiry-detail"><div className="enquiry-detail-layout"><EnquiryCard key={locale + ':' + enquiryProduct.id} product={enquiryProduct} phone={phone} t={t} heading="h1" /><aside className="document-sidebar"><Icon name="chat" size={28} /><h2>{t('availabilityOnRequest')}</h2><p>{t('quoteNote')}</p><p className="sidebar-note">{t('securityNote')}</p><Link className="text-link" href={pathFor(locale, 'categories/' + enquiryProduct.category)}>{t(enquiryProduct.category)}<Icon name="arrow" size={16} /></Link></aside></div></section>}
      {slug === 'cart' && <section className="cart-page"><div className="page-heading"><span className="eyebrow">{t('onePlan')}</span><h1>{t('cart')}</h1><p>{t('onePlanDetail')}</p></div>
        {!cartId && <div className="empty-state"><Icon name="bag" size={44} /><h2>{t('emptyCart')}</h2><p>{t('emptyCartBody')}</p><Link className="button button-primary" href={pathFor(locale, 'shop')}>{t('shopPlans')}<Icon name="arrow" size={17} /></Link></div>}
        {cartId && <div className="cart-layout"><div className="cart-items"><CatalogueNotice {...{ loading, fresh, error, t }} onRefresh={refresh} />
          {selected ? <article className="cart-item"><div className="cart-item-art"><ProductArt provider={selected.service} compact /></div><div className="cart-item-copy"><span className="product-type">{t('subscription')}</span><h2>{selected.service} IPTV</h2><p>{term(selected.duration_months, locale)}</p><span>{t('quantity')}: 1</span><button type="button" className="remove-button" disabled={opening} onClick={() => persist(null)}><Icon name="trash" size={16} />{t('remove')}</button></div><strong>{currency(selected, locale)}</strong></article> : hydrated && !loading ? <div className="cart-unavailable" role="status"><p>{t('planUnavailable')}</p><button type="button" className="text-button" onClick={() => persist(null)}>{t('remove')}</button></div> : <p role="status">{t('refreshing')}</p>}
          <p className="cart-helper"><Icon name="info" size={18} />{t('playerSeparate')}</p><Link className="text-link" href={pathFor(locale, 'shop')}>{t('backShop')}<Icon name="arrow" size={17} /></Link>
        </div><aside className="order-summary" aria-label={t('orderSummary')}><h2>{t('orderSummary')}</h2>{selected && <><dl><div><dt>{t('provider')}</dt><dd>{selected.service}</dd></div><div><dt>{t('duration')}</dt><dd>{term(selected.duration_months, locale)}</dd></div><div className="summary-total"><dt>{t('total')}</dt><dd>{currency(selected, locale)}</dd></div></dl>{priceChanged && <p className="price-alert" role="alert">{t('priceChanged')}</p>}<label className="review-check"><input type="checkbox" checked={reviewed === quoteKey(selected)} disabled={!fresh || loading || opening} onChange={event => { setReviewed(event.target.checked ? quoteKey(selected) : ''); if (event.target.checked) setPriceChanged(false); }} /><span>{t('reviewSelection')}</span></label></>}
          <button className="button button-primary checkout-button" type="button" onClick={checkout} disabled={!selected || !fresh || loading || opening || reviewed !== quoteKey(selected)}>{t(opening ? 'openingCheckout' : 'continueCheckout')}<Icon name="arrowUp" size={18} /></button><p>{t('checkoutNote')}</p><div className="checkout-provider"><span className="mini-mark">o</span><span>Opplexify<small>{t('howItWorks')}</small></span><Icon name="shield" size={21} /></div></aside></div>}
      </section>}
      {page && <section className="document-page"><div className="page-heading"><span className="eyebrow">Cheap Accounts</span><h1>{page.title}</h1><p>{page.intro}</p></div><div className="document-layout"><div className="document-content">{page.sections.map((section, index) => slug === 'faqs' ? <details className="faq-row" key={index}><summary>{section.heading}<span aria-hidden="true">+</span></summary><p>{section.body}</p></details> : <section className="document-section" key={index}><span className="section-number">0{index + 1}</span><div><h2>{section.heading}</h2><p>{section.body}</p></div></section>)}
        {['privacy-policy', 'terms-of-service', 'refund-policy'].includes(slug) && <a className="button button-outline" href={centralUrl('/' + slug)}>{t('centralPolicies')}<Icon name="arrowUp" size={16} /></a>}
        {slug === 'contact' && <div className="document-actions"><a className="button button-primary" href={generalWhatsApp || centralUrl('/contact')} target={generalWhatsApp ? '_blank' : undefined} rel={generalWhatsApp ? 'noopener noreferrer' : undefined}>{generalWhatsApp ? t('whatsappSupport') + ' ' + (catalog?.support?.phone_display || '+' + phone) : t('contactSupport')}<Icon name="arrowUp" size={16} /></a><a className="button button-outline" href={centralUrl('/account')}>{t('customerPortal')}</a>{catalog?.support?.email && <a className="contact-email" href={'mailto:' + catalog.support.email}>{catalog.support.email}</a>}</div>}
        {['buying-guide', 'faqs'].includes(slug) && <div className="enquiry-browse">{['categories/iptv', 'categories/ott', 'categories/ai'].map(route => <Link key={route} className="button button-outline" href={pathFor(locale, route)}>{t(route.split('/')[1])}<Icon name="arrow" size={16} /></Link>)}</div>}{slug === 'buying-guide' && <HowItWorks t={t} />}</div><aside className="document-sidebar"><Icon name="chat" size={28} /><h2>{t('helpTitle')}</h2><p>{t('helpBody')}</p><a className="text-link" href={centralUrl('/contact')}>{t('contactSupport')}<Icon name="arrowUp" size={15} /></a><p className="sidebar-note">{t('securityNote')}</p></aside></div></section>}
    </main>
    <footer className="site-footer"><div className="container footer-main"><div className="footer-brand"><Link href={pathFor(locale, '')} aria-label="Cheap Accounts"><Mark light /></Link><p>{t('footerIntro')}</p><span>{t('tagline')}</span></div><div className="footer-column"><h2>{t('shop')}</h2><Link href={pathFor(locale, 'categories/iptv')}>{t('iptv')}</Link>{categories.filter(category => !category.live).map(category => <Link key={category.id} href={pathFor(locale, 'categories/' + category.id)}>{t(category.id)}</Link>)}</div><div className="footer-column"><h2>{t('support')}</h2><Link href={pathFor(locale, 'about')}>{t('about')}</Link><Link href={pathFor(locale, 'contact')}>{t('contact')}</Link><Link href={pathFor(locale, 'faqs')}>{t('faqs')}</Link><Link href={pathFor(locale, 'buying-guide')}>{t('buyingGuide')}</Link></div><div className="footer-column"><h2>{t('legal')}</h2><Link href={pathFor(locale, 'privacy-policy')}>{t('privacy')}</Link><Link href={pathFor(locale, 'terms-of-service')}>{t('terms')}</Link><Link href={pathFor(locale, 'refund-policy')}>{t('refund')}</Link><a href={centralUrl('/account')}>{t('account')}<Icon name="arrowUp" size={13} /></a></div></div><div className="container footer-bottom"><p>© {new Date().getUTCFullYear()} Cheap Accounts</p><p>{t('sharedSupport')} {t('rights')}</p><span>Opplexify <Icon name="arrowUp" size={14} /></span></div></footer>
    {generalWhatsApp && !pending && <a className="floating-whatsapp" href={generalWhatsApp} target="_blank" rel="noopener noreferrer" aria-label={t('whatsappSupport')} title={t('whatsappSupport')}><Icon name="whatsapp" size={29} /></a>}
    {pending && <ReplaceDialog pending={pending} current={selected} locale={locale} t={t} onKeep={closeReplace} onReplace={() => { persist(pending.id); closeReplace(); setNotice(t('cartAdded')); }} />}
  </div>;
}
