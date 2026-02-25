import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Find active/trialing subscriptions past their period end
    const now = new Date().toISOString();

    const { data: expired, error } = await supabase
      .from("owner_subscription")
      .select("id, status, billing_cycle, auto_renew, current_period_end")
      .in("status", ["active", "trialing", "past_due"])
      .lt("current_period_end", now);

    if (error) throw error;

    let suspended = 0;

    for (const sub of expired || []) {
      // If auto_renew is off or cancel_at_period_end, suspend immediately
      // If auto_renew is on, mark as past_due first (grace period)
      const newStatus = sub.auto_renew && sub.status !== "past_due" 
        ? "past_due" 
        : "suspended";

      const { error: updateError } = await supabase
        .from("owner_subscription")
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
          ...(newStatus === "suspended" ? { auto_renew: false } : {}),
        })
        .eq("id", sub.id);

      if (!updateError) {
        suspended++;

        await supabase.from("owner_audit_logs").insert({
          action: newStatus === "suspended" ? "SUBSCRIPTION_SUSPENDED_AUTO" : "SUBSCRIPTION_PAST_DUE",
          actor_type: "system",
          meta_json: {
            subscription_id: sub.id,
            reason: "period_expired",
            expired_at: sub.current_period_end,
          },
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, checked: (expired || []).length, updated: suspended }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e: any) {
    console.error("Check expiry error:", e);
    return new Response(
      JSON.stringify({ error: e.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
