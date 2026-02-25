import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import {
  Instagram, Facebook, Twitter, Mail, Phone,
  ChevronDown, Shield, Truck, RefreshCw, Send, Clock,
  MessageCircle,
} from "lucide-react";
import { useStoreSettings } from "@/hooks/useStoreSettings";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "@/hooks/use-toast";

const trustCards = [
  { icon: Shield, title: "Compra Segura", text: "Pagamento 100% protegido" },
  { icon: Truck, title: "Envio Rastreado", text: "Acompanhe cada etapa" },
  { icon: RefreshCw, title: "Troca & Garantia", text: "30 dias para devolução" },
];

const institutionalLinks = [
  { label: "Sobre nós", to: "/sobre" },
  { label: "Contato", to: "/contato" },
  { label: "Trocas e Devoluções", to: "/politicas" },
  { label: "Política de Privacidade", to: "/politicas" },
  { label: "Termos de Uso", to: "/politicas" },
];

const serviceLinks = [
  { label: "WhatsApp", to: "#", icon: MessageCircle, external: true },
  { label: "contato@zenithsport.com", to: "mailto:contato@zenithsport.com", icon: Mail, external: true },
  { label: "Seg–Sex, 9h–18h", to: "#", icon: Clock, isText: true },
  { label: "Rastrear Pedido", to: "/rastreamento", icon: Truck },
];

const socials = [
  { Icon: Instagram, label: "Instagram" },
  { Icon: Facebook, label: "Facebook" },
  { Icon: Twitter, label: "Twitter" },
];

function FooterAccordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-white/10">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between py-4 text-left" aria-expanded={open}>
        <span className="font-display text-xs font-bold uppercase tracking-[0.15em] text-white/80">{title}</span>
        <ChevronDown className={`w-4 h-4 text-white/50 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ease-in-out ${open ? "max-h-96 pb-4" : "max-h-0"}`}>
        {children}
      </div>
    </div>
  );
}

function FooterNewsletter({ isMobile }: { isMobile: boolean }) {
  const [email, setEmail] = useState("");
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      toast({ title: "Cadastro realizado!", description: "Você receberá nossas novidades em breve." });
      setEmail("");
    }
  };

  return (
    <div>
      <h4 className="font-display text-xs font-bold uppercase tracking-[0.15em] text-white/80 mb-4">Receba Novidades</h4>
      <p className="font-sans text-[13px] text-white/50 mb-4 leading-relaxed">
        Cadastre-se e ganhe 10% de desconto na primeira compra.
      </p>
      <form onSubmit={handleSubmit} className={`flex gap-2 ${isMobile ? "flex-col" : ""}`}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Seu melhor email"
          required
          className="flex-1 h-11 px-4 rounded-lg bg-white/5 border border-white/15 text-white text-sm font-sans placeholder:text-white/30 focus:outline-none focus:border-accent/50 focus:ring-1 focus:ring-accent/20 transition-all"
        />
        <button type="submit" className="btn-neon h-11 px-6 rounded-lg text-white text-xs font-display inline-flex items-center gap-1.5">
          <Send className="w-3.5 h-3.5" /> ASSINAR
        </button>
      </form>
      <p className="font-sans text-[10px] text-white/30 mt-2.5">Sem spam. Cancele quando quiser.</p>
    </div>
  );
}

export function StoreFooter() {
  const { getSetting } = useStoreSettings();
  const storeName = getSetting("store_name", "Zenith Sport");
  const logoUrl = getSetting("logo_url", "");
  const contactCnpj = getSetting("contact_cnpj", "");
  const isMobile = useIsMobile();

  const footerRef = useRef<HTMLElement>(null);
  const isInView = useInView(footerRef, { once: true, margin: "-60px" });

  const fadeUp = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <footer ref={footerRef} className="relative">
      {/* Trust bar */}
      <div className="bg-card border-y border-border/50">
        <div className="container px-4 md:px-6">
          <div className="hidden md:grid md:grid-cols-3 divide-x divide-border/50">
            {trustCards.map((card, i) => (
              <motion.div
                key={card.title}
                variants={fadeUp}
                initial="hidden"
                animate={isInView ? "visible" : "hidden"}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="flex items-center gap-4 py-6 px-8 group cursor-default hover:-translate-y-0.5 transition-transform duration-300"
              >
                <div className="w-11 h-11 rounded-full bg-accent/10 flex items-center justify-center shrink-0 group-hover:bg-accent/20 transition-colors">
                  <card.icon className="w-5 h-5 text-accent" />
                </div>
                <div>
                  <p className="font-sans text-sm font-bold text-foreground/80">{card.title}</p>
                  <p className="font-sans text-xs text-muted-foreground">{card.text}</p>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="md:hidden flex gap-3 overflow-x-auto snap-x snap-mandatory py-4 -mx-4 px-4 no-scrollbar">
            {trustCards.map((card) => (
              <div key={card.title} className="flex items-center gap-3 bg-secondary rounded-xl border border-border/50 px-4 py-3.5 snap-center shrink-0 min-w-[210px]">
                <div className="w-9 h-9 rounded-full bg-accent/10 flex items-center justify-center shrink-0">
                  <card.icon className="w-4 h-4 text-accent" />
                </div>
                <div>
                  <p className="font-sans text-xs font-bold text-foreground/80">{card.title}</p>
                  <p className="font-sans text-[10px] text-muted-foreground">{card.text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main footer */}
      <div className="relative overflow-hidden bg-black">
        <div
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at 20% 50%, hsl(17 100% 50% / 0.15), transparent 60%)" }}
        />
        <div className="container relative z-10 px-4 md:px-6 pt-10 pb-8 md:pt-14 md:pb-10">
          <div className="hidden md:grid md:grid-cols-12 gap-8 lg:gap-12">
            {/* Brand */}
            <motion.div variants={fadeUp} initial="hidden" animate={isInView ? "visible" : "hidden"} transition={{ duration: 0.5, delay: 0.15 }} className="col-span-3">
              <div className="flex items-center gap-2.5 mb-4">
                {logoUrl ? (
                  <img src={logoUrl} alt={storeName} className="h-20 object-contain brightness-0 invert" />
                ) : (
                  <span className="font-display text-xl font-black uppercase tracking-wide text-white">
                    <span className="text-accent">ZENITH</span> SPORT
                  </span>
                )}
              </div>
              <p className="font-sans text-[13px] text-white/50 leading-relaxed mb-6 max-w-[220px]">
                Equipamentos esportivos de alta performance. Força e determinação em cada produto.
              </p>
              <div className="flex gap-2.5">
                {socials.map(({ Icon, label }) => (
                  <button key={label} aria-label={label} className="w-9 h-9 rounded-full border border-white/20 flex items-center justify-center text-white/50 hover:text-accent hover:border-accent/50 hover:bg-accent/5 transition-all duration-300">
                    <Icon className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </motion.div>

            {/* Institucional */}
            <motion.div variants={fadeUp} initial="hidden" animate={isInView ? "visible" : "hidden"} transition={{ duration: 0.5, delay: 0.25 }} className="col-span-3">
              <h4 className="font-display text-xs font-bold uppercase tracking-[0.15em] text-white/80 mb-5">Institucional</h4>
              <ul className="space-y-3">
                {institutionalLinks.map((link) => (
                  <li key={link.label}>
                    <Link to={link.to} className="font-sans text-[13px] text-white/50 hover:text-accent transition-colors">{link.label}</Link>
                  </li>
                ))}
              </ul>
            </motion.div>

            {/* Atendimento */}
            <motion.div variants={fadeUp} initial="hidden" animate={isInView ? "visible" : "hidden"} transition={{ duration: 0.5, delay: 0.35 }} className="col-span-3">
              <h4 className="font-display text-xs font-bold uppercase tracking-[0.15em] text-white/80 mb-5">Atendimento</h4>
              <ul className="space-y-3">
                {serviceLinks.map((link) => {
                  const content = (
                    <span className="flex items-center gap-2.5 font-sans text-[13px] text-white/50 hover:text-accent transition-colors">
                      {link.icon && <link.icon className="w-4 h-4 shrink-0 text-white/40" />}
                      {link.label}
                    </span>
                  );
                  if (link.isText) return <li key={link.label}><span className="flex items-center gap-2.5 font-sans text-[13px] text-white/50"><link.icon className="w-4 h-4 shrink-0 text-white/40" />{link.label}</span></li>;
                  if (link.external) return <li key={link.label}><a href={link.to} target="_blank" rel="noopener noreferrer">{content}</a></li>;
                  return <li key={link.label}><Link to={link.to}>{content}</Link></li>;
                })}
              </ul>
            </motion.div>

            {/* Newsletter */}
            <motion.div variants={fadeUp} initial="hidden" animate={isInView ? "visible" : "hidden"} transition={{ duration: 0.5, delay: 0.45 }} className="col-span-3">
              <FooterNewsletter isMobile={false} />
            </motion.div>
          </div>

          {/* Mobile */}
          <div className="md:hidden">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 mb-3">
                {logoUrl ? (
                  <img src={logoUrl} alt={storeName} className="h-16 object-contain brightness-0 invert" />
                ) : (
                  <span className="font-display text-xl font-black uppercase tracking-wide text-white">
                    <span className="text-accent">ZENITH</span> SPORT
                  </span>
                )}
              </div>
              <p className="font-sans text-sm text-white/50 max-w-[260px] mx-auto leading-relaxed">
                Equipamentos esportivos de alta performance.
              </p>
              <div className="flex gap-2.5 justify-center mt-4">
                {socials.map(({ Icon, label }) => (
                  <button key={label} aria-label={label} className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white/50 hover:text-accent transition-all">
                    <Icon className="w-4 h-4" />
                  </button>
                ))}
              </div>
            </div>

            <FooterAccordion title="Institucional">
              <ul className="space-y-1">
                {institutionalLinks.map((link) => (
                  <li key={link.label}><Link to={link.to} className="block py-2 font-sans text-sm text-white/50 hover:text-accent transition-colors">{link.label}</Link></li>
                ))}
              </ul>
            </FooterAccordion>

            <FooterAccordion title="Atendimento">
              <ul className="space-y-1">
                {serviceLinks.map((link) => (
                  <li key={link.label}>
                    {link.isText ? (
                      <span className="flex items-center gap-2 py-2 font-sans text-sm text-white/50"><link.icon className="w-4 h-4 text-white/40" />{link.label}</span>
                    ) : link.external ? (
                      <a href={link.to} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 py-2 font-sans text-sm text-white/50 hover:text-accent transition-colors"><link.icon className="w-4 h-4 text-white/40" />{link.label}</a>
                    ) : (
                      <Link to={link.to} className="flex items-center gap-2 py-2 font-sans text-sm text-white/50 hover:text-accent transition-colors"><link.icon className="w-4 h-4 text-white/40" />{link.label}</Link>
                    )}
                  </li>
                ))}
              </ul>
            </FooterAccordion>

            <FooterAccordion title="Newsletter">
              <FooterNewsletter isMobile={true} />
            </FooterAccordion>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="bg-black border-t border-white/5">
        <div className="container px-4 md:px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-sans text-[11px] text-white/40 text-center sm:text-left">
            © {new Date().getFullYear()} {storeName}. Todos os direitos reservados.
            {contactCnpj && <span className="ml-2">CNPJ: {contactCnpj}</span>}
          </p>
          <div className="flex items-center gap-3 text-[11px] font-sans text-white/40">
            <Link to="/politicas" className="hover:text-accent transition-colors">Privacidade</Link>
            <span className="text-white/10">|</span>
            <Link to="/politicas" className="hover:text-accent transition-colors">Termos</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
