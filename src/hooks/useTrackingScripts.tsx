import { useEffect, useRef, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { useConsent } from "@/hooks/useCookieConsent";
import type { TrackingConfig } from "@/hooks/useTrackingSettings";

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
    gtag: any;
    dataLayer: any[];
  }
}

// Generate unique event_id for deduplication
function eventId() {
  return crypto.randomUUID?.() || Math.random().toString(36).slice(2);
}

export function useTrackingScripts(config: TrackingConfig) {
  const { consent } = useConsent();
  const location = useLocation();
  const metaLoaded = useRef(false);
  const ga4Loaded = useRef(false);
  const debugLog = useRef<Array<{ ts: string; event: string; platform: string; data?: any }>>([]);

  const log = useCallback((platform: string, event: string, data?: any) => {
    if (config.debug_mode) {
      const entry = { ts: new Date().toISOString(), platform, event, data };
      debugLog.current = [entry, ...debugLog.current.slice(0, 49)];
      console.log(`[Tracking ${platform}]`, event, data || "");
      // Store for diagnostics page
      try { localStorage.setItem("tracking_debug_log", JSON.stringify(debugLog.current)); } catch {}
    }
  }, [config.debug_mode]);

  // Load Meta Pixel
  useEffect(() => {
    if (!config.meta_pixel_enabled || !config.meta_pixel_id || !consent.marketing || metaLoaded.current) return;

    const script = document.createElement("script");
    script.innerHTML = `
      !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
      n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
      n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
      t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
      document,'script','https://connect.facebook.net/en_US/fbevents.js');
      fbq('init', '${config.meta_pixel_id}');
    `;
    document.head.appendChild(script);
    metaLoaded.current = true;
    log("Meta Pixel", "Loaded", { pixelId: config.meta_pixel_id });
  }, [config.meta_pixel_enabled, config.meta_pixel_id, consent.marketing, log]);

  // Load GA4
  useEffect(() => {
    if (!config.ga4_enabled || !config.ga4_measurement_id || !consent.analytics || ga4Loaded.current) return;

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${config.ga4_measurement_id}`;
    document.head.appendChild(script);

    const inline = document.createElement("script");
    inline.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', '${config.ga4_measurement_id}', { send_page_view: false });
    `;
    document.head.appendChild(inline);
    ga4Loaded.current = true;
    log("GA4", "Loaded", { measurementId: config.ga4_measurement_id });
  }, [config.ga4_enabled, config.ga4_measurement_id, consent.analytics, log]);

  // SPA route tracking - page views
  useEffect(() => {
    if (config.meta_pixel_enabled && consent.marketing && window.fbq && config.meta_pixel_events.PageView) {
      window.fbq("track", "PageView", {}, { eventID: config.meta_pixel_dedup ? eventId() : undefined });
      log("Meta Pixel", "PageView");
    }
    if (config.ga4_enabled && consent.analytics && window.gtag && config.ga4_events.page_view) {
      window.gtag("event", "page_view", { page_path: location.pathname + location.search });
      log("GA4", "page_view", { path: location.pathname });
    }
  }, [location.pathname, location.search]);

  // Return tracking functions for use in components
  const trackEvent = useCallback((eventName: string, data?: any) => {
    // Meta Pixel events
    if (config.meta_pixel_enabled && consent.marketing && window.fbq) {
      const metaEvents = config.meta_pixel_events as any;
      if (metaEvents[eventName]) {
        const opts = config.meta_pixel_dedup ? { eventID: eventId() } : {};
        window.fbq("track", eventName, data || {}, opts);
        log("Meta Pixel", eventName, data);
      }
    }
    // GA4 events - map names
    const ga4Map: Record<string, string> = {
      ViewContent: "view_item",
      Search: "search",
      AddToCart: "add_to_cart",
      InitiateCheckout: "begin_checkout",
      AddPaymentInfo: "add_payment_info",
      Purchase: "purchase",
    };
    const ga4Name = ga4Map[eventName] || eventName;
    if (config.ga4_enabled && consent.analytics && window.gtag) {
      const ga4Events = config.ga4_events as any;
      if (ga4Events[ga4Name]) {
        window.gtag("event", ga4Name, data || {});
        log("GA4", ga4Name, data);
      }
    }
  }, [config, consent, log]);

  return { trackEvent, debugLog: debugLog.current };
}
