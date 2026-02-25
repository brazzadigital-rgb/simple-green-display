import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CreatePaymentRequest {
  order_id: string;
  method: "pix" | "card" | "boleto";
  provider?: string;
  customer: {
    name: string;
    email: string;
    phone: string;
    cpf?: string;
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const supabaseUser = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: claimsData, error: claimsErr } = await supabaseUser.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = claimsData.claims.sub;
    const body: CreatePaymentRequest = await req.json();
    const { order_id, method, customer } = body;

    // Get order
    const { data: order, error: orderErr } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", order_id)
      .eq("user_id", userId)
      .single();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get active gateway config (use specified or default)
    let providerName = body.provider;
    let gatewayConfig;

    if (providerName) {
      const { data } = await supabaseAdmin
        .from("payment_gateway_configs")
        .select("*")
        .eq("provider", providerName)
        .eq("is_active", true)
        .single();
      gatewayConfig = data;
    } else {
      const { data } = await supabaseAdmin
        .from("payment_gateway_configs")
        .select("*")
        .eq("is_default", true)
        .eq("is_active", true)
        .single();
      gatewayConfig = data;
      providerName = data?.provider;
    }

    if (!gatewayConfig) {
      return new Response(
        JSON.stringify({ error: "No active payment gateway configured" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get secrets for this provider
    const { data: secretsData } = await supabaseAdmin
      .from("payment_gateway_secrets")
      .select("secret_key, secret_value")
      .eq("provider", providerName);

    const secrets: Record<string, string> = {};
    secretsData?.forEach((s: any) => {
      secrets[s.secret_key] = s.secret_value;
    });

    let paymentResult: any;

    // Route to appropriate provider
    switch (providerName) {
      case "asaas":
        paymentResult = await createAsaasPayment(
          order, method, customer, gatewayConfig, secrets
        );
        break;
      case "mercadopago":
        paymentResult = await createMercadoPagoPayment(
          order, method, customer, gatewayConfig, secrets
        );
        break;
      case "stripe":
        paymentResult = await createStripePayment(
          order, method, customer, gatewayConfig, secrets
        );
        break;
      case "pagseguro":
        paymentResult = await createPagSeguroPayment(
          order, method, customer, gatewayConfig, secrets
        );
        break;
      case "sicredi":
        paymentResult = await createSicrediPayment(
          order, method, customer, gatewayConfig, secrets
        );
        break;
      default:
        return new Response(
          JSON.stringify({ error: `Unknown provider: ${providerName}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }

    // Create transaction record
    const { data: transaction, error: txErr } = await supabaseAdmin
      .from("payment_transactions")
      .insert({
        order_id,
        provider: providerName,
        method,
        status: "pending",
        amount: order.total,
        currency: "BRL",
        provider_payment_id: paymentResult.provider_payment_id || null,
        provider_reference: paymentResult.provider_reference || null,
        qr_code: paymentResult.qr_code || null,
        qr_code_image_url: paymentResult.qr_code_image_url || null,
        boleto_url: paymentResult.boleto_url || null,
        checkout_url: paymentResult.checkout_url || null,
        expires_at: paymentResult.expires_at || null,
        raw_payload: paymentResult.raw_payload || {},
      })
      .select("id")
      .single();

    if (txErr) {
      console.error("Transaction insert error:", txErr);
      return new Response(JSON.stringify({ error: "Failed to create transaction" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update order with payment info
    await supabaseAdmin
      .from("orders")
      .update({
        payment_provider: providerName,
        payment_method: method,
        payment_status: "pending",
        transaction_id: transaction.id,
      })
      .eq("id", order_id);

    return new Response(
      JSON.stringify({
        transaction_id: transaction.id,
        provider: providerName,
        method,
        status: "pending",
        qr_code: paymentResult.qr_code,
        qr_code_image_url: paymentResult.qr_code_image_url,
        boleto_url: paymentResult.boleto_url,
        checkout_url: paymentResult.checkout_url,
        expires_at: paymentResult.expires_at,
        provider_payment_id: paymentResult.provider_payment_id,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Create payment error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// ========== ASAAS PROVIDER ==========
async function createAsaasPayment(
  order: any,
  method: string,
  customer: any,
  config: any,
  secrets: Record<string, string>
) {
  const apiKey = secrets.api_key;
  if (!apiKey) throw new Error("Asaas API Key not configured");

  const baseUrl = config.environment === "production"
    ? "https://api.asaas.com/v3"
    : "https://sandbox.asaas.com/api/v3";

  // Create or find customer
  const customerRes = await fetch(`${baseUrl}/customers`, {
    method: "POST",
    headers: { "Content-Type": "application/json", access_token: apiKey },
    body: JSON.stringify({
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      cpfCnpj: customer.cpf || undefined,
    }),
  });
  const customerData = await customerRes.json();
  const customerId = customerData.id || customerData.errors?.[0]?.description;

  // If customer already exists, search for them
  let asaasCustomerId = customerData.id;
  if (!asaasCustomerId && customerData.errors) {
    const searchRes = await fetch(`${baseUrl}/customers?email=${customer.email}`, {
      headers: { access_token: apiKey },
    });
    const searchData = await searchRes.json();
    asaasCustomerId = searchData.data?.[0]?.id;
  }

  if (!asaasCustomerId) throw new Error("Failed to create Asaas customer");

  const billingType = method === "pix" ? "PIX" : method === "card" ? "CREDIT_CARD" : "BOLETO";
  const pixExpMinutes = config.config?.pix_expiration_minutes || 30;

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + (method === "boleto" ? 3 : 1));

  const paymentBody: any = {
    customer: asaasCustomerId,
    billingType,
    value: order.total,
    dueDate: dueDate.toISOString().split("T")[0],
    description: `Pedido ${order.order_number}`,
    externalReference: order.id,
  };

  const paymentRes = await fetch(`${baseUrl}/payments`, {
    method: "POST",
    headers: { "Content-Type": "application/json", access_token: apiKey },
    body: JSON.stringify(paymentBody),
  });
  const paymentData = await paymentRes.json();

  if (!paymentData.id) {
    console.error("Asaas payment error:", paymentData);
    throw new Error("Failed to create Asaas payment");
  }

  let qrCode = null;
  let qrCodeImage = null;
  let boletoUrl = null;

  if (method === "pix") {
    // Get PIX QR code
    const pixRes = await fetch(`${baseUrl}/payments/${paymentData.id}/pixQrCode`, {
      headers: { access_token: apiKey },
    });
    const pixData = await pixRes.json();
    qrCode = pixData.payload;
    qrCodeImage = pixData.encodedImage ? `data:image/png;base64,${pixData.encodedImage}` : null;
  }

  if (method === "boleto") {
    boletoUrl = paymentData.bankSlipUrl;
  }

  const expiresAt = method === "pix"
    ? new Date(Date.now() + pixExpMinutes * 60 * 1000).toISOString()
    : null;

  return {
    provider_payment_id: paymentData.id,
    provider_reference: paymentData.invoiceUrl,
    qr_code: qrCode,
    qr_code_image_url: qrCodeImage,
    boleto_url: boletoUrl,
    checkout_url: paymentData.invoiceUrl,
    expires_at: expiresAt,
    raw_payload: paymentData,
  };
}

// ========== MERCADO PAGO PROVIDER ==========
async function createMercadoPagoPayment(
  order: any,
  method: string,
  customer: any,
  config: any,
  secrets: Record<string, string>
) {
  const accessToken = secrets.access_token;
  if (!accessToken) throw new Error("MercadoPago Access Token not configured");

  const paymentBody: any = {
    transaction_amount: order.total,
    description: `Pedido ${order.order_number}`,
    payment_method_id: method === "pix" ? "pix" : method === "boleto" ? "bolbradesco" : undefined,
    payer: {
      email: customer.email,
      first_name: customer.name.split(" ")[0],
      last_name: customer.name.split(" ").slice(1).join(" ") || customer.name,
    },
    external_reference: order.id,
  };

  if (method === "pix") {
    paymentBody.payment_method_id = "pix";
  }

  const res = await fetch("https://api.mercadopago.com/v1/payments", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      "X-Idempotency-Key": `order-${order.id}-${method}`,
    },
    body: JSON.stringify(paymentBody),
  });
  const data = await res.json();

  return {
    provider_payment_id: String(data.id || ""),
    provider_reference: data.external_reference,
    qr_code: data.point_of_interaction?.transaction_data?.qr_code || null,
    qr_code_image_url: data.point_of_interaction?.transaction_data?.qr_code_base64
      ? `data:image/png;base64,${data.point_of_interaction.transaction_data.qr_code_base64}`
      : null,
    boleto_url: data.transaction_details?.external_resource_url || null,
    checkout_url: null,
    expires_at: data.date_of_expiration || null,
    raw_payload: data,
  };
}

// ========== STRIPE PROVIDER ==========
async function createStripePayment(
  order: any,
  method: string,
  customer: any,
  config: any,
  secrets: Record<string, string>
) {
  const secretKey = secrets.secret_key;
  if (!secretKey) throw new Error("Stripe Secret Key not configured");

  // Create a checkout session
  const params = new URLSearchParams();
  params.append("mode", "payment");
  params.append("success_url", `${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app')}/conta/pedidos`);
  params.append("cancel_url", `${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '.lovable.app')}/checkout`);
  params.append("customer_email", customer.email);
  params.append("metadata[order_id]", order.id);
  params.append("line_items[0][price_data][currency]", "brl");
  params.append("line_items[0][price_data][product_data][name]", `Pedido ${order.order_number}`);
  params.append("line_items[0][price_data][unit_amount]", String(Math.round(order.total * 100)));
  params.append("line_items[0][quantity]", "1");

  if (method === "pix") {
    params.append("payment_method_types[]", "pix");
  } else if (method === "boleto") {
    params.append("payment_method_types[]", "boleto");
  } else {
    params.append("payment_method_types[]", "card");
  }

  const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(secretKey + ":")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: params.toString(),
  });
  const data = await res.json();

  return {
    provider_payment_id: data.id,
    provider_reference: data.payment_intent,
    qr_code: null,
    qr_code_image_url: null,
    boleto_url: null,
    checkout_url: data.url,
    expires_at: data.expires_at ? new Date(data.expires_at * 1000).toISOString() : null,
    raw_payload: data,
  };
}

// ========== PAGSEGURO PROVIDER ==========
async function createPagSeguroPayment(
  order: any,
  method: string,
  customer: any,
  config: any,
  secrets: Record<string, string>
) {
  const token = secrets.token || secrets.app_key;
  if (!token) throw new Error("PagSeguro Token not configured");

  const baseUrl = config.environment === "production"
    ? "https://api.pagseguro.com"
    : "https://sandbox.api.pagseguro.com";

  const chargeBody: any = {
    reference_id: order.id,
    description: `Pedido ${order.order_number}`,
    amount: {
      value: Math.round(order.total * 100),
      currency: "BRL",
    },
    payment_method: {
      type: method === "pix" ? "PIX" : method === "boleto" ? "BOLETO" : "CREDIT_CARD",
    },
    notification_urls: [`${Deno.env.get("SUPABASE_URL")}/functions/v1/webhook-pagseguro`],
  };

  if (method === "boleto") {
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 3);
    chargeBody.payment_method.boleto = {
      due_date: dueDate.toISOString().split("T")[0],
    };
  }

  const res = await fetch(`${baseUrl}/charges`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(chargeBody),
  });
  const data = await res.json();

  return {
    provider_payment_id: data.id || "",
    provider_reference: data.reference_id,
    qr_code: data.qr_codes?.[0]?.text || null,
    qr_code_image_url: data.qr_codes?.[0]?.links?.[0]?.href || null,
    boleto_url: data.links?.find((l: any) => l.rel === "BOLETO.PDF")?.href || null,
    checkout_url: data.links?.find((l: any) => l.rel === "PAY")?.href || null,
    expires_at: null,
    raw_payload: data,
  };
}

// ========== SICREDI PROVIDER ==========
async function getSicrediAccessToken(
  config: any,
  secrets: Record<string, string>
): Promise<string> {
  const clientId = secrets.client_id;
  const clientSecret = secrets.client_secret;
  if (!clientId || !clientSecret) throw new Error("Sicredi client_id/client_secret not configured");

  const baseUrl = config.environment === "production"
    ? "https://api-pix.sicredi.com.br"
    : "https://api-pix-h.sicredi.com.br";

  const httpClientOpts: any = {};

  // mTLS with PEM certificate + key
  const certPem = secrets.certificado_pem;
  const keyPem = secrets.chave_privada_pem;
  if (certPem && keyPem) {
    httpClientOpts.certChain = certPem;
    httpClientOpts.privateKey = keyPem;
  }

  const httpClient = Object.keys(httpClientOpts).length > 0
    ? Deno.createHttpClient(httpClientOpts)
    : undefined;

  const params = new URLSearchParams();
  params.append("grant_type", "client_credentials");
  params.append("scope", "cob.write cob.read cobv.write cobv.read pix.read pix.write webhook.read webhook.write");

  const authHeader = btoa(`${clientId}:${clientSecret}`);

  const fetchOpts: any = {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${authHeader}`,
    },
    body: params.toString(),
  };
  if (httpClient) fetchOpts.client = httpClient;

  const res = await fetch(`${baseUrl}/oauth/token`, fetchOpts);
  const data = await res.json();

  if (!data.access_token) {
    console.error("Sicredi OAuth error:", data);
    throw new Error("Failed to get Sicredi access token");
  }

  return data.access_token;
}

async function createSicrediPayment(
  order: any,
  method: string,
  customer: any,
  config: any,
  secrets: Record<string, string>
) {
  if (method !== "pix" && method !== "boleto") {
    throw new Error("Sicredi only supports PIX and Boleto");
  }

  const accessToken = await getSicrediAccessToken(config, secrets);

  const baseUrl = config.environment === "production"
    ? "https://api-pix.sicredi.com.br/api/v2"
    : "https://api-pix-h.sicredi.com.br/api/v2";

  const pixExpMinutes = config.config?.pix_expiration_minutes || 30;
  const txid = order.id.replace(/-/g, "").substring(0, 35);

  const httpClientOpts: any = {};
  const certPem = secrets.certificado_pem;
  const keyPem = secrets.chave_privada_pem;
  if (certPem && keyPem) {
    httpClientOpts.certChain = certPem;
    httpClientOpts.privateKey = keyPem;
  }
  const httpClient = Object.keys(httpClientOpts).length > 0
    ? Deno.createHttpClient(httpClientOpts)
    : undefined;

  const chavePix = secrets.chave_pix;
  if (!chavePix) throw new Error("Sicredi chave_pix not configured");

  // Create cobrança (charge)
  const cobBody: any = {
    calendario: {
      expiracao: pixExpMinutes * 60,
    },
    valor: {
      original: order.total.toFixed(2),
    },
    chave: chavePix,
    solicitacaoPagador: `Pedido ${order.order_number}`,
    infoAdicionais: [
      { nome: "Pedido", valor: order.order_number },
    ],
  };

  // Add debtor info if CPF available
  if (customer.cpf) {
    cobBody.devedor = {
      cpf: customer.cpf.replace(/\D/g, ""),
      nome: customer.name,
    };
  }

  const fetchOpts: any = {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(cobBody),
  };
  if (httpClient) fetchOpts.client = httpClient;

  const cobRes = await fetch(`${baseUrl}/cob/${txid}`, fetchOpts);
  const cobData = await cobRes.json();

  if (!cobData.txid) {
    console.error("Sicredi cob error:", cobData);
    throw new Error("Failed to create Sicredi charge");
  }

  // Get QR Code
  const qrFetchOpts: any = {
    method: "GET",
    headers: { Authorization: `Bearer ${accessToken}` },
  };
  if (httpClient) qrFetchOpts.client = httpClient;

  let qrCode = null;
  let qrCodeImage = null;

  try {
    const qrRes = await fetch(`${baseUrl}/cob/${txid}/qrcode`, qrFetchOpts);
    const qrData = await qrRes.json();
    qrCode = qrData.qrcode || qrData.brcode || null;
    qrCodeImage = qrData.imagemQrcode
      ? (qrData.imagemQrcode.startsWith("data:") ? qrData.imagemQrcode : `data:image/png;base64,${qrData.imagemQrcode}`)
      : null;
  } catch (qrErr) {
    console.error("Sicredi QR Code error:", qrErr);
  }

  const expiresAt = new Date(Date.now() + pixExpMinutes * 60 * 1000).toISOString();

  return {
    provider_payment_id: cobData.txid,
    provider_reference: cobData.loc?.id?.toString() || null,
    qr_code: qrCode,
    qr_code_image_url: qrCodeImage,
    boleto_url: null,
    checkout_url: null,
    expires_at: expiresAt,
    raw_payload: cobData,
  };
}
