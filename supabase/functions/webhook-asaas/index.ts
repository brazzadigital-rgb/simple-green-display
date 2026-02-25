import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const STATUS_MAP: Record<string, string> = {
  CONFIRMED: "paid",
  RECEIVED: "paid",
  RECEIVED_IN_CASH: "paid",
  OVERDUE: "expired",
  REFUNDED: "refunded",
  REFUND_REQUESTED: "refunded",
  DELETED: "canceled",
  RESTORED: "pending",
  PENDING: "pending",
};

const ORDER_STATUS_MAP: Record<string, string> = {
  paid: "confirmed",
  expired: "expired",
  refunded: "refunded",
  canceled: "canceled",
  failed: "canceled",
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
    const event = body.event;
    const payment = body.payment;

    if (!payment?.id) {
      return new Response(JSON.stringify({ error: "Invalid payload" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log webhook event
    await supabase.from("webhook_events").insert({
      provider: "asaas",
      event_type: event || "unknown",
      payload: body,
      processed_at: new Date().toISOString(),
      success: false,
    });

    // Check for duplicate processing (idempotency)
    const { data: existingEvents } = await supabase
      .from("webhook_events")
      .select("id")
      .eq("provider", "asaas")
      .eq("event_type", event)
      .eq("success", true)
      .filter("payload->payment->id", "eq", payment.id)
      .limit(1);

    if (existingEvents && existingEvents.length > 0) {
      return new Response(JSON.stringify({ message: "Already processed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newStatus = STATUS_MAP[payment.status] || "pending";

    // Find transaction by provider_payment_id
    const { data: transaction } = await supabase
      .from("payment_transactions")
      .select("id, order_id, status")
      .eq("provider_payment_id", payment.id)
      .single();

    if (!transaction) {
      // Try by external reference
      const { data: txByRef } = await supabase
        .from("payment_transactions")
        .select("id, order_id, status")
        .eq("provider", "asaas")
        .filter("raw_payload->externalReference", "eq", payment.externalReference)
        .single();

      if (!txByRef) {
        console.error("Transaction not found for Asaas payment:", payment.id);
        return new Response(JSON.stringify({ error: "Transaction not found" }), {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    const tx = transaction!;

    // Update transaction status
    const txUpdate: any = { status: newStatus };
    if (newStatus === "paid") txUpdate.paid_at = new Date().toISOString();
    if (payment.netValue) txUpdate.fees = payment.value - payment.netValue;

    await supabase
      .from("payment_transactions")
      .update(txUpdate)
      .eq("id", tx.id);

    // Update order status
    const orderUpdate: any = {
      payment_status: newStatus,
    };
    if (newStatus === "paid") {
      orderUpdate.status = "confirmed";
      orderUpdate.paid_at = new Date().toISOString();
    } else if (ORDER_STATUS_MAP[newStatus]) {
      orderUpdate.status = ORDER_STATUS_MAP[newStatus];
    }

    await supabase.from("orders").update(orderUpdate).eq("id", tx.order_id);

    // Mark webhook as successful
    await supabase
      .from("webhook_events")
      .update({ success: true })
      .eq("provider", "asaas")
      .eq("event_type", event)
      .order("created_at", { ascending: false })
      .limit(1);

    return new Response(JSON.stringify({ success: true, status: newStatus }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Asaas webhook error:", err);

    await supabase.from("webhook_events").insert({
      provider: "asaas",
      event_type: "error",
      payload: { error: String(err) },
      processed_at: new Date().toISOString(),
      success: false,
      error: String(err),
    });

    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
