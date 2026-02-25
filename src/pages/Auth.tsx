import { useState, useMemo } from "react";
import { useNavigate, useSearchParams, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, ArrowRight, ArrowLeft, Sparkles, Diamond, Loader2, MapPin, User, Store, Monitor } from "lucide-react";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useCepLookup } from "@/hooks/useCepLookup";
import authHeroImgDefault from "@/assets/auth-jewelry-hero.jpg";

type AuthMode = "login" | "register" | "recover";

export default function Auth() {
  const [mode, setMode] = useState<AuthMode>("login");
  const [registerStep, setRegisterStep] = useState(1);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [cpf, setCpf] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signIn, signUp, user, isLoading: authLoading } = useAuth();
  const { getSetting } = useStoreSettings();
  const { lookup: lookupCep, loading: cepLoading } = useCepLookup();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const logoUrl = getSetting("logo_url");
  const storeName = getSetting("store_name");
  const authHeroImg = getSetting("auth_hero_image") || authHeroImgDefault;
  const demoEnabled = getSetting("demo_enabled") === "true";
  const demoEmail = getSetting("demo_email") || "";
  const demoPassword = getSetting("demo_password") || "";

  const [addr, setAddr] = useState({
    zip_code: "", street: "", number: "", complement: "",
    neighborhood: "", city: "", state: "",
  });

  // Show loading while auth state is being resolved
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  // If user is already logged in, redirect
  if (user && redirectTo && redirectTo !== "/") {
    return <Navigate to={redirectTo} replace />;
  }
  if (user) {
    return <Navigate to="/" replace />;
  }

  const handleCepBlur = async () => {
    const result = await lookupCep(addr.zip_code);
    if (result) {
      setAddr(prev => ({ ...prev, ...result }));
    }
  };

  const validateStep1 = () => {
    if (!fullName.trim()) {
      toast({ title: "Nome obrigatório", description: "Por favor, informe seu nome completo para continuar.", variant: "warning" as any });
      return false;
    }
    if (!cpf.trim()) {
      toast({ title: "CPF obrigatório", description: "Precisamos do seu CPF para emissão de nota fiscal.", variant: "warning" as any });
      return false;
    }
    if (!email.trim()) {
      toast({ title: "Email obrigatório", description: "Seu email será usado para login e comunicações.", variant: "warning" as any });
      return false;
    }
    if (!password || password.length < 6) {
      toast({ title: "Senha muito curta", description: "Crie uma senha com pelo menos 6 caracteres para sua segurança.", variant: "warning" as any });
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateStep1()) {
      setRegisterStep(2);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (mode === "login") {
      const { error, data } = await signIn(email, password);
      if (error) {
        const msg = error.message.includes("Invalid login") 
          ? "Email ou senha incorretos. Verifique e tente novamente."
          : error.message;
        toast({ title: "Não foi possível entrar", description: msg, variant: "destructive" });
      } else {
        // Check roles to decide redirect destination
        const userId = data?.user?.id;
        if (userId && (redirectTo === "/" || !redirectTo)) {
          const { data: roles } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", userId);
          const roleList = roles?.map((r: any) => r.role) || [];
          if (roleList.includes("admin")) {
            navigate("/admin");
          } else if (roleList.includes("seller")) {
            navigate("/vendedor");
          } else {
            navigate("/");
          }
        } else {
          navigate(redirectTo);
        }
      }
    } else if (mode === "register") {
      if (registerStep === 1) {
        handleNextStep();
        setLoading(false);
        return;
      }

      const addressData = (addr.zip_code && addr.street && addr.number) ? {
        zip_code: addr.zip_code, street: addr.street, number: addr.number,
        complement: addr.complement || "", neighborhood: addr.neighborhood,
        city: addr.city, state: addr.state,
      } : undefined;

      const { error } = await signUp(email, password, fullName, {
        phone: phone || undefined,
        cpf: cpf || undefined,
        address: addressData,
      });
      if (error) {
        const msg = error.message.includes("already registered")
          ? "Este email já está cadastrado. Tente fazer login."
          : error.message;
        toast({ title: "Erro no cadastro", description: msg, variant: "destructive" });
      } else {
        toast({ title: "🎉 Conta criada com sucesso!", description: "Enviamos um link de confirmação para seu email. Verifique sua caixa de entrada.", variant: "success" as any });
      }
    } else if (mode === "recover") {
      toast({ title: "📧 Link enviado!", description: "Verifique sua caixa de entrada e spam para o link de recuperação de senha.", variant: "success" as any });
    }
    setLoading(false);
  };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    setRegisterStep(1);
  };

  const handleDemoLogin = async () => {
    if (!demoEmail || !demoPassword) return;
    setLoading(true);
    const { error, data } = await signIn(demoEmail, demoPassword);
    if (error) {
      toast({ title: "Erro no acesso demo", description: error.message, variant: "destructive" });
    } else {
      const userId = data?.user?.id;
      if (userId) {
        const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
        const roleList = roles?.map((r: any) => r.role) || [];
        if (roleList.includes("admin")) navigate("/admin");
        else if (roleList.includes("seller")) navigate("/vendedor");
        else navigate("/");
      } else {
        navigate("/admin");
      }
    }
    setLoading(false);
  };

  const titles: Record<AuthMode, { badge: string; heading: string; sub: string }> = {
    login: { badge: "Bem-vinda(o) de volta", heading: "Acesse sua Conta", sub: "Entre na sua área exclusiva" },
    register: { badge: "Junte-se a nós", heading: registerStep === 1 ? "Dados Pessoais" : "Endereço de Entrega", sub: registerStep === 1 ? "Preencha seus dados para começar" : "Informe seu endereço principal" },
    recover: { badge: "Recuperar acesso", heading: "Redefinir Senha", sub: "Informe seu email para receber o link de recuperação" },
  };

  const current = titles[mode];

  const inputClass = "h-11 bg-transparent border-0 border-b border-border/80 rounded-none px-0 text-sm focus-visible:ring-0 focus-visible:border-primary placeholder:text-muted-foreground/60 text-foreground transition-colors duration-300";
  const labelClass = "text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/70";

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left side — Hero image */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center">
        <img src={authHeroImg} alt="Joias elegantes sobre tecido acetinado" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/60 via-background/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent" />
        {[...Array(6)].map((_, i) => (
          <motion.div key={i} className="absolute w-1 h-1 rounded-full bg-primary/60"
            style={{ top: `${15 + i * 14}%`, left: `${20 + (i % 3) * 25}%` }}
            animate={{ opacity: [0, 1, 0], scale: [0.5, 1.5, 0.5] }}
            transition={{ duration: 3 + i * 0.5, repeat: Infinity, delay: i * 0.8 }}
          />
        ))}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, delay: 0.3 }} className="relative z-10 text-center px-12">
          <div className="inline-block bg-black/50 backdrop-blur-md rounded-2xl px-8 py-5 border border-white/10">
            <h2 className="font-display text-xl font-bold text-white tracking-wide">{storeName || "Zenith Sport"}</h2>
            <p className="text-white/60 text-xs mt-1.5 tracking-[0.2em] uppercase">Performance & Estilo</p>
          </div>
        </motion.div>
      </div>

      {/* Right side — Form */}
      <div className="w-full lg:w-1/2 flex flex-col bg-background">
        <div className="lg:hidden relative h-48 overflow-hidden">
          <img src={authHeroImg} alt="Joias elegantes" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />
        </div>

        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
          <AnimatePresence mode="wait">
            <motion.div key={`${mode}-${registerStep}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.35 }} className="w-full max-w-md">
              <div className="bg-card/90 backdrop-blur-sm rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.08)] border border-border/40 p-5 sm:p-7 md:p-8">
                {logoUrl && (
                  <div className="flex justify-center mb-4">
                    <img src={logoUrl} alt="Logo da loja" className="w-28 h-28 sm:w-36 sm:h-36 object-contain drop-shadow-md" />
                  </div>
                )}

                {/* Step indicator for register */}
                {mode === "register" && (
                  <div className="flex items-center justify-center gap-3 mb-5">
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${registerStep === 1 ? "bg-primary text-primary-foreground" : "bg-primary/20 text-primary"}`}>
                        <User className="w-4 h-4" />
                      </div>
                      <span className={`text-xs font-medium hidden sm:inline ${registerStep === 1 ? "text-foreground" : "text-muted-foreground"}`}>Dados</span>
                    </div>
                    <div className="w-8 sm:w-12 h-px bg-border" />
                    <div className="flex items-center gap-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${registerStep === 2 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                        <MapPin className="w-4 h-4" />
                      </div>
                      <span className={`text-xs font-medium hidden sm:inline ${registerStep === 2 ? "text-foreground" : "text-muted-foreground"}`}>Endereço</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 mb-3">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-primary/10 text-primary">
                    {mode === "recover" ? <Diamond className="w-3 h-3" /> : <Sparkles className="w-3 h-3" />}
                    <span className="text-[10px] font-bold tracking-[0.15em] uppercase">{current.badge}</span>
                  </div>
                </div>

                <h1 className="text-lg sm:text-xl font-display font-bold text-foreground tracking-wide mb-0.5">{current.heading}</h1>
                <p className="text-muted-foreground text-xs mb-5">{current.sub}</p>

                <form onSubmit={handleSubmit} className="space-y-3.5">
                  {/* Demo access card */}
                  {demoEnabled && demoEmail && mode === "login" && (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-accent/10 border border-accent/20 rounded-xl p-3.5 space-y-2"
                    >
                      <div className="flex items-center gap-2">
                        <Monitor className="w-4 h-4 text-accent" />
                        <span className="text-xs font-bold text-foreground uppercase tracking-wide">Acesso Demo</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">Explore o painel administrativo com acesso de demonstração.</p>
                      <div className="flex gap-3 text-[10px] text-muted-foreground">
                        <span><strong>Email:</strong> {demoEmail}</span>
                        <span><strong>Senha:</strong> {demoPassword}</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleDemoLogin}
                        disabled={loading}
                        className="w-full h-9 rounded-lg bg-accent text-accent-foreground text-xs font-bold uppercase tracking-wide hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        <Monitor className="w-3.5 h-3.5" /> {loading ? "Entrando..." : "Entrar como Demo"}
                      </button>
                    </motion.div>
                  )}
                  {/* === REGISTER STEP 1: Personal Data === */}
                  {mode === "register" && registerStep === 1 && (
                    <>
                      <div className="space-y-1.5">
                        <Label htmlFor="fullName" className={labelClass}>Nome completo *</Label>
                        <Input id="fullName" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Seu nome completo" required className={inputClass} />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className={labelClass}>CPF *</Label>
                          <Input value={cpf} onChange={e => setCpf(e.target.value)} placeholder="000.000.000-00" required className={inputClass} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className={labelClass}>Telefone / WhatsApp</Label>
                          <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="(11) 99999-9999" className={inputClass} />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="email" className={labelClass}>Email *</Label>
                        <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required className={inputClass} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="password" className={labelClass}>Senha *</Label>
                        <div className="relative">
                          <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" required minLength={6} className={`${inputClass} pr-10`} />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <Button type="button" onClick={handleNextStep}
                        className="w-full h-11 rounded-xl text-xs font-bold uppercase tracking-[0.15em] bg-primary text-primary-foreground hover:bg-primary/90 border-0 transition-all duration-300 hover:shadow-lg active:scale-[0.98]"
                      >
                        <span className="relative flex items-center justify-center gap-2">
                          Próximo: Endereço <ArrowRight className="w-3.5 h-3.5" />
                        </span>
                      </Button>
                    </>
                  )}

                  {/* === REGISTER STEP 2: Address === */}
                  {mode === "register" && registerStep === 2 && (
                    <>
                      <div className="space-y-4">
                        <div className="space-y-1.5">
                          <Label className={labelClass}>CEP *</Label>
                          <div className="relative">
                            <Input
                              value={addr.zip_code}
                              onChange={e => setAddr({ ...addr, zip_code: e.target.value })}
                              onBlur={handleCepBlur}
                              placeholder="00000-000"
                              required
                              className={inputClass}
                            />
                            {cepLoading && <Loader2 className="absolute right-0 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />}
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                          <div className="col-span-2 space-y-1.5">
                            <Label className={labelClass}>Rua *</Label>
                            <Input value={addr.street} onChange={e => setAddr({ ...addr, street: e.target.value })} placeholder="Logradouro" required className={inputClass} />
                          </div>
                          <div className="space-y-1.5">
                            <Label className={labelClass}>Nº *</Label>
                            <Input value={addr.number} onChange={e => setAddr({ ...addr, number: e.target.value })} placeholder="123" required className={inputClass} />
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <Label className={labelClass}>Complemento</Label>
                          <Input value={addr.complement} onChange={e => setAddr({ ...addr, complement: e.target.value })} placeholder="Apto, bloco..." className={inputClass} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className={labelClass}>Bairro *</Label>
                          <Input value={addr.neighborhood} onChange={e => setAddr({ ...addr, neighborhood: e.target.value })} placeholder="Bairro" required className={inputClass} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5">
                            <Label className={labelClass}>Cidade *</Label>
                            <Input value={addr.city} onChange={e => setAddr({ ...addr, city: e.target.value })} placeholder="Cidade" required className={inputClass} />
                          </div>
                          <div className="space-y-1.5">
                            <Label className={labelClass}>Estado *</Label>
                            <Input value={addr.state} onChange={e => setAddr({ ...addr, state: e.target.value })} placeholder="SP" maxLength={2} required className={inputClass} />
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Button type="button" variant="outline" onClick={() => setRegisterStep(1)}
                          className="flex-1 h-11 rounded-xl text-xs font-bold uppercase tracking-[0.15em] transition-all duration-300 active:scale-[0.98]"
                        >
                          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" /> Voltar
                        </Button>
                        <Button type="submit" disabled={loading}
                          className="flex-1 h-11 rounded-xl text-xs font-bold uppercase tracking-[0.15em] bg-primary text-primary-foreground hover:bg-primary/90 border-0 transition-all duration-300 hover:shadow-lg active:scale-[0.98]"
                        >
                          <span className="relative flex items-center justify-center gap-2">
                            {loading ? "Processando..." : <>Criar Conta <Sparkles className="w-3.5 h-3.5" /></>}
                          </span>
                        </Button>
                      </div>
                    </>
                  )}

                  {/* === LOGIN === */}
                  {mode === "login" && (
                    <>
                      <div className="space-y-1.5">
                        <Label htmlFor="email" className={labelClass}>Email</Label>
                        <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required className={inputClass} />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="password" className={labelClass}>Senha</Label>
                        <div className="relative">
                          <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} className={`${inputClass} pr-10`} />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="text-right">
                        <button type="button" onClick={() => switchMode("recover")} className="text-[11px] text-primary hover:text-primary/80 transition-colors tracking-wide">
                          Esqueceu sua senha?
                        </button>
                      </div>
                      <Button type="submit" disabled={loading}
                        className="w-full h-11 rounded-xl text-xs font-bold uppercase tracking-[0.15em] bg-primary text-primary-foreground hover:bg-primary/90 border-0 transition-all duration-300 hover:shadow-lg active:scale-[0.98]"
                      >
                        <span className="relative flex items-center justify-center gap-2">
                          {loading ? "Processando..." : <>Entrar <ArrowRight className="w-3.5 h-3.5" /></>}
                        </span>
                      </Button>
                    </>
                  )}

                  {/* === RECOVER === */}
                  {mode === "recover" && (
                    <>
                      <div className="space-y-1.5">
                        <Label htmlFor="email" className={labelClass}>Email</Label>
                        <Input id="email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required className={inputClass} />
                      </div>
                      <Button type="submit" disabled={loading}
                        className="w-full h-11 rounded-xl text-xs font-bold uppercase tracking-[0.15em] bg-primary text-primary-foreground hover:bg-primary/90 border-0 transition-all duration-300 hover:shadow-lg active:scale-[0.98]"
                      >
                        <span className="relative flex items-center justify-center gap-2">
                          {loading ? "Processando..." : <>Enviar Link <ArrowRight className="w-3.5 h-3.5" /></>}
                        </span>
                      </Button>
                    </>
                  )}
                </form>

                <div className="mt-5 pt-5 border-t border-border/40 text-center space-y-2">
                  {mode === "login" && (
                    <button onClick={() => switchMode("register")} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                      Não tem conta? <span className="font-bold">Cadastre-se</span>
                    </button>
                  )}
                  {mode === "register" && (
                    <button onClick={() => switchMode("login")} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                      Já tem conta? <span className="font-bold">Faça login</span>
                    </button>
                  )}
                  {mode === "recover" && (
                    <button onClick={() => switchMode("login")} className="text-xs text-muted-foreground hover:text-primary transition-colors">
                      ← Voltar para o login
                    </button>
                  )}
                </div>

                {/* CTA Vendedor */}
                {(mode === "login" || mode === "register") && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="mt-3 bg-primary/5 rounded-xl border border-primary/15 p-3 text-center"
                  >
                    <p className="text-[10px] font-bold text-primary uppercase tracking-[0.15em] mb-0.5">Seja um Vendedor da {storeName || "Zenith"}</p>
                    <p className="text-[10px] text-muted-foreground mb-2">Cadastre-se e aguarde aprovação do administrador.</p>
                    <button
                      type="button"
                      onClick={() => navigate("/vendedor/cadastro")}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-[11px] font-bold hover:bg-primary/20 transition-colors duration-200"
                    >
                      <Store className="w-3 h-3" /> Quero ser vendedor
                    </button>
                  </motion.div>
                )}
              </div>

              <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-center text-[9px] text-muted-foreground/60 mt-5 tracking-[0.2em] uppercase">
                <Diamond className="w-2.5 h-2.5 inline-block mr-1 -mt-0.5" /> Ambiente seguro e criptografado
              </motion.p>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
