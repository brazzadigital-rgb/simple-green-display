import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { order_number, email, tracking_code } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let order: any = null;

    if (tracking_code) {
      const { data } = await supabase
        .from("orders")
        .select("id, order_number, status, shipment_status, tracking_code, tracking_url, shipping_method_name, shipping_days, created_at, customer_name")
        .eq("tracking_code", tracking_code)
        .maybeSingle();
      order = data;
    } else if (order_number && email) {
      const { data } = await supabase
        .from("orders")
        .select("id, order_number, status, shipment_status, tracking_code, tracking_url, shipping_method_name, shipping_days, created_at, customer_name, customer_email")
        .eq("order_number", order_number.toUpperCase())
        .maybeSingle();

      if (data && data.customer_email?.toLowerCase() === email.toLowerCase()) {
        order = data;
        delete order.customer_email;
      }
    }

    if (!order) {
      return new Response(
        JSON.stringify({ error: "Pedido não encontrado. Verifique os dados e tente novamente." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get tracking events
    const { data: events } = await supabase
      .from("tracking_events")
      .select("*")
      .eq("order_id", order.id)
      .order("event_date", { ascending: false });

    // If Melhor Envio is configured, try to fetch fresh tracking
    const { data: settings } = await supabase
      .from("store_settings")
      .select("key, value")
      .in("key", ["melhor_envio_enabled", "melhor_envio_access_token", "melhor_envio_environment"]);
    
    const cfg: Record<string, string> = {};
    settings?.forEach((s: any) => { cfg[s.key] = s.value; });

    // Get melhor_envio_order_id from the full order record
    const { data: fullOrder } = await supabase
      .from("orders")
      .select("melhor_envio_order_id")
      .eq("id", order.id)
      .maybeSingle();

    let freshEvents = events || [];

    if (cfg["melhor_envio_enabled"] === "true" && cfg["melhor_envio_access_token"] && fullOrder?.melhor_envio_order_id) {
      const baseUrl = cfg["melhor_envio_environment"] === "production"
        ? "https://melhorenvio.com.br"
        : "https://sandbox.melhorenvio.com.br";

      try {
        const trackRes = await fetch(`${baseUrl}/api/v2/me/shipment/tracking`, {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${cfg["melhor_envio_access_token"]}`,
          },
          body: JSON.stringify({ orders: [fullOrder.melhor_envio_order_id] }),
        });

        if (trackRes.ok) {
          const trackData = await trackRes.json();
          const orderTracking = trackData?.[fullOrder.melhor_envio_order_id];
          if (orderTracking?.tracking) {
            // Sync new events
            for (const evt of orderTracking.tracking) {
              const eventDate = evt.date || new Date().toISOString();
              const exists = freshEvents.some(
                (e: any) => e.status === evt.status && e.event_date === eventDate
              );
              if (!exists) {
                const { data: newEvt } = await supabase
                  .from("tracking_events")
                  .insert({
                    order_id: order.id,
                    status: evt.status || "update",
                    description: evt.description || evt.message || "",
                    location: evt.locale || evt.city || null,
                    event_date: eventDate,
                  })
                  .select()
                  .single();
                if (newEvt) freshEvents.unshift(newEvt);
              }
            }

            // Update order status if delivered
            const isDelivered = orderTracking.tracking.some(
              (e: any) => e.status?.toLowerCase().includes("delivered") || e.status?.toLowerCase().includes("entregue")
            );
            if (isDelivered && order.shipment_status !== "delivered") {
              await supabase
                .from("orders")
                .update({ shipment_status: "delivered", status: "delivered" })
                .eq("id", order.id);
              order.shipment_status = "delivered";
              order.status = "delivered";
            }
          }
        }
      } catch (e) {
        console.error("Tracking fetch error:", e);
      }
    }

    return new Response(
      JSON.stringify({
        order: {
          order_number: order.order_number,
          status: order.status,
          shipment_status: order.shipment_status,
          tracking_code: order.tracking_code,
          tracking_url: order.tracking_url,
          shipping_method: order.shipping_method_name,
          shipping_days: order.shipping_days,
          created_at: order.created_at,
          customer_name: order.customer_name,
        },
        events: freshEvents,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Track order error:", error);
    return new Response(
      JSON.stringify({ error: "Erro ao rastrear pedido" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
