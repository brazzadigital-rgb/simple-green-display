import { useState, useEffect, createContext, useContext, ReactNode } from "react";

export interface ConsentState {
  essential: boolean;
  analytics: boolean;
  marketing: boolean;
  decided: boolean;
}

const DEFAULT_CONSENT: ConsentState = {
  essential: true,
  analytics: false,
  marketing: false,
  decided: false,
};

const STORAGE_KEY = "cookie_consent";

interface ConsentContextValue {
  consent: ConsentState;
  acceptAll: () => void;
  rejectAll: () => void;
  setCustom: (analytics: boolean, marketing: boolean) => void;
  showBanner: boolean;
}

const ConsentContext = createContext<ConsentContextValue>({
  consent: DEFAULT_CONSENT,
  acceptAll: () => {},
  rejectAll: () => {},
  setCustom: () => {},
  showBanner: false,
});

export function ConsentProvider({ children, enabled }: { children: ReactNode; enabled: boolean }) {
  const [consent, setConsent] = useState<ConsentState>(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored);
    } catch {}
    return DEFAULT_CONSENT;
  });

  const save = (c: ConsentState) => {
    setConsent(c);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
  };

  const acceptAll = () => save({ essential: true, analytics: true, marketing: true, decided: true });
  const rejectAll = () => save({ essential: true, analytics: false, marketing: false, decided: true });
  const setCustom = (analytics: boolean, marketing: boolean) =>
    save({ essential: true, analytics, marketing, decided: true });

  const showBanner = enabled && !consent.decided;

  return (
    <ConsentContext.Provider value={{ consent, acceptAll, rejectAll, setCustom, showBanner }}>
      {children}
    </ConsentContext.Provider>
  );
}

export function useConsent() {
  return useContext(ConsentContext);
}
