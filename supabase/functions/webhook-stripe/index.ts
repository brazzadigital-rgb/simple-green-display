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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    const body = await req.json();

    await supabase.from("webhook_events").insert({
      provider: "stripe",
      event_type: body.type || "unknown",
      payload: body,
      processed_at: new Date().toISOString(),
      success: false,
    });

    const event = body;

    if (event.type === "checkout.session.completed") {
      const session = event.data?.object;
      const orderId = session?.metadata?.order_id;

      if (!orderId) {
        return new Response(JSON.stringify({ error: "No order_id in metadata" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: tx } = await supabase
        .from("payment_transactions")
        .select("id, order_id")
        .eq("provider_payment_id", session.id)
        .single();

      if (tx) {
        await supabase.from("payment_transactions").update({
          status: "paid",
          paid_at: new Date().toISOString(),
        }).eq("id", tx.id);

        await supabase.from("orders").update({
          payment_status: "paid",
          status: "confirmed",
          paid_at: new Date().toISOString(),
        }).eq("id", tx.order_id);
      }
    } else if (event.type === "charge.refunded") {
      const charge = event.data?.object;
      const { data: tx } = await supabase
        .from("payment_transactions")
        .select("id, order_id")
        .eq("provider", "stripe")
        .filter("raw_payload->payment_intent", "eq", charge.payment_intent)
        .single();

      if (tx) {
        await supabase.from("payment_transactions").update({ status: "refunded" }).eq("id", tx.id);
        await supabase.from("orders").update({
          payment_status: "refunded",
          status: "refunded",
        }).eq("id", tx.order_id);
      }
    }

    await supabase
      .from("webhook_events")
      .update({ success: true })
      .eq("provider", "stripe")
      .order("created_at", { ascending: false })
      .limit(1);

    return new Response(JSON.stringify({ received: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Stripe webhook error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
