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
      provider: "pagseguro",
      event_type: body.type || "charge",
      payload: body,
      processed_at: new Date().toISOString(),
      success: false,
    });

    const charge = body.charges?.[0] || body;
    const chargeId = charge.id;
    const chargeStatus = charge.status;

    if (!chargeId) {
      return new Response(JSON.stringify({ error: "No charge ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const statusMap: Record<string, string> = {
      PAID: "paid",
      AUTHORIZED: "pending",
      IN_ANALYSIS: "pending",
      DECLINED: "failed",
      CANCELED: "canceled",
    };

    const newStatus = statusMap[chargeStatus] || "pending";

    const { data: tx } = await supabase
      .from("payment_transactions")
      .select("id, order_id")
      .eq("provider_payment_id", chargeId)
      .single();

    if (tx) {
      const txUpdate: any = { status: newStatus };
      if (newStatus === "paid") txUpdate.paid_at = new Date().toISOString();

      await supabase.from("payment_transactions").update(txUpdate).eq("id", tx.id);

      const orderUpdate: any = { payment_status: newStatus };
      if (newStatus === "paid") {
        orderUpdate.status = "confirmed";
        orderUpdate.paid_at = new Date().toISOString();
      } else if (newStatus === "canceled" || newStatus === "failed") {
        orderUpdate.status = "canceled";
      }

      await supabase.from("orders").update(orderUpdate).eq("id", tx.order_id);
    }

    await supabase
      .from("webhook_events")
      .update({ success: true })
      .eq("provider", "pagseguro")
      .order("created_at", { ascending: false })
      .limit(1);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("PagSeguro webhook error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
