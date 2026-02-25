import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Clock, LogOut, Diamond } from "lucide-react";
import { useStoreSettings } from "@/hooks/useStoreSettings";

export default function SellerPending() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const { getSetting } = useStoreSettings();
  const logoUrl = getSetting("logo_url");

  const handleLogout = async () => {
    await signOut();
    navigate("/auth");
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md text-center">
        <div className="bg-card/80 backdrop-blur-sm rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.06)] border border-border/60 p-8 sm:p-10">
          {logoUrl && (
            <img src={logoUrl} alt="Logo" className="w-20 h-20 object-contain mx-auto mb-4" />
          )}
          
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}>
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-primary" />
            </div>
          </motion.div>

          <h1 className="text-2xl font-display font-bold text-foreground mb-2">Cadastro em Análise</h1>
          <p className="text-muted-foreground text-sm mb-6">
            Seu cadastro como vendedor está sendo analisado pela equipe. Você será notificado assim que for aprovado.
          </p>

          <div className="bg-muted/30 rounded-xl p-4 mb-6 text-left space-y-2">
            <p className="text-xs text-muted-foreground">
              <strong className="text-foreground">O que acontece agora?</strong>
            </p>
            <ul className="text-xs text-muted-foreground space-y-1">
              <li>• Nossa equipe vai analisar seus dados</li>
              <li>• Você receberá uma notificação quando aprovado</li>
              <li>• Após aprovação, terá acesso ao painel do vendedor</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate("/")} className="flex-1 h-11 rounded-xl text-sm">
              Ver loja
            </Button>
            <Button variant="ghost" onClick={handleLogout} className="h-11 rounded-xl text-sm gap-2">
              <LogOut className="w-4 h-4" /> Sair
            </Button>
          </div>
        </div>

        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-center text-[10px] text-muted-foreground mt-6 tracking-widest uppercase">
          <Diamond className="w-3 h-3 inline-block mr-1 -mt-0.5" /> Status: Pendente de aprovação
        </motion.p>
      </motion.div>
    </div>
  );
}
