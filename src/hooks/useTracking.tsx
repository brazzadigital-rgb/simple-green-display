import { createContext, useContext, ReactNode } from "react";
import { useTrackingSettings } from "@/hooks/useTrackingSettings";
import { useTrackingScripts } from "@/hooks/useTrackingScripts";
import { useUtmCapture } from "@/hooks/useUtmCapture";
import { ConsentProvider } from "@/hooks/useCookieConsent";

interface TrackingContextValue {
  trackEvent: (eventName: string, data?: any) => void;
}

const TrackingContext = createContext<TrackingContextValue>({
  trackEvent: () => {},
});

function TrackingInner({ children }: { children: ReactNode }) {
  const { config } = useTrackingSettings();
  const { trackEvent } = useTrackingScripts(config);

  // UTM capture
  useUtmCapture(config.utmify_enabled, config.utmify_normalize);

  return (
    <TrackingContext.Provider value={{ trackEvent }}>
      {children}
    </TrackingContext.Provider>
  );
}

export function TrackingProvider({ children }: { children: ReactNode }) {
  const { config } = useTrackingSettings();

  return (
    <ConsentProvider enabled={config.lgpd_enabled}>
      <TrackingInner>{children}</TrackingInner>
    </ConsentProvider>
  );
}

export function useTracking() {
  return useContext(TrackingContext);
}
