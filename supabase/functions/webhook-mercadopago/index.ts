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
      provider: "mercadopago",
      event_type: body.type || body.action || "unknown",
      payload: body,
      processed_at: new Date().toISOString(),
      success: false,
    });

    if (body.type !== "payment" && body.action !== "payment.updated") {
      return new Response(JSON.stringify({ message: "Ignored event" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const paymentId = body.data?.id;
    if (!paymentId) {
      return new Response(JSON.stringify({ error: "No payment ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get MP credentials
    const { data: secretsData } = await supabase
      .from("payment_gateway_secrets")
      .select("secret_key, secret_value")
      .eq("provider", "mercadopago");

    const secrets: Record<string, string> = {};
    secretsData?.forEach((s: any) => { secrets[s.secret_key] = s.secret_value; });

    if (!secrets.access_token) {
      return new Response(JSON.stringify({ error: "MP not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch payment details from MP
    const mpRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { Authorization: `Bearer ${secrets.access_token}` },
    });
    const mpPayment = await mpRes.json();

    const statusMap: Record<string, string> = {
      approved: "paid",
      pending: "pending",
      authorized: "pending",
      in_process: "pending",
      rejected: "failed",
      cancelled: "canceled",
      refunded: "refunded",
      charged_back: "refunded",
    };

    const newStatus = statusMap[mpPayment.status] || "pending";

    // Find transaction
    const { data: tx } = await supabase
      .from("payment_transactions")
      .select("id, order_id")
      .eq("provider_payment_id", String(paymentId))
      .single();

    if (!tx) {
      return new Response(JSON.stringify({ error: "Transaction not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const txUpdate: any = { status: newStatus };
    if (newStatus === "paid") txUpdate.paid_at = new Date().toISOString();
    if (mpPayment.fee_details?.length) {
      txUpdate.fees = mpPayment.fee_details.reduce((s: number, f: any) => s + f.amount, 0);
    }

    await supabase.from("payment_transactions").update(txUpdate).eq("id", tx.id);

    const orderUpdate: any = { payment_status: newStatus };
    if (newStatus === "paid") {
      orderUpdate.status = "confirmed";
      orderUpdate.paid_at = new Date().toISOString();
    } else if (newStatus === "canceled" || newStatus === "failed") {
      orderUpdate.status = "canceled";
    } else if (newStatus === "refunded") {
      orderUpdate.status = "refunded";
    }

    await supabase.from("orders").update(orderUpdate).eq("id", tx.order_id);

    await supabase
      .from("webhook_events")
      .update({ success: true })
      .eq("provider", "mercadopago")
      .order("created_at", { ascending: false })
      .limit(1);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("MP webhook error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
