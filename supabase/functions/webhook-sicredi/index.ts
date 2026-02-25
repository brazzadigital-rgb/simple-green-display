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
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    console.log("Sicredi webhook received:", JSON.stringify(body).substring(0, 500));

    // Validate webhook token if configured
    const webhookToken = req.headers.get("x-webhook-token") || req.headers.get("authorization");
    const { data: storedToken } = await supabaseAdmin
      .from("payment_gateway_secrets")
      .select("secret_value")
      .eq("provider", "sicredi")
      .eq("secret_key", "webhook_token")
      .maybeSingle();

    if (storedToken?.secret_value && webhookToken) {
      const cleanToken = webhookToken.replace("Bearer ", "");
      if (cleanToken !== storedToken.secret_value) {
        console.warn("Sicredi webhook: invalid token");
        return new Response(JSON.stringify({ error: "Invalid token" }), {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Sicredi PIX webhook payload structure
    // { pix: [{ endToEndId, txid, valor, horario, ... }] }
    const pixEvents = body.pix || [];

    for (const pixEvent of pixEvents) {
      const txid = pixEvent.txid;
      if (!txid) continue;

      // Find transaction by provider_payment_id (txid)
      const { data: transaction } = await supabaseAdmin
        .from("payment_transactions")
        .select("id, order_id, status, amount")
        .eq("provider", "sicredi")
        .eq("provider_payment_id", txid)
        .maybeSingle();

      if (!transaction) {
        console.warn("Sicredi webhook: transaction not found for txid:", txid);
        continue;
      }

      // Idempotency: skip if already paid
      if (transaction.status === "paid") {
        console.log("Sicredi webhook: transaction already paid, skipping:", txid);
        continue;
      }

      const paidAmount = parseFloat(pixEvent.valor || "0");
      const now = new Date().toISOString();

      // Update transaction to paid
      await supabaseAdmin
        .from("payment_transactions")
        .update({
          status: "paid",
          paid_at: now,
          raw_payload: { ...body, _webhook_event: pixEvent },
        })
        .eq("id", transaction.id);

      // Update order
      if (transaction.order_id) {
        await supabaseAdmin
          .from("orders")
          .update({
            payment_status: "paid",
            status: "processing",
            paid_at: now,
          })
          .eq("id", transaction.order_id);

        // Add order event
        await supabaseAdmin.from("order_events").insert({
          order_id: transaction.order_id,
          event_type: "payment_confirmed",
          description: `Pagamento PIX Sicredi confirmado — R$ ${paidAmount.toFixed(2)} (endToEndId: ${pixEvent.endToEndId || "N/A"})`,
          metadata: { provider: "sicredi", txid, endToEndId: pixEvent.endToEndId, valor: paidAmount },
        });
      }

      console.log("Sicredi webhook: payment confirmed for txid:", txid);
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Sicredi webhook error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
