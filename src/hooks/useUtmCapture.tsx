import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const UTM_PARAMS = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];
const CLICK_IDS = ["fbclid", "gclid", "ttclid"];
const STORAGE_KEY_FIRST = "utm_first_touch";
const STORAGE_KEY_LAST = "utm_last_touch";
const VISITOR_KEY = "utm_visitor_id";

function generateVisitorId() {
  return "v_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function getVisitorId(): string {
  let vid = localStorage.getItem(VISITOR_KEY);
  if (!vid) {
    vid = generateVisitorId();
    localStorage.setItem(VISITOR_KEY, vid);
  }
  return vid;
}

export interface UtmData {
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
  fbclid?: string;
  gclid?: string;
  ttclid?: string;
  landing_page?: string;
  referrer?: string;
  captured_at?: string;
}

function parseUtmsFromUrl(search: string, normalize: boolean): UtmData | null {
  const params = new URLSearchParams(search);
  const data: UtmData = {};
  let hasAny = false;

  for (const key of [...UTM_PARAMS, ...CLICK_IDS]) {
    const val = params.get(key);
    if (val) {
      (data as any)[key] = normalize ? val.toLowerCase().trim() : val.trim();
      hasAny = true;
    }
  }

  if (!hasAny) return null;

  data.landing_page = window.location.pathname;
  data.referrer = document.referrer || undefined;
  data.captured_at = new Date().toISOString();
  return data;
}

export function getFirstTouch(): UtmData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_FIRST);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function getLastTouch(): UtmData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_LAST);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function getVisitorIdValue(): string {
  return getVisitorId();
}

export function useUtmCapture(enabled: boolean, normalize: boolean) {
  const location = useLocation();
  const captured = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    const utmData = parseUtmsFromUrl(location.search, normalize);
    if (!utmData) return;

    // First touch - only set once
    if (!localStorage.getItem(STORAGE_KEY_FIRST)) {
      localStorage.setItem(STORAGE_KEY_FIRST, JSON.stringify(utmData));
    }

    // Last touch - always update
    localStorage.setItem(STORAGE_KEY_LAST, JSON.stringify(utmData));

    // Save to DB (fire-and-forget)
    if (!captured.current) {
      captured.current = true;
      const visitorId = getVisitorId();
      supabase.from("tracking_sessions").insert({
        visitor_id: visitorId,
        landing_page: utmData.landing_page,
        referrer: utmData.referrer,
        utm_source: utmData.utm_source,
        utm_medium: utmData.utm_medium,
        utm_campaign: utmData.utm_campaign,
        utm_content: utmData.utm_content,
        utm_term: utmData.utm_term,
        fbclid: utmData.fbclid,
        gclid: utmData.gclid,
        ttclid: utmData.ttclid,
        user_agent: navigator.userAgent,
      } as any).then(() => { /* fire and forget */ });
    }
  }, [location.search, enabled, normalize]);
}
