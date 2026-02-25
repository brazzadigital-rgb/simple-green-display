import { useState, useRef } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { motion, AnimatePresence } from "framer-motion";
import { Eye, EyeOff, ArrowRight, ArrowLeft, Sparkles, Diamond, Loader2, CheckCircle, Store } from "lucide-react";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import authHeroImg from "@/assets/auth-jewelry-hero.jpg";

export default function SellerRegister() {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { getSetting } = useStoreSettings();
  const logoUrl = getSetting("logo_url");
  const storeName = getSetting("store_name");

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [success, setSuccess] = useState(false);
  const submittingRef = useRef(false);

  // Step 1 fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [cpf, setCpf] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Step 2 fields
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [instagram, setInstagram] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [source, setSource] = useState("");
  const [notes, setNotes] = useState("");

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user && !success && !loading && !submittingRef.current) {
    return <Navigate to="/" replace />;
  }

  const maskPhone = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const maskCpf = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

  const validateStep1 = () => {
    if (!fullName.trim()) { toast({ title: "Nome obrigatório", variant: "destructive" }); return false; }
    if (!email.trim()) { toast({ title: "Email obrigatório", variant: "destructive" }); return false; }
    if (!isValidEmail(email)) { toast({ title: "Email inválido", description: "Verifique se o email está correto. Ex: seunome@gmail.com", variant: "destructive" }); return false; }
    if (!whatsapp.trim() || whatsapp.replace(/\D/g, "").length < 10) { toast({ title: "WhatsApp inválido", variant: "destructive" }); return false; }
    if (!cpf.trim() || cpf.replace(/\D/g, "").length !== 11) { toast({ title: "CPF inválido", variant: "destructive" }); return false; }
    if (!password || password.length < 6) { toast({ title: "Senha deve ter no mínimo 6 caracteres", variant: "destructive" }); return false; }
    if (password !== confirmPassword) { toast({ title: "Senhas não conferem", variant: "destructive" }); return false; }
    return true;
  };

  const validateStep2 = () => {
    if (!city.trim()) { toast({ title: "Cidade obrigatória", variant: "destructive" }); return false; }
    if (!state.trim()) { toast({ title: "Estado obrigatório", variant: "destructive" }); return false; }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateStep2()) return;
    setLoading(true);
    submittingRef.current = true;
    try {
      // 1. Create auth user
      const trimmedEmail = email.trim().toLowerCase();
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: trimmedEmail,
        password,
        options: {
          data: { full_name: fullName, phone: whatsapp, cpf: cpf.replace(/\D/g, "") },
          emailRedirectTo: window.location.origin,
        },
      });

      if (authError) {
        const msg = authError.message.includes("already registered")
          ? "Este email já está cadastrado. Tente fazer login."
          : authError.message;
        toast({ title: "Erro no cadastro", description: msg, variant: "destructive" });
        setLoading(false);
        return;
      }

      const userId = authData.user?.id;
      if (!userId) {
        toast({ title: "Erro inesperado", variant: "destructive" });
        setLoading(false);
        return;
      }

      // 2. Seller role is auto-added via database trigger (trg_auto_add_seller_role)

      // 3. Create seller record
      const { error: sellerError } = await supabase.from("sellers").insert({
        user_id: userId,
        name: fullName,
        email,
        phone: whatsapp,
        document: cpf.replace(/\D/g, ""),
        status: "active",
        seller_status: "pending",
        whatsapp,
        city,
        state,
        instagram: instagram || null,
        experience_level: experienceLevel || null,
        source: source || null,
        notes: notes || null,
      } as any);

      if (sellerError) {
        console.error("Seller insert error:", sellerError);
        toast({ title: "Erro ao registrar vendedor", description: sellerError.message, variant: "destructive" });
        setLoading(false);
        return;
      }

      // 4. Notify admins
      const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin" as any);
      if (admins && admins.length > 0) {
        const notifications = admins.map((a: any) => ({
          recipient_type: "admin",
          recipient_user_id: a.user_id,
          title: "Novo vendedor pendente",
          body: `${fullName} se cadastrou como vendedor e aguarda aprovação.`,
          type: "seller_pending",
          entity_type: "seller",
          priority: "high",
        }));
        await supabase.from("notifications").insert(notifications);
      }

      // 5. Sign out first, then show success
      await supabase.auth.signOut();
      setSuccess(true);
      setLoading(false);
      return;
    } catch (err) {
      console.error(err);
      toast({ title: "Erro inesperado", variant: "destructive" });
    }

    setLoading(false);
  };

  const inputClass = "h-12 bg-transparent border-0 border-b border-border rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary placeholder:text-muted-foreground text-foreground transition-colors duration-300";
  const labelClass = "text-xs font-semibold uppercase tracking-wider text-muted-foreground";

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left side — Hero */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden items-center justify-center">
        <img src={authHeroImg} alt="Joias elegantes" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-background/60 via-background/30 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/40 to-transparent" />
        {[...Array(6)].map((_, i) => (
          <motion.div key={i} className="absolute w-1 h-1 rounded-full bg-primary/60"
            style={{ top: `${15 + i * 14}%`, left: `${20 + (i % 3) * 25}%` }}
            animate={{ opacity: [0, 1, 0], scale: [0.5, 1.5, 0.5] }}
            transition={{ duration: 3 + i * 0.5, repeat: Infinity, delay: i * 0.8 }}
          />
        ))}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }} className="relative z-10 text-center px-12">
          <div className="inline-block bg-black/40 backdrop-blur-sm rounded-2xl px-8 py-5">
            <Store className="w-8 h-8 text-white mx-auto mb-2" />
            <h2 className="font-display text-2xl font-bold text-white tracking-wide">Seja um Vendedor</h2>
            <p className="text-white/80 text-sm mt-2 tracking-widest uppercase">{storeName || "Lizara"}</p>
          </div>
        </motion.div>
      </div>

      {/* Right side — Form */}
      <div className="w-full lg:w-1/2 flex flex-col bg-background">
        <div className="lg:hidden relative h-36 overflow-hidden">
          <img src={authHeroImg} alt="Joias" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-background/50 to-background" />
        </div>

        <div className="flex-1 flex items-center justify-center px-4 sm:px-6 py-8 sm:py-12">
          <AnimatePresence mode="wait">
            {success ? (
              <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md text-center">
                <div className="bg-card/80 backdrop-blur-sm rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.06)] border border-border/60 p-8 sm:p-10">
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", delay: 0.2 }}>
                    <CheckCircle className="w-16 h-16 text-primary mx-auto mb-4" />
                  </motion.div>
                  <h2 className="text-2xl font-display font-bold text-foreground mb-2">Cadastro recebido ✅</h2>
                  <p className="text-muted-foreground text-sm mb-6">
                    Seu cadastro está em análise. Você será notificado quando for aprovado pelo administrador.
                  </p>
                  <p className="text-xs text-muted-foreground mb-6">
                    Enviamos um link de confirmação para <strong>{email}</strong>. Verifique sua caixa de entrada.
                  </p>
                  <Button onClick={() => navigate("/auth")} className="w-full h-12 rounded-xl text-sm font-semibold uppercase tracking-widest">
                    Voltar para Login
                  </Button>
                </div>
              </motion.div>
            ) : (
              <motion.div key={`step-${step}`} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ duration: 0.35 }} className="w-full max-w-md">
                <div className="bg-card/80 backdrop-blur-sm rounded-2xl shadow-[0_4px_30px_rgba(0,0,0,0.06)] border border-border/60 p-6 sm:p-8">
                  {logoUrl && (
                    <div className="flex justify-center mb-4">
                      <img src={logoUrl} alt="Logo" className="w-24 h-24 object-contain drop-shadow-md" />
                    </div>
                  )}

                  {/* Step indicator */}
                  <div className="flex items-center justify-center gap-3 mb-5">
                    {[1, 2].map((s) => (
                      <div key={s} className="flex items-center gap-2">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                          {s}
                        </div>
                        <span className={`text-xs font-medium hidden sm:inline ${step >= s ? "text-foreground" : "text-muted-foreground"}`}>
                          {s === 1 ? "Dados" : "Perfil"}
                        </span>
                        {s === 1 && <div className="w-8 sm:w-12 h-px bg-border" />}
                      </div>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary">
                      <Store className="w-3 h-3" />
                      <span className="text-xs font-semibold tracking-wider uppercase">Cadastro Vendedor</span>
                    </div>
                  </div>

                  <h1 className="text-xl sm:text-2xl font-display font-bold text-foreground tracking-wide mb-1">
                    {step === 1 ? "Dados Pessoais" : "Perfil Profissional"}
                  </h1>
                  <p className="text-muted-foreground text-sm mb-6">
                    {step === 1 ? "Preencha seus dados para se cadastrar" : "Conte-nos mais sobre você (opcional)"}
                  </p>

                  {/* Step 1 */}
                  {step === 1 && (
                    <div className="space-y-4">
                      <div className="space-y-1.5">
                        <Label className={labelClass}>Nome completo *</Label>
                        <Input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Seu nome completo" className={inputClass} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className={labelClass}>Email *</Label>
                        <Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" className={inputClass} />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className={labelClass}>WhatsApp *</Label>
                          <Input value={whatsapp} onChange={e => setWhatsapp(maskPhone(e.target.value))} placeholder="(11) 99999-9999" className={inputClass} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className={labelClass}>CPF *</Label>
                          <Input value={cpf} onChange={e => setCpf(maskCpf(e.target.value))} placeholder="000.000.000-00" className={inputClass} />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className={labelClass}>Senha *</Label>
                        <div className="relative">
                          <Input type={showPassword ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 6 caracteres" className={`${inputClass} pr-10`} />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-0 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors">
                            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className={labelClass}>Confirmar senha *</Label>
                        <Input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Repita a senha" className={inputClass} />
                      </div>
                      <Button type="button" onClick={() => { if (validateStep1()) setStep(2); }}
                        className="w-full h-12 rounded-xl text-sm font-semibold uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 hover:shadow-lg active:scale-[0.98]"
                      >
                        <span className="flex items-center justify-center gap-2">Próximo <ArrowRight className="w-4 h-4" /></span>
                      </Button>
                    </div>
                  )}

                  {/* Step 2 */}
                  {step === 2 && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <Label className={labelClass}>Cidade *</Label>
                          <Input value={city} onChange={e => setCity(e.target.value)} placeholder="Sua cidade" className={inputClass} />
                        </div>
                        <div className="space-y-1.5">
                          <Label className={labelClass}>Estado *</Label>
                          <Input value={state} onChange={e => setState(e.target.value)} placeholder="SP" maxLength={2} className={inputClass} />
                        </div>
                      </div>
                      <div className="space-y-1.5">
                        <Label className={labelClass}>Instagram / Perfil</Label>
                        <Input value={instagram} onChange={e => setInstagram(e.target.value)} placeholder="@seuperfil" className={inputClass} />
                      </div>
                      <div className="space-y-1.5">
                        <Label className={labelClass}>Experiência com vendas</Label>
                        <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                          <SelectTrigger className="h-12 bg-transparent border-0 border-b border-border rounded-none px-0 focus:ring-0">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="iniciante">Iniciante</SelectItem>
                            <SelectItem value="intermediario">Intermediário</SelectItem>
                            <SelectItem value="avancado">Avançado</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className={labelClass}>Como conheceu a {storeName || "Lizara"}?</Label>
                        <Select value={source} onValueChange={setSource}>
                          <SelectTrigger className="h-12 bg-transparent border-0 border-b border-border rounded-none px-0 focus:ring-0">
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="instagram">Instagram</SelectItem>
                            <SelectItem value="facebook">Facebook</SelectItem>
                            <SelectItem value="indicacao">Indicação</SelectItem>
                            <SelectItem value="google">Google</SelectItem>
                            <SelectItem value="outro">Outro</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1.5">
                        <Label className={labelClass}>Observações</Label>
                        <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Algo que queira nos contar..." className="bg-transparent border-0 border-b border-border rounded-none px-0 focus-visible:ring-0 focus-visible:border-primary resize-none min-h-[80px]" />
                      </div>
                      <div className="flex gap-3">
                        <Button type="button" variant="outline" onClick={() => setStep(1)}
                          className="flex-1 h-12 rounded-xl text-sm font-semibold uppercase tracking-widest active:scale-[0.98]"
                        >
                          <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
                        </Button>
                        <Button type="button" onClick={handleSubmit} disabled={loading}
                          className="flex-1 h-12 rounded-xl text-sm font-semibold uppercase tracking-widest bg-primary text-primary-foreground hover:bg-primary/90 transition-all duration-300 hover:shadow-lg active:scale-[0.98]"
                        >
                          <span className="flex items-center justify-center gap-2">
                            {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</> : <>Cadastrar <Sparkles className="w-4 h-4" /></>}
                          </span>
                        </Button>
                      </div>
                    </div>
                  )}

                  <div className="mt-6 pt-6 border-t border-border/60 text-center">
                    <button onClick={() => navigate("/auth")} className="text-sm text-muted-foreground hover:text-primary transition-colors">
                      Já tem conta? <span className="font-semibold">Faça login</span>
                    </button>
                  </div>
                </div>

                <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="text-center text-[10px] text-muted-foreground mt-6 tracking-widest uppercase">
                  <Diamond className="w-3 h-3 inline-block mr-1 -mt-0.5" /> Ambiente seguro e criptografado
                </motion.p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
