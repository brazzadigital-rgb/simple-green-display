import { useState } from "react";
import { useConsent } from "@/hooks/useCookieConsent";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Shield, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Props {
  bannerText: string;
  policyLink: string;
}

export function CookieConsentBanner({ bannerText, policyLink }: Props) {
  const { showBanner, acceptAll, rejectAll, setCustom } = useConsent();
  const [showCustom, setShowCustom] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);

  if (!showBanner) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-0 left-0 right-0 z-[9999] p-4"
      >
        <div className="max-w-2xl mx-auto bg-card border border-border rounded-2xl shadow-2xl p-5 space-y-4">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-primary shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-sans text-sm text-foreground leading-relaxed">{bannerText}</p>
              <a href={policyLink} className="font-sans text-xs text-primary hover:underline">
                Política de Privacidade
              </a>
            </div>
          </div>

          <AnimatePresence>
            {showCustom && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="space-y-3 overflow-hidden"
              >
                <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-xl">
                  <div>
                    <p className="font-sans text-sm font-medium">Essenciais</p>
                    <p className="font-sans text-xs text-muted-foreground">Necessários para o funcionamento</p>
                  </div>
                  <Switch checked disabled />
                </div>
                <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-xl">
                  <div>
                    <p className="font-sans text-sm font-medium">Analytics (GA4)</p>
                    <p className="font-sans text-xs text-muted-foreground">Análise de tráfego e comportamento</p>
                  </div>
                  <Switch checked={analytics} onCheckedChange={setAnalytics} />
                </div>
                <div className="flex items-center justify-between py-2 px-3 bg-muted/50 rounded-xl">
                  <div>
                    <p className="font-sans text-sm font-medium">Marketing (Meta Pixel)</p>
                    <p className="font-sans text-xs text-muted-foreground">Remarketing e conversões</p>
                  </div>
                  <Switch checked={marketing} onCheckedChange={setMarketing} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl font-sans text-xs"
              onClick={() => setShowCustom(!showCustom)}
            >
              {showCustom ? <ChevronUp className="w-3 h-3 mr-1" /> : <ChevronDown className="w-3 h-3 mr-1" />}
              Personalizar
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl font-sans text-xs"
              onClick={rejectAll}
            >
              Rejeitar
            </Button>
            {showCustom ? (
              <Button
                size="sm"
                className="rounded-xl font-sans text-xs ml-auto"
                onClick={() => setCustom(analytics, marketing)}
              >
                Salvar preferências
              </Button>
            ) : (
              <Button
                size="sm"
                className="rounded-xl font-sans text-xs ml-auto"
                onClick={acceptAll}
              >
                Aceitar todos
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
