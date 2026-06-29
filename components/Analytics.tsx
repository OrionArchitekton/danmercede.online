import { useEffect } from 'react';
import { Analytics as VercelAnalytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { resolveGaConfig, type GaRuntimeConfig } from '../analytics/gaConfig';

// Resolved once from the build-time env. Null => GA is a no-op everywhere (dev,
// preview, or any deploy without VITE_GA_MEASUREMENT_ID). See analytics/gaConfig.
const gaConfig = resolveGaConfig(import.meta.env.VITE_GA_MEASUREMENT_ID);

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

let gtagLoaded = false;

// Idempotent: install the gtag stub + Consent Mode default + config and inject
// the loader <script> exactly once. The consent default is pushed BEFORE config
// so GA's first hit already reflects the privacy posture (ad signals denied,
// analytics granted). anonymize_ip + send_page_view:false live in cfg.configParams.
function ensureGtagLoaded(cfg: GaRuntimeConfig): void {
  if (gtagLoaded || typeof window === 'undefined') return;
  gtagLoaded = true;

  window.dataLayer = window.dataLayer || [];
  const gtag: (...args: unknown[]) => void = (...args) => {
    window.dataLayer!.push(args);
  };
  window.gtag = gtag;

  gtag('consent', 'default', cfg.consentDefaults);
  gtag('js', new Date());
  gtag('config', cfg.measurementId, cfg.configParams);

  const script = document.createElement('script');
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(cfg.measurementId)}`;
  document.head.appendChild(script);
}

// danmercede.online is a single-page SPA whose entries are #<slug> hash fragments
// sharing one indexable URL (config sets send_page_view:false). We fire a
// page_view on initial mount and on each hashchange so the analytics shows which
// signals get read, without depending on a router this site does not have.
const GoogleAnalytics = () => {
  useEffect(() => {
    if (!gaConfig) return;
    ensureGtagLoaded(gaConfig);
    const fire = () => {
      window.gtag?.('event', 'page_view', {
        page_path: `${window.location.pathname}${window.location.hash}`,
        page_location: window.location.href,
        page_title: document.title,
      });
    };
    fire();
    window.addEventListener('hashchange', fire);
    return () => window.removeEventListener('hashchange', fire);
  }, []);

  return null;
};

// Single mount point for all site instrumentation. ALL of it — GA4 and the Vercel
// widgets — is gated on the production-only VITE_GA_MEASUREMENT_ID switch (via
// gaConfig), so dev and preview deploys mount nothing and emit nothing. The
// Vercel widgets are otherwise cookieless and per-environment.
const Analytics = () => {
  if (!gaConfig) return null;
  return (
    <>
      <GoogleAnalytics />
      <VercelAnalytics />
      <SpeedInsights />
    </>
  );
};

export default Analytics;
