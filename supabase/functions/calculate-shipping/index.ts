import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ShippingItem {
  weight: number;
  width: number;
  height: number;
  length: number;
  quantity: number;
  price: number;
}

interface ShippingQuote {
  id: string;
  name: string;
  price: number;
  delivery_min: number;
  delivery_max: number;
  company: string;
  service_code: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { customer_cep, items, items_hash } = await req.json();

    if (!customer_cep || !items?.length) {
      return new Response(
        JSON.stringify({ error: "CEP e itens são obrigatórios" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check cache
    if (items_hash) {
      const { data: cached } = await supabase
        .from("shipping_quotes")
        .select("quotes_json")
        .eq("customer_cep", customer_cep.replace(/\D/g, ""))
        .eq("items_hash", items_hash)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (cached) {
        return new Response(
          JSON.stringify({ quotes: cached.quotes_json, cached: true }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Load store settings
    const { data: settings } = await supabase
      .from("store_settings")
      .select("key, value");
    const cfg: Record<string, string> = {};
    settings?.forEach((s: any) => { cfg[s.key] = s.value; });

    const originCep = cfg["origin_cep"] || "";
    const melhorEnvioEnabled = cfg["melhor_envio_enabled"] === "true";
    const accessToken = cfg["melhor_envio_access_token"] || "";
    const environment = cfg["melhor_envio_environment"] || "sandbox";
    const freeShippingMin = parseFloat(cfg["free_shipping_min_value"] || "0");
    const shippingMargin = parseFloat(cfg["shipping_margin"] || "0");
    const shippingMarginType = cfg["shipping_margin_type"] || "fixed";
    const extraPrepDays = parseInt(cfg["extra_prep_days"] || "0", 10);
    const defaultWeight = parseFloat(cfg["default_shipping_weight"] || "0.3");
    const defaultWidth = parseFloat(cfg["default_shipping_width"] || "11");
    const defaultHeight = parseFloat(cfg["default_shipping_height"] || "2");
    const defaultLength = parseFloat(cfg["default_shipping_length"] || "16");

    // Calculate totals for free shipping check
    const orderTotal = (items as ShippingItem[]).reduce(
      (sum, i) => sum + i.price * i.quantity, 0
    );

    // Aggregate package dimensions
    const typedItems = items as ShippingItem[];
    const totalWeight = typedItems.reduce(
      (sum, i) => sum + (i.weight || defaultWeight) * i.quantity, 0
    );
    const maxWidth = Math.max(...typedItems.map(i => i.width || defaultWidth));
    const maxLength = Math.max(...typedItems.map(i => i.length || defaultLength));
    const totalHeight = typedItems.reduce(
      (sum, i) => sum + (i.height || defaultHeight) * i.quantity, 0
    );

    let quotes: ShippingQuote[] = [];

    if (melhorEnvioEnabled && accessToken && originCep) {
      const baseUrl = environment === "production"
        ? "https://melhorenvio.com.br"
        : "https://sandbox.melhorenvio.com.br";

      const meResponse = await fetch(`${baseUrl}/api/v2/me/shipment/calculate`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          from: { postal_code: originCep.replace(/\D/g, "") },
          to: { postal_code: customer_cep.replace(/\D/g, "") },
          package: {
            weight: totalWeight,
            width: maxWidth,
            height: Math.min(totalHeight, 100),
            length: maxLength,
          },
          options: {
            insurance_value: orderTotal,
          },
        }),
      });

      if (meResponse.ok) {
        const meData = await meResponse.json();
        if (Array.isArray(meData)) {
          quotes = meData
            .filter((s: any) => !s.error && s.price)
            .map((s: any) => {
              let price = parseFloat(s.price) || 0;
              // Apply margin
              if (shippingMargin > 0) {
                price = shippingMarginType === "percentage"
                  ? price * (1 + shippingMargin / 100)
                  : price + shippingMargin;
              }
              return {
                id: String(s.id),
                name: `${s.company?.name || ""} - ${s.name || ""}`.trim(),
                price: Math.round(price * 100) / 100,
                delivery_min: (s.delivery_range?.min || s.delivery_time || 0) + extraPrepDays,
                delivery_max: (s.delivery_range?.max || s.delivery_time || 0) + extraPrepDays,
                company: s.company?.name || "",
                service_code: `${(s.company?.name || "").toLowerCase().replace(/\s/g, "_")}_${(s.name || "").toLowerCase().replace(/\s/g, "_")}`,
              };
            });
        }
      } else {
        console.error("Melhor Envio error:", await meResponse.text());
      }
    }

    // Fallback: flat rate shipping if no quotes
    if (quotes.length === 0) {
      const flatRate = parseFloat(cfg["flat_shipping_rate"] || "15");
      const flatDays = parseInt(cfg["shipping_default_days"] || "7", 10);
      quotes = [
        {
          id: "flat",
          name: "Envio Padrão",
          price: flatRate,
          delivery_min: flatDays,
          delivery_max: flatDays + 3,
          company: "Loja",
          service_code: "flat_rate",
        },
      ];
    }

    // Add free shipping option if applicable
    if (freeShippingMin > 0 && orderTotal >= freeShippingMin) {
      const baseDays = Math.max(...quotes.map(q => q.delivery_max), 7);
      quotes.unshift({
        id: "free",
        name: "Frete Grátis",
        price: 0,
        delivery_min: baseDays,
        delivery_max: baseDays + 3,
        company: "Loja",
        service_code: "free_shipping",
      });
    }

    // Cache quotes
    if (items_hash) {
      await supabase.from("shipping_quotes").insert({
        customer_cep: customer_cep.replace(/\D/g, ""),
        items_hash,
        quotes_json: quotes,
      });
    }

    return new Response(
      JSON.stringify({ quotes, cached: false }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Shipping calculation error:", error);
    return new Response(
      JSON.stringify({ error: "Erro ao calcular frete" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
