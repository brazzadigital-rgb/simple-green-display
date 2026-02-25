import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function arrayBufferToBase64Url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Generate ECDSA P-256 key pair for VAPID
    const keyPair = await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign', 'verify']
    );

    const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);
    const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey);

    // Build uncompressed public key (65 bytes: 0x04 || x || y)
    const xBytes = Uint8Array.from(atob(publicKeyJwk.x!.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    const yBytes = Uint8Array.from(atob(publicKeyJwk.y!.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
    const publicKeyRaw = new Uint8Array(65);
    publicKeyRaw[0] = 0x04;
    publicKeyRaw.set(xBytes, 1);
    publicKeyRaw.set(yBytes, 33);
    const publicKeyBase64Url = arrayBufferToBase64Url(publicKeyRaw.buffer);

    // Private key is the 'd' parameter
    const privateKeyBase64Url = privateKeyJwk.d!;

    return new Response(JSON.stringify({
      publicKey: publicKeyBase64Url,
      privateKey: privateKeyBase64Url,
      instructions: "Salve VAPID_PUBLIC_KEY e VAPID_PRIVATE_KEY como secrets no projeto, e também salve VAPID_PUBLIC_KEY na store_settings.",
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
