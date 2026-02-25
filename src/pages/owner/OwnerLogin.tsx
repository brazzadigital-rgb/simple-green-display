import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Shield, Eye, EyeOff, Loader2 } from "lucide-react";
import { useOwnerAuth } from "@/hooks/useOwnerAuth";
import { toast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export default function OwnerLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const { signIn } = useOwnerAuth();
  const navigate = useNavigate();

  const isLocked = attempts >= 5;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLocked) {
      toast({ title: "Acesso bloqueado", description: "Muitas tentativas. Aguarde alguns minutos.", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        setAttempts(a => a + 1);
        toast({ title: "Credenciais inválidas", description: "Verifique email e senha.", variant: "destructive" });
      } else {
        // Check owner role after login
        navigate("/owner");
      }
    } catch {
      toast({ title: "Erro ao autenticar", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-stone-50 to-slate-100 p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-xl border-0 bg-white/90 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-600 flex items-center justify-center mb-4 shadow-lg">
              <Shield className="w-7 h-7 text-white" />
            </div>
            <CardTitle className="text-xl font-bold text-slate-800">Acesso Restrito</CardTitle>
            <CardDescription className="text-slate-500">Painel do proprietário do sistema</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-slate-700 font-medium text-sm">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  disabled={isLocked}
                  className="h-11 rounded-xl border-slate-200 focus:border-slate-400 bg-slate-50/50"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password" className="text-slate-700 font-medium text-sm">Senha</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={isLocked}
                    className="h-11 rounded-xl border-slate-200 focus:border-slate-400 pr-10 bg-slate-50/50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    tabIndex={-1}
                  >
                    {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              {isLocked && (
                <p className="text-sm text-destructive text-center">Acesso temporariamente bloqueado por excesso de tentativas.</p>
              )}
              <Button
                type="submit"
                disabled={loading || isLocked}
                className="w-full h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold shadow-md"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Entrar"}
              </Button>
            </form>
          </CardContent>
        </Card>
        <p className="text-center text-xs text-slate-400 mt-6">
          Acesso exclusivo para administradores do sistema.
        </p>
      </motion.div>
    </div>
  );
}
