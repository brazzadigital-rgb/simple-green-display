import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "@/hooks/use-toast";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { motion } from "framer-motion";
import {
  Send, Mail, Phone, MapPin, MessageCircle, Clock, Package,
  ShieldCheck, Headphones, Heart, Instagram, Facebook, ChevronRight,
  Loader2, CheckCircle2, HelpCircle,
} from "lucide-react";

const SUBJECTS = [
  "Dúvidas sobre produto",
  "Acompanhar pedido",
  "Trocas e devoluções",
  "Pagamento",
  "Atacado / Revenda",
  "Outro",
];

const FAQ_ITEMS = [
  {
    q: "Como rastrear meu pedido?",
    a: "Após o envio, você receberá um código de rastreio por e-mail. Também pode acessar a área 'Meus Pedidos' na sua conta para acompanhar em tempo real.",
  },
  {
    q: "Qual o prazo de entrega?",
    a: "O prazo varia conforme sua região. Em geral, de 3 a 10 dias úteis após a confirmação do pagamento. Frete expresso disponível para algumas localidades.",
  },
  {
    q: "Como funciona a troca ou devolução?",
    a: "Você tem até 7 dias após o recebimento para solicitar troca ou devolução. Entre em contato conosco e providenciaremos todo o processo sem burocracia.",
  },
  {
    q: "As peças possuem garantia?",
    a: "Sim! Todas as nossas peças possuem garantia contra defeitos de fabricação. O prazo varia conforme o material — consulte a descrição do produto.",
  },
  {
    q: "Quais as formas de pagamento?",
    a: "Aceitamos cartão de crédito (até 12x), Pix com desconto, boleto bancário e transferência. Parcelamento sem juros disponível em compras acima de R$ 200.",
  },
];

const fadeUp = (delay = 0) => ({
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5, delay, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] },
});

export default function ContactPage() {
  const { getSetting } = useStoreSettings();
  const [form, setForm] = useState({
    name: "",
    email: "",
    whatsapp: "",
    subject: "",
    order: "",
    message: "",
  });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  const whatsappNumber = getSetting("whatsapp_number", "(11) 99999-9999");
  const whatsappLink = `https://wa.me/${whatsappNumber.replace(/\D/g, "")}`;
  const contactEmail = getSetting("contact_email", "contato@minhalojaonline.com.br");
  const contactAddress = getSetting("contact_address", "São Paulo, SP – Brasil");
  const hoursWeekday = getSetting("contact_hours_weekday", "9h – 18h");
  const hoursSaturday = getSetting("contact_hours_saturday", "9h – 13h");
  const hoursSunday = getSetting("contact_hours_sunday", "Fechado");
  const instagramLink = getSetting("contact_instagram", "");
  const facebookLink = getSetting("contact_facebook", "");
  const contactCnpj = getSetting("contact_cnpj", "");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast({ title: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }
    setSending(true);
    await new Promise((r) => setTimeout(r, 1200));
    toast({ title: "Mensagem enviada com sucesso ✉️", description: "Retornaremos em breve." });
    setForm({ name: "", email: "", whatsapp: "", subject: "", order: "", message: "" });
    setSending(false);
    setSent(true);
    setTimeout(() => setSent(false), 4000);
  };

  const update = (key: string, value: string) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div className="min-h-screen">
      {/* ── Hero ──────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-muted/60 via-background to-muted/40">
        <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E\")" }} />
        <div className="container relative py-12 md:py-20">
          <motion.div {...fadeUp(0)} className="max-w-2xl">
            <p className="font-sans text-xs font-semibold uppercase tracking-[0.2em] text-accent mb-3">Atendimento</p>
            <h1 className="font-display text-3xl md:text-5xl font-bold tracking-tight mb-4">
              Fale com a gente
            </h1>
            <p className="font-sans text-base md:text-lg text-muted-foreground leading-relaxed max-w-lg">
              Estamos aqui para ajudar com pedidos, trocas, dúvidas e atendimento personalizado.
            </p>
          </motion.div>
          <motion.div {...fadeUp(0.15)} className="flex flex-wrap gap-2.5 mt-6">
            {[
              { icon: Headphones, label: "Atendimento rápido" },
              { icon: ShieldCheck, label: "Compra segura" },
              { icon: Heart, label: "Suporte humanizado" },
            ].map((chip) => (
              <div
                key={chip.label}
                className="flex items-center gap-2 px-4 py-2 rounded-full bg-card border border-border/50 shadow-sm"
              >
                <chip.icon className="w-3.5 h-3.5 text-accent" />
                <span className="font-sans text-xs font-medium text-foreground/80">{chip.label}</span>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ── Main Content ──────────────────────── */}
      <section className="container py-10 md:py-16">
        <div className="grid lg:grid-cols-5 gap-8 lg:gap-12">
          {/* ── Form Column ── */}
          <motion.div {...fadeUp(0.1)} className="lg:col-span-3">
            <div className="bg-card rounded-2xl border border-border/40 shadow-[0_4px_24px_-4px_rgba(0,0,0,0.06)] p-6 md:p-8">
              <h2 className="font-display text-xl font-bold mb-1">Envie sua mensagem</h2>
              <p className="font-sans text-sm text-muted-foreground mb-6">
                Preencha o formulário e responderemos o mais rápido possível.
              </p>

              {sent ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center justify-center py-16 text-center"
                >
                  <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-8 h-8 text-success" />
                  </div>
                  <h3 className="font-display text-lg font-bold mb-1">Mensagem enviada!</h3>
                  <p className="font-sans text-sm text-muted-foreground max-w-xs">
                    Recebemos sua mensagem e entraremos em contato em breve.
                  </p>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="font-sans text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Nome <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        value={form.name}
                        onChange={(e) => update("name", e.target.value)}
                        className="h-11 rounded-xl bg-muted/30 border-border/50 focus:bg-card transition-colors"
                        placeholder="Seu nome completo"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="font-sans text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        E-mail <span className="text-destructive">*</span>
                      </Label>
                      <Input
                        type="email"
                        value={form.email}
                        onChange={(e) => update("email", e.target.value)}
                        className="h-11 rounded-xl bg-muted/30 border-border/50 focus:bg-card transition-colors"
                        placeholder="seu@email.com"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="font-sans text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        WhatsApp
                      </Label>
                      <Input
                        value={form.whatsapp}
                        onChange={(e) => update("whatsapp", e.target.value)}
                        className="h-11 rounded-xl bg-muted/30 border-border/50 focus:bg-card transition-colors"
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="font-sans text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        Assunto
                      </Label>
                      <Select value={form.subject} onValueChange={(v) => update("subject", v)}>
                        <SelectTrigger className="h-11 rounded-xl bg-muted/30 border-border/50 focus:bg-card transition-colors">
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          {SUBJECTS.map((s) => (
                            <SelectItem key={s} value={s}>{s}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-sans text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Nº do Pedido <span className="text-muted-foreground/60">(opcional)</span>
                    </Label>
                    <Input
                      value={form.order}
                      onChange={(e) => update("order", e.target.value)}
                      className="h-11 rounded-xl bg-muted/30 border-border/50 focus:bg-card transition-colors"
                      placeholder="Ex: #12345"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="font-sans text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Mensagem <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      value={form.message}
                      onChange={(e) => update("message", e.target.value)}
                      rows={5}
                      className="rounded-xl bg-muted/30 border-border/50 focus:bg-card transition-colors resize-none"
                      placeholder="Como podemos ajudar?"
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={sending}
                    className="w-full h-12 rounded-xl font-sans font-bold text-sm gap-2 bg-accent text-accent-foreground hover:brightness-110 active:scale-[0.98] transition-all shadow-md hover:shadow-lg"
                  >
                    {sending ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
                    ) : (
                      <><Send className="w-4 h-4" /> Enviar mensagem</>
                    )}
                  </Button>
                </form>
              )}
            </div>
          </motion.div>

          {/* ── Sidebar Column ── */}
          <div className="lg:col-span-2 space-y-4">
            {/* WhatsApp */}
            <motion.div {...fadeUp(0.15)}>
              <div className="bg-card rounded-2xl border border-border/40 shadow-[0_2px_16px_-4px_rgba(0,0,0,0.05)] p-5 hover:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.08)] transition-shadow duration-300">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-[hsl(142,71%,45%)]/10 flex items-center justify-center">
                    <MessageCircle className="w-5 h-5 text-success" />
                  </div>
                  <div>
                    <p className="font-sans font-semibold text-sm">WhatsApp</p>
                    <p className="font-sans text-xs text-muted-foreground">{whatsappNumber}</p>
                  </div>
                </div>
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full h-10 rounded-xl bg-success text-success-foreground font-sans text-sm font-bold hover:brightness-110 active:scale-[0.97] transition-all"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.612.616l4.524-1.478A11.94 11.94 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.3 0-4.438-.764-6.152-2.054l-.43-.338-2.684.877.894-2.636-.37-.448A9.96 9.96 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z" />
                  </svg>
                  Chamar no WhatsApp
                </a>
                <p className="font-sans text-[11px] text-muted-foreground mt-2.5 text-center">
                  Seg a Sex: {hoursWeekday} · Sáb: {hoursSaturday}
                </p>
              </div>
            </motion.div>

            {/* Email */}
            <motion.div {...fadeUp(0.2)}>
              <div className="bg-card rounded-2xl border border-border/40 shadow-[0_2px_16px_-4px_rgba(0,0,0,0.05)] p-5 hover:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.08)] transition-shadow duration-300">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center">
                    <Mail className="w-5 h-5 text-accent" />
                  </div>
                  <div>
                    <p className="font-sans font-semibold text-sm">E-mail</p>
                    <a
                      href={`mailto:${contactEmail}`}
                      className="font-sans text-xs text-accent hover:underline"
                    >
                      {contactEmail}
                    </a>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Rastreio */}
            <motion.div {...fadeUp(0.25)}>
              <div className="bg-card rounded-2xl border border-border/40 shadow-[0_2px_16px_-4px_rgba(0,0,0,0.05)] p-5 hover:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.08)] transition-shadow duration-300">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                    <Package className="w-5 h-5 text-warning" />
                  </div>
                  <div>
                    <p className="font-sans font-semibold text-sm">Rastrear Pedido</p>
                    <p className="font-sans text-xs text-muted-foreground">Acompanhe sua entrega</p>
                  </div>
                </div>
                <a
                  href="/rastreamento"
                  className="flex items-center justify-center gap-2 w-full h-10 rounded-xl border border-border/60 bg-muted/30 font-sans text-sm font-medium hover:bg-muted/60 active:scale-[0.97] transition-all"
                >
                  Rastrear pedido <ChevronRight className="w-4 h-4" />
                </a>
              </div>
            </motion.div>

            {/* Horários */}
            <motion.div {...fadeUp(0.3)}>
              <div className="bg-card rounded-2xl border border-border/40 shadow-[0_2px_16px_-4px_rgba(0,0,0,0.05)] p-5 hover:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.08)] transition-shadow duration-300">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                    <Clock className="w-5 h-5 text-foreground/60" />
                  </div>
                  <p className="font-sans font-semibold text-sm">Horário de Atendimento</p>
                </div>
                <div className="space-y-1.5 font-sans text-sm text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Segunda a Sexta</span>
                    <span className="font-medium text-foreground/70">{hoursWeekday}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Sábado</span>
                    <span className="font-medium text-foreground/70">{hoursSaturday}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Domingo e Feriados</span>
                    <span className="font-medium text-foreground/70">{hoursSunday}</span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Endereço */}
            <motion.div {...fadeUp(0.35)}>
              <div className="bg-card rounded-2xl border border-border/40 shadow-[0_2px_16px_-4px_rgba(0,0,0,0.05)] p-5 hover:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.08)] transition-shadow duration-300">
                <div className="flex items-center gap-3 mb-1">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-foreground/60" />
                  </div>
                  <div>
                    <p className="font-sans font-semibold text-sm">Endereço</p>
                    <p className="font-sans text-xs text-muted-foreground">{contactAddress}</p>
                    {contactCnpj && (
                      <p className="font-sans text-xs text-muted-foreground mt-0.5">CNPJ: {contactCnpj}</p>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Redes Sociais */}
            <motion.div {...fadeUp(0.4)}>
              <div className="bg-card rounded-2xl border border-border/40 shadow-[0_2px_16px_-4px_rgba(0,0,0,0.05)] p-5 hover:shadow-[0_4px_24px_-4px_rgba(0,0,0,0.08)] transition-shadow duration-300">
                <p className="font-sans font-semibold text-sm mb-3">Redes Sociais</p>
                <div className="flex gap-2">
                  {[
                    { icon: Instagram, href: instagramLink || "#", label: "Instagram" },
                    { icon: Facebook, href: facebookLink || "#", label: "Facebook" },
                  ].filter(s => s.href !== "#" || !instagramLink && !facebookLink).map((social) => (
                    <a
                      key={social.label}
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-10 h-10 rounded-xl border border-border/50 flex items-center justify-center hover:bg-accent/10 hover:border-accent/30 hover:text-accent transition-all duration-200"
                      aria-label={social.label}
                    >
                      <social.icon className="w-4 h-4" />
                    </a>
                  ))}
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ── FAQ Section ───────────────────────── */}
      <section className="bg-muted/30 border-t border-border/30">
        <div className="container py-12 md:py-16">
          <motion.div {...fadeUp(0)} className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 mb-3">
              <HelpCircle className="w-3.5 h-3.5 text-accent" />
              <span className="font-sans text-xs font-semibold text-accent uppercase tracking-wider">Dúvidas</span>
            </div>
            <h2 className="font-display text-2xl md:text-3xl font-bold">Perguntas Frequentes</h2>
            <p className="font-sans text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              Encontre respostas rápidas para as perguntas mais comuns.
            </p>
          </motion.div>

          <motion.div {...fadeUp(0.1)} className="max-w-2xl mx-auto">
            <Accordion type="single" collapsible className="space-y-2">
              {FAQ_ITEMS.map((item, i) => (
                <AccordionItem
                  key={i}
                  value={`faq-${i}`}
                  className="bg-card rounded-xl border border-border/40 px-5 shadow-sm data-[state=open]:shadow-md transition-shadow"
                >
                  <AccordionTrigger className="font-sans text-sm font-semibold py-4 hover:no-underline text-left [&>svg]:text-accent">
                    {item.q}
                  </AccordionTrigger>
                  <AccordionContent className="font-sans text-sm text-muted-foreground leading-relaxed pb-4">
                    {item.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
