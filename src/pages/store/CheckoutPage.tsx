import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useCart } from "@/hooks/useCart";
import { useSellerReferral } from "@/hooks/useSellerReferral";
import { getFirstTouch, getLastTouch } from "@/hooks/useUtmCapture";
import { useCepLookup } from "@/hooks/useCepLookup";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingBag, User, MapPin, CreditCard, Check, ChevronRight,
  Loader2, Lock, ArrowLeft, Tag, UserCheck, Truck
} from "lucide-react";
import ShippingCalculator from "@/components/store/ShippingCalculator";

type Step = "identification" | "address" | "payment" | "confirmation";

interface CustomerInfo {
  name: string;
  email: string;
  phone: string;
}

interface AddressInfo {
  zip_code: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
}

interface SavedAddress extends AddressInfo {
  id: string;
  label: string;
  recipient_name: string;
}

const STEPS: { key: Step; label: string; icon: React.ReactNode }[] = [
  { key: "identification", label: "Identificação", icon: <User className="w-4 h-4" /> },
  { key: "address", label: "Endereço", icon: <MapPin className="w-4 h-4" /> },
  { key: "payment", label: "Pagamento", icon: <CreditCard className="w-4 h-4" /> },
  { key: "confirmation", label: "Confirmação", icon: <Check className="w-4 h-4" /> },
];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { items, subtotal, clearCart } = useCart();
  const { getReferralCode, clearReferral } = useSellerReferral();
  const { lookup: lookupCep, loading: cepLoading } = useCepLookup();
  const [step, setStep] = useState<Step>("identification");
  const [loading, setLoading] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState("");
  const [applyingCoupon, setApplyingCoupon] = useState(false);
  const [sellerCode, setSellerCode] = useState(getReferralCode() || "");
  const [sellerVerified, setSellerVerified] = useState(false);
  const [sellerName, setSellerName] = useState("");
   const [saveAsDefault, setSaveAsDefault] = useState(false);
   const [selectedShipping, setSelectedShipping] = useState<any>(null);

  const [customer, setCustomer] = useState<CustomerInfo>({ name: "", email: "", phone: "" });
  const [address, setAddress] = useState<AddressInfo>({
    zip_code: "", street: "", number: "", complement: "", neighborhood: "", city: "", state: ""
  });
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("pix");

  const shippingCost = selectedShipping?.price || 0;
  const total = subtotal - couponDiscount + shippingCost;
  const pixDiscount = paymentMethod === "pix" ? total * 0.05 : 0;
  const finalTotal = total - pixDiscount;

  // Build shipping items from cart
  const shippingItems = items.map(item => {
    const meta = item.metadata_json as any;
    const variantsDetail = meta?.variants_detail;
    let itemPrice = item.variant?.price ?? item.product?.price ?? 0;
    if (variantsDetail && variantsDetail.length > 0) {
      itemPrice = variantsDetail.reduce((s: number, v: any) => s + (v.price ? Number(v.price) : 0), 0) || itemPrice;
    }
    return {
      weight: (item.product as any)?.shipping_weight || 0,
      width: (item.product as any)?.shipping_width || 0,
      height: (item.product as any)?.shipping_height || 0,
      length: (item.product as any)?.shipping_length || 0,
      quantity: item.quantity,
      price: itemPrice,
    };
  });

  // Redirect if empty cart
  useEffect(() => {
    if (items.length === 0 && step !== "confirmation") {
      navigate("/carrinho");
    }
  }, [items, step, navigate]);

  // Redirect if not logged in
  useEffect(() => {
    if (!user) navigate("/auth?redirect=/checkout");
  }, [user, navigate]);

  // Auto-verify referral code from cookie
  useEffect(() => {
    if (sellerCode && !sellerVerified) {
      verifySeller(sellerCode);
    }
  }, []);

  const verifySeller = async (code: string) => {
    if (!code.trim()) { setSellerVerified(false); setSellerName(""); return; }
    const { data } = await supabase
      .from("sellers")
      .select("name, referral_code")
      .eq("referral_code", code.trim())
      .eq("status", "active")
      .maybeSingle();
    if (data) {
      setSellerVerified(true);
      setSellerName(data.name);
      setSellerCode(data.referral_code);
    } else {
      setSellerVerified(false);
      setSellerName("");
    }
  };

  // Load profile and addresses
  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [profileRes, addressesRes] = await Promise.all([
        supabase.from("profiles").select("full_name, phone").eq("user_id", user.id).maybeSingle(),
        supabase.from("customer_addresses").select("*").eq("user_id", user.id).order("is_default", { ascending: false }),
      ]);
      if (profileRes.data) {
        setCustomer(prev => ({
          ...prev,
          name: profileRes.data.full_name || "",
          email: user.email || "",
          phone: profileRes.data.phone || "",
        }));
      }
      if (addressesRes.data) {
        setSavedAddresses(addressesRes.data as SavedAddress[]);
        const defaultAddr = addressesRes.data.find((a: any) => a.is_default);
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr.id);
          setAddress({
            zip_code: defaultAddr.zip_code,
            street: defaultAddr.street,
            number: defaultAddr.number,
            complement: defaultAddr.complement || "",
            neighborhood: defaultAddr.neighborhood,
            city: defaultAddr.city,
            state: defaultAddr.state,
          });
        }
      }
    };
    load();
  }, [user]);

  const stepIndex = STEPS.findIndex(s => s.key === step);

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setApplyingCoupon(true);
    const { data } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", couponCode.trim().toUpperCase())
      .eq("is_active", true)
      .maybeSingle();

    if (!data) {
      toast({ title: "Cupom inválido", variant: "destructive" });
      setApplyingCoupon(false);
      return;
    }
    if (data.min_order_value && subtotal < Number(data.min_order_value)) {
      toast({ title: `Pedido mínimo de R$ ${Number(data.min_order_value).toFixed(2)}`, variant: "destructive" });
      setApplyingCoupon(false);
      return;
    }
    if (data.max_uses && data.used_count >= data.max_uses) {
      toast({ title: "Cupom esgotado", variant: "destructive" });
      setApplyingCoupon(false);
      return;
    }
    const discount = data.discount_type === "percentage"
      ? subtotal * (Number(data.discount_value) / 100)
      : Number(data.discount_value);
    setCouponDiscount(Math.min(discount, subtotal));
    setCouponApplied(data.code);
    toast({ title: `Cupom ${data.code} aplicado! 🎉` });
    setApplyingCoupon(false);
  };

  const nextStep = () => {
    const i = stepIndex;
    if (i < STEPS.length - 1) setStep(STEPS[i + 1].key);
  };
  const prevStep = () => {
    const i = stepIndex;
    if (i > 0) setStep(STEPS[i - 1].key);
  };

  const canProceed = () => {
    if (step === "identification") return customer.name && customer.email && customer.phone;
    if (step === "address") return address.zip_code && address.street && address.number && address.neighborhood && address.city && address.state;
    if (step === "payment") return !!paymentMethod;
    return false;
  };

  const [paymentData, setPaymentData] = useState<any>(null);

  const placeOrder = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;
      const firstTouch = getFirstTouch();
      const lastTouch = getLastTouch();
      const activeTouch = lastTouch || firstTouch;
      const { data: order, error } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          order_number: orderNumber,
          customer_name: customer.name,
          customer_email: customer.email,
          customer_phone: customer.phone,
          shipping_address: address as any,
          subtotal,
          discount: couponDiscount + pixDiscount,
          shipping_cost: shippingCost,
          shipping_price: shippingCost,
          shipping_method_name: selectedShipping?.name || null,
          shipping_service_code: selectedShipping?.service_code || null,
          shipping_days: selectedShipping?.delivery_max || null,
          shipping_provider: selectedShipping?.company || null,
          total: finalTotal,
          payment_method: paymentMethod,
          payment_status: "pending",
          status: "pending",
          referral_code: sellerVerified ? sellerCode : null,
          utm_source: activeTouch?.utm_source || null,
          utm_medium: activeTouch?.utm_medium || null,
          utm_campaign: activeTouch?.utm_campaign || null,
          utm_content: activeTouch?.utm_content || null,
          utm_term: activeTouch?.utm_term || null,
          fbclid: activeTouch?.fbclid || null,
          gclid: activeTouch?.gclid || null,
          landing_page: activeTouch?.landing_page || null,
          tracking_first_touch_json: firstTouch || null,
          tracking_last_touch_json: lastTouch || null,
        } as any)
        .select("id")
        .single();

      if (error || !order) throw error;

      const orderItems = items.map(item => {
        const meta = item.metadata_json as any;
        const variantsDetail = meta?.variants_detail;
        let unitPrice = item.variant?.price ?? item.product?.price ?? 0;
        let variantName = item.variant?.name || null;
        
        if (variantsDetail && variantsDetail.length > 0) {
          unitPrice = variantsDetail.reduce((s: number, v: any) => s + (v.price ? Number(v.price) : 0), 0) || unitPrice;
          variantName = variantsDetail.map((v: any) => `${v.group}: ${v.name}`).join(" | ");
        }
        
        return {
          order_id: order.id,
          product_id: item.product_id,
          variant_id: item.variant_id,
          product_name: item.product?.name || "Produto",
          variant_name: variantName,
          quantity: item.quantity,
          unit_price: unitPrice,
          total_price: unitPrice * item.quantity,
          variants_detail_json: variantsDetail || null,
        };
      });

      await supabase.from("order_items").insert(orderItems as any);

      // Increment coupon usage
      if (couponApplied) {
        const { data: couponData } = await supabase
          .from("coupons")
          .select("id, used_count")
          .eq("code", couponApplied)
          .maybeSingle();
      }

      // Save address as default if requested
      if (saveAsDefault && !selectedAddressId) {
        await supabase.from("customer_addresses").update({ is_default: false } as any).eq("user_id", user.id);
        await supabase.from("customer_addresses").insert({
          user_id: user.id,
          label: "Casa",
          recipient_name: customer.name,
          zip_code: address.zip_code,
          street: address.street,
          number: address.number,
          complement: address.complement || null,
          neighborhood: address.neighborhood,
          city: address.city,
          state: address.state,
          is_default: true,
        } as any);
      } else if (saveAsDefault && selectedAddressId) {
        await supabase.from("customer_addresses").update({ is_default: false } as any).eq("user_id", user.id);
        await supabase.from("customer_addresses").update({ is_default: true } as any).eq("id", selectedAddressId);
      }

      // Create payment via edge function
      try {
        const { data: pmtData, error: pmtError } = await supabase.functions.invoke("create-payment", {
          body: {
            order_id: order.id,
            method: paymentMethod,
            customer: {
              name: customer.name,
              email: customer.email,
              phone: customer.phone,
            },
          },
        });

        if (pmtError) {
          console.error("Payment creation error:", pmtError);
          // Still proceed — order was created, payment can be retried
        } else if (pmtData) {
          setPaymentData(pmtData);

          // If provider requires redirect (e.g. Stripe checkout URL)
          if (pmtData.checkout_url && paymentMethod === "card" && pmtData.provider === "stripe") {
            await clearCart();
            window.location.href = pmtData.checkout_url;
            return;
          }
        }
      } catch (pmtErr) {
        console.error("Payment function error:", pmtErr);
        // Order still created successfully
      }

      setStep("confirmation");
      await clearCart();
      toast({ title: "Pedido realizado com sucesso! 🎉" });
    } catch (err) {
      console.error(err);
      toast({ title: "Erro ao criar pedido", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const selectSavedAddress = (addr: SavedAddress) => {
    setSelectedAddressId(addr.id);
    setAddress({
      zip_code: addr.zip_code, street: addr.street, number: addr.number,
      complement: addr.complement || "", neighborhood: addr.neighborhood,
      city: addr.city, state: addr.state,
    });
  };

  const getItemImage = (item: any) => {
    const primary = item.product?.product_images?.find((i: any) => i.is_primary);
    return primary?.url || item.product?.product_images?.[0]?.url || "/placeholder.svg";
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado! 📋" });
  };

  if (step === "confirmation") {
    return (
      <div className="container max-w-2xl py-16 text-center relative overflow-hidden">
        {/* Confetti particles */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {Array.from({ length: 24 }).map((_, i) => (
            <motion.div
              key={i}
              className="absolute w-2 h-2 rounded-full"
              style={{
                left: `${10 + Math.random() * 80}%`,
                top: `-5%`,
                backgroundColor: [
                  'hsl(var(--accent))',
                  'hsl(var(--primary))',
                  'hsl(var(--success))',
                  '#FFD700',
                  '#FF6B6B',
                  '#4ECDC4',
                ][i % 6],
              }}
              initial={{ y: 0, opacity: 1, scale: 0 }}
              animate={{
                y: [0, 400 + Math.random() * 300],
                x: [0, (Math.random() - 0.5) * 200],
                opacity: [0, 1, 1, 0],
                scale: [0, 1, 1, 0.5],
                rotate: [0, Math.random() * 720],
              }}
              transition={{
                duration: 2 + Math.random() * 1.5,
                delay: 0.2 + Math.random() * 0.8,
                ease: "easeOut",
              }}
            />
          ))}
        </div>

        {/* Success ring animation */}
        <div className="relative w-28 h-28 mx-auto mb-8">
          <motion.div
            className="absolute inset-0 rounded-full border-4 border-success/30"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.4, 1], opacity: [0, 0.5, 0] }}
            transition={{ duration: 1, delay: 0.3, ease: "easeOut" }}
          />
          <motion.div
            className="absolute inset-0 rounded-full border-4 border-success/20"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: [0, 1.8, 1.2], opacity: [0, 0.3, 0] }}
            transition={{ duration: 1.2, delay: 0.5, ease: "easeOut" }}
          />
          <motion.div
            className="absolute inset-0 rounded-full bg-success/10 flex items-center justify-center"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 200, damping: 12, delay: 0.1 }}
          >
            <motion.div
              initial={{ scale: 0, rotate: -45 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 250, damping: 15, delay: 0.4 }}
            >
              <Check className="w-12 h-12 text-success" strokeWidth={3} />
            </motion.div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6, duration: 0.5 }}
        >
          <h1 className="font-display text-3xl font-bold mb-2">Pedido confirmado! 🎉</h1>
          <p className="text-muted-foreground font-sans mb-8">Você receberá atualizações por e-mail sobre o status do seu pedido.</p>
        </motion.div>

        {/* Payment details */}
        {paymentData && paymentData.method === "pix" && paymentData.qr_code && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
            <Card className="border-0 shadow-premium mb-8 text-left">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-display text-lg font-bold flex items-center gap-2">
                  💳 Pague via PIX
                </h3>
                {paymentData.qr_code_image_url && (
                  <div className="flex justify-center">
                    <img src={paymentData.qr_code_image_url} alt="QR Code PIX" className="w-48 h-48 rounded-xl" />
                  </div>
                )}
                <div className="space-y-2">
                  <Label className="font-sans text-sm text-muted-foreground">Código PIX (copia e cola)</Label>
                  <div className="flex gap-2">
                    <Input value={paymentData.qr_code} readOnly className="rounded-xl h-10 font-sans text-xs" />
                    <Button variant="outline" size="sm" className="rounded-xl shrink-0" onClick={() => copyToClipboard(paymentData.qr_code)}>
                      Copiar
                    </Button>
                  </div>
                </div>
                {paymentData.expires_at && (
                  <p className="font-sans text-xs text-muted-foreground">
                    ⏰ Expira em: {new Date(paymentData.expires_at).toLocaleString("pt-BR")}
                  </p>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

        {paymentData && paymentData.method === "boleto" && paymentData.boleto_url && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}>
            <Card className="border-0 shadow-premium mb-8 text-left">
              <CardContent className="p-6 space-y-4">
                <h3 className="font-display text-lg font-bold">📄 Boleto Bancário</h3>
                <Button asChild className="rounded-xl shine font-sans w-full h-12">
                  <a href={paymentData.boleto_url} target="_blank" rel="noopener noreferrer">
                    Abrir Boleto
                  </a>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        )}

        <motion.div
          className="flex gap-4 justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
        >
          <Button asChild variant="outline" className="rounded-xl font-sans h-12">
            <a href="/conta/pedidos">Ver meus pedidos</a>
          </Button>
          <Button asChild className="rounded-xl font-sans h-12 shine">
            <a href="/">Continuar comprando</a>
          </Button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="container px-4 md:px-6 py-6 md:py-12 max-w-6xl">
      {/* Premium Stepper */}
      <div className="flex items-center justify-center gap-0 mb-8 md:mb-12 px-2">
        {STEPS.map((s, i) => {
          const isActive = i === stepIndex;
          const isCompleted = i < stepIndex;
          const isPending = i > stepIndex;

          return (
            <div key={s.key} className="flex items-center">
              <motion.button
                onClick={() => isCompleted && setStep(s.key)}
                disabled={isPending}
                className={`relative flex items-center gap-2 px-3 sm:px-5 py-2.5 sm:py-3 rounded-2xl font-sans text-xs sm:text-sm font-semibold transition-all duration-300 ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-lg"
                    : isCompleted
                      ? "bg-primary/10 text-primary cursor-pointer hover:bg-primary/20"
                      : "bg-muted/60 text-muted-foreground/50"
                }`}
                layout
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                whileTap={isCompleted ? { scale: 0.95 } : undefined}
              >
                {/* Animated glow ring for active */}
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-2xl border-2 border-primary/30"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: [0.4, 0.8, 0.4], scale: [0.98, 1.02, 0.98] }}
                    transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
                  />
                )}

                {/* Icon */}
                <motion.span
                  className="relative z-10"
                  initial={false}
                  animate={isCompleted ? { rotate: [0, -10, 10, 0] } : { rotate: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  {isCompleted ? <Check className="w-4 h-4" /> : s.icon}
                </motion.span>

                {/* Label — visible on sm+ */}
                <span className="hidden sm:inline relative z-10">{s.label}</span>

                {/* Active shimmer */}
                {isActive && (
                  <motion.div
                    className="absolute inset-0 rounded-2xl overflow-hidden pointer-events-none"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <motion.div
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-white/15 to-transparent"
                      animate={{ x: ["-100%", "200%"] }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 3, ease: "easeInOut" }}
                    />
                  </motion.div>
                )}
              </motion.button>

              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div className="relative w-6 sm:w-10 h-[2px] mx-0.5">
                  <div className="absolute inset-0 bg-border rounded-full" />
                  <motion.div
                    className="absolute inset-y-0 left-0 bg-primary rounded-full"
                    initial={{ width: "0%" }}
                    animate={{ width: isCompleted ? "100%" : "0%" }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
        {/* Main content */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {step === "identification" && (
                <Card className="border-0 shadow-premium">
                  <CardContent className="p-6 space-y-5">
                    <h2 className="font-display text-xl font-bold flex items-center gap-2"><User className="w-5 h-5" /> Identificação</h2>
                    <div className="space-y-4">
                      <div>
                        <Label className="font-sans text-sm">Nome completo</Label>
                        <Input value={customer.name} onChange={e => setCustomer({ ...customer, name: e.target.value })} placeholder="Seu nome" className="mt-1 rounded-xl h-12 font-sans" />
                      </div>
                      <div>
                        <Label className="font-sans text-sm">E-mail</Label>
                        <Input value={customer.email} onChange={e => setCustomer({ ...customer, email: e.target.value })} placeholder="email@exemplo.com" type="email" className="mt-1 rounded-xl h-12 font-sans" />
                      </div>
                      <div>
                        <Label className="font-sans text-sm">Telefone</Label>
                        <Input value={customer.phone} onChange={e => setCustomer({ ...customer, phone: e.target.value })} placeholder="(11) 99999-9999" className="mt-1 rounded-xl h-12 font-sans" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {step === "address" && (
                <Card className="border-0 shadow-premium">
                  <CardContent className="p-6 space-y-5">
                    <h2 className="font-display text-xl font-bold flex items-center gap-2"><MapPin className="w-5 h-5" /> Endereço de entrega</h2>

                    {savedAddresses.length > 0 && (
                      <div className="space-y-2">
                        <Label className="font-sans text-sm text-muted-foreground">Endereços salvos</Label>
                        <div className="grid gap-2">
                          {savedAddresses.map(addr => (
                            <button
                              key={addr.id}
                              onClick={() => selectSavedAddress(addr)}
                              className={`text-left p-3 rounded-xl border transition-all font-sans text-sm ${
                                selectedAddressId === addr.id
                                  ? "border-accent bg-accent/5"
                                  : "border-border hover:border-accent/50"
                              }`}
                            >
                              <span className="font-semibold">{addr.label}</span> — {addr.street}, {addr.number} - {addr.neighborhood}, {addr.city}/{addr.state}
                            </button>
                          ))}
                        </div>
                        <Separator className="my-4" />
                        <p className="font-sans text-sm text-muted-foreground">Ou preencha um novo endereço:</p>
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="relative">
                        <Label className="font-sans text-sm">CEP</Label>
                        <Input value={address.zip_code} onChange={e => { setAddress({ ...address, zip_code: e.target.value }); setSelectedAddressId(null); }} onBlur={async () => { const r = await lookupCep(address.zip_code); if (r) { setAddress(p => ({ ...p, ...r })); setSelectedAddressId(null); } }} placeholder="00000-000" className="mt-1 rounded-xl h-12 font-sans" />
                        {cepLoading && <Loader2 className="absolute right-3 top-9 w-4 h-4 animate-spin text-muted-foreground" />}
                      </div>
                      <div className="sm:col-span-2">
                        <Label className="font-sans text-sm">Rua</Label>
                        <Input value={address.street} onChange={e => { setAddress({ ...address, street: e.target.value }); setSelectedAddressId(null); }} placeholder="Rua, Avenida..." className="mt-1 rounded-xl h-12 font-sans" />
                      </div>
                      <div>
                        <Label className="font-sans text-sm">Número</Label>
                        <Input value={address.number} onChange={e => { setAddress({ ...address, number: e.target.value }); setSelectedAddressId(null); }} placeholder="123" className="mt-1 rounded-xl h-12 font-sans" />
                      </div>
                      <div>
                        <Label className="font-sans text-sm">Complemento</Label>
                        <Input value={address.complement} onChange={e => setAddress({ ...address, complement: e.target.value })} placeholder="Apto, bloco..." className="mt-1 rounded-xl h-12 font-sans" />
                      </div>
                      <div>
                        <Label className="font-sans text-sm">Bairro</Label>
                        <Input value={address.neighborhood} onChange={e => { setAddress({ ...address, neighborhood: e.target.value }); setSelectedAddressId(null); }} placeholder="Bairro" className="mt-1 rounded-xl h-12 font-sans" />
                      </div>
                      <div>
                        <Label className="font-sans text-sm">Cidade</Label>
                        <Input value={address.city} onChange={e => { setAddress({ ...address, city: e.target.value }); setSelectedAddressId(null); }} placeholder="Cidade" className="mt-1 rounded-xl h-12 font-sans" />
                      </div>
                      <div>
                        <Label className="font-sans text-sm">Estado</Label>
                        <Input value={address.state} onChange={e => { setAddress({ ...address, state: e.target.value }); setSelectedAddressId(null); }} placeholder="SP" maxLength={2} className="mt-1 rounded-xl h-12 font-sans" />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2 pt-2">
                      <Checkbox id="saveDefault" checked={saveAsDefault} onCheckedChange={(v) => setSaveAsDefault(v === true)} />
                      <label htmlFor="saveDefault" className="font-sans text-sm cursor-pointer">Salvar como endereço principal</label>
                    </div>

                    {/* Shipping Calculator */}
                    {address.zip_code && address.zip_code.replace(/\D/g, "").length >= 5 && (
                      <div className="pt-4 border-t">
                        <ShippingCalculator
                          items={shippingItems}
                          onSelect={(q) => setSelectedShipping(q)}
                          selectedId={selectedShipping?.id}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {step === "payment" && (
                <Card className="border-0 shadow-premium">
                  <CardContent className="p-6 space-y-5">
                    <h2 className="font-display text-xl font-bold flex items-center gap-2"><CreditCard className="w-5 h-5" /> Pagamento</h2>

                    <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod} className="space-y-3">
                      <label className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${paymentMethod === "pix" ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"}`}>
                        <RadioGroupItem value="pix" />
                        <div className="flex-1">
                          <p className="font-sans font-semibold text-sm">PIX</p>
                          <p className="font-sans text-xs text-muted-foreground">Aprovação instantânea • 5% de desconto</p>
                        </div>
                        <span className="font-sans text-xs font-bold text-success bg-success/10 px-2 py-1 rounded-lg">-5%</span>
                      </label>
                      <label className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${paymentMethod === "card" ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"}`}>
                        <RadioGroupItem value="card" />
                        <div className="flex-1">
                          <p className="font-sans font-semibold text-sm">Cartão de Crédito</p>
                          <p className="font-sans text-xs text-muted-foreground">Até 12x sem juros</p>
                        </div>
                      </label>
                      <label className={`flex items-center gap-4 p-4 rounded-xl border cursor-pointer transition-all ${paymentMethod === "boleto" ? "border-accent bg-accent/5" : "border-border hover:border-accent/50"}`}>
                        <RadioGroupItem value="boleto" />
                        <div className="flex-1">
                          <p className="font-sans font-semibold text-sm">Boleto Bancário</p>
                          <p className="font-sans text-xs text-muted-foreground">Compensação em até 3 dias úteis</p>
                        </div>
                      </label>
                    </RadioGroup>

                    {paymentMethod === "card" && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-4 pt-2">
                        <p className="font-sans text-sm text-muted-foreground">
                          A integração com gateway de pagamento será ativada em breve. Por enquanto, o pedido será registrado como pendente.
                        </p>
                      </motion.div>
                    )}

                    {/* Seller referral code */}
                    <Separator className="my-4" />
                    <div className="space-y-2">
                      <Label className="font-sans text-sm flex items-center gap-2">
                        <UserCheck className="w-4 h-4" /> Código do vendedor (opcional)
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          value={sellerCode}
                          onChange={e => { setSellerCode(e.target.value); setSellerVerified(false); setSellerName(""); }}
                          placeholder="Ex: joao-ab12"
                          className="rounded-xl h-10 font-sans text-sm flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => verifySeller(sellerCode)}
                          className="rounded-xl h-10 font-sans"
                          disabled={!sellerCode.trim()}
                        >
                          Verificar
                        </Button>
                      </div>
                      {sellerVerified && (
                        <p className="text-xs text-success font-sans flex items-center gap-1">
                          <Check className="w-3 h-3" /> Vendedor: {sellerName}
                        </p>
                      )}
                      {sellerCode && !sellerVerified && sellerName === "" && (
                        <p className="text-xs text-muted-foreground font-sans">Clique em "Verificar" para validar o código</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation buttons */}
          <div className="flex justify-between mt-6">
            <Button onClick={prevStep} variant="ghost" className="rounded-xl font-sans h-12" disabled={stepIndex === 0}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
            </Button>
            {step === "payment" ? (
              <Button onClick={placeOrder} disabled={loading || !canProceed()} className="rounded-xl font-sans h-12 px-8 shine bg-success hover:bg-success/90 text-success-foreground font-bold">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Lock className="w-4 h-4 mr-2" /> Finalizar Pedido</>}
              </Button>
            ) : (
              <Button onClick={nextStep} disabled={!canProceed()} className="rounded-xl font-sans h-12 px-8 shine font-bold">
                Continuar <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            )}
          </div>
        </div>

        {/* Order Summary Sidebar */}
        <div>
          <Card className="border-0 shadow-premium sticky top-24">
            <CardContent className="p-6 space-y-4">
              <h3 className="font-display text-lg font-bold">Resumo do pedido</h3>
              <div className="space-y-3 max-h-60 overflow-y-auto">
                {items.map(item => (
                  <div key={item.id} className="flex gap-3">
                    <div className="product-thumb-mini w-16 h-16 shrink-0">
                      <img src={getItemImage(item)} alt={item.product?.name} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-sans text-sm font-semibold line-clamp-2">{item.product?.name}</p>
                      {(() => {
                        const meta = item.metadata_json as any;
                        const vd = meta?.variants_detail;
                        if (vd?.length) {
                          return vd.map((v: any, idx: number) => (
                            <p key={idx} className="font-sans text-sm text-muted-foreground">{v.group}: {v.name} {v.price != null && <span className="text-accent font-medium">R$ {Number(v.price).toFixed(2)}</span>}</p>
                          ));
                        }
                        return item.variant ? <p className="font-sans text-sm text-muted-foreground">{item.variant.name}</p> : null;
                      })()}
                      {(() => {
                        const meta = item.metadata_json as any;
                        const vd = meta?.variants_detail;
                        const p = vd?.length
                          ? vd.reduce((s: number, v: any) => s + (v.price ? Number(v.price) : 0), 0) || (item.product?.price ?? 0)
                          : (item.variant?.price ?? item.product?.price ?? 0);
                        return <p className="font-sans text-sm font-medium text-foreground">{item.quantity}x R$ {Number(p).toFixed(2)}</p>;
                      })()}
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              {/* Coupon */}
              <div className="flex gap-2">
                <Input
                  value={couponCode}
                  onChange={e => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Cupom de desconto"
                  className="rounded-xl h-10 font-sans text-sm"
                  disabled={!!couponApplied}
                />
                <Button onClick={applyCoupon} variant="outline" className="rounded-xl h-10 shrink-0 font-sans text-sm" disabled={!!couponApplied || applyingCoupon}>
                  {applyingCoupon ? <Loader2 className="w-3 h-3 animate-spin" /> : <Tag className="w-3 h-3" />}
                </Button>
              </div>
              {couponApplied && (
                <p className="font-sans text-xs text-success flex items-center gap-1"><Check className="w-3 h-3" /> Cupom {couponApplied} aplicado</p>
              )}

              <Separator />

              <div className="space-y-2 font-sans text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>R$ {subtotal.toFixed(2)}</span>
                </div>
                {couponDiscount > 0 && (
                  <div className="flex justify-between text-success">
                    <span>Desconto cupom</span>
                    <span>-R$ {couponDiscount.toFixed(2)}</span>
                  </div>
                )}
                {pixDiscount > 0 && (
                  <div className="flex justify-between text-success">
                    <span>Desconto PIX (5%)</span>
                    <span>-R$ {pixDiscount.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Frete</span>
                  {selectedShipping ? (
                    <span className={selectedShipping.price === 0 ? "text-success font-medium" : ""}>
                      {selectedShipping.price === 0 ? "Grátis" : `R$ ${selectedShipping.price.toFixed(2)}`}
                    </span>
                  ) : (
                    <span className="text-muted-foreground text-xs">Calcule no endereço</span>
                  )}
                </div>
              </div>

              <Separator />

              <div className="flex justify-between font-sans">
                <span className="font-semibold">Total</span>
                <span className="text-xl font-display font-bold text-accent">R$ {finalTotal.toFixed(2)}</span>
              </div>

              <div className="flex items-center gap-2 text-muted-foreground font-sans text-xs pt-2">
                <Lock className="w-3 h-3" />
                <span>Compra 100% segura</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
