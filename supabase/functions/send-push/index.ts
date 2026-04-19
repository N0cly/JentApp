// ============================================================
// JentApp — Edge Function : send-push
// Envoie une notification Web Push à tous les abonnés
// ============================================================
// Variables d'environnement requises (Supabase secrets) :
//   VAPID_PUBLIC_KEY   — clé publique VAPID
//   VAPID_PRIVATE_KEY  — clé privée VAPID
//   SUPABASE_URL       — injecté automatiquement par Supabase
//   SUPABASE_SERVICE_ROLE_KEY — injecté automatiquement
// ============================================================

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Implémentation Web Push manuelle (compatible Deno) ─────
// Basé sur la RFC 8291 (Message Encryption for Web Push)
// et la RFC 8292 (VAPID)

async function importVapidPrivateKey(base64url: string): Promise<CryptoKey> {
  const raw = base64urlToBuffer(base64url);
  return crypto.subtle.importKey(
    'raw',
    raw,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveKey', 'deriveBits']
  );
}

async function importVapidPublicKey(base64url: string): Promise<CryptoKey> {
  const raw = base64urlToBuffer(base64url);
  return crypto.subtle.importKey(
    'raw',
    raw,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );
}

function base64urlToBuffer(base64url: string): Uint8Array {
  const padding = '='.repeat((4 - (base64url.length % 4)) % 4);
  const base64 = (base64url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(base64);
  const buffer = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buffer[i] = binary.charCodeAt(i);
  return buffer;
}

function bufferToBase64url(buffer: Uint8Array): string {
  let binary = '';
  for (const byte of buffer) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function buildVapidAuthHeader(
  audience: string,
  vapidPublicKeyB64: string,
  vapidPrivateKeyB64: string
): Promise<string> {
  const header = { typ: 'JWT', alg: 'ES256' };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: 'mailto:admin@jenta.app',
  };

  const encode = (obj: object) =>
    bufferToBase64url(new TextEncoder().encode(JSON.stringify(obj)));

  const unsigned = `${encode(header)}.${encode(payload)}`;

  const privateKey = await crypto.subtle.importKey(
    'raw',
    base64urlToBuffer(vapidPrivateKeyB64),
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  );

  const signature = new Uint8Array(
    await crypto.subtle.sign(
      { name: 'ECDSA', hash: 'SHA-256' },
      privateKey,
      new TextEncoder().encode(unsigned)
    )
  );

  const jwt = `${unsigned}.${bufferToBase64url(signature)}`;
  return `vapid t=${jwt},k=${vapidPublicKeyB64}`;
}

async function encryptPayload(
  subscriptionP256dh: string,
  subscriptionAuth: string,
  payloadStr: string
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; serverPublicKey: Uint8Array }> {
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Générer une paire de clés éphémères serveur
  const serverKeyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits']
  );

  const serverPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey('raw', serverKeyPair.publicKey)
  );

  // Clé publique du client
  const clientPublicKey = await crypto.subtle.importKey(
    'raw',
    base64urlToBuffer(subscriptionP256dh),
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  );

  // Dériver le secret partagé ECDH
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: 'ECDH', public: clientPublicKey },
      serverKeyPair.privateKey,
      256
    )
  );

  const authBuffer = base64urlToBuffer(subscriptionAuth);

  // HKDF pour dériver la clé de contenu (RFC 8291)
  const prk = await hkdf(
    authBuffer,
    sharedSecret,
    concat(
      new TextEncoder().encode('Content-Encoding: auth\0'),
    ),
    32
  );

  const clientPublicKeyRaw = base64urlToBuffer(subscriptionP256dh);
  const context = concat(
    new TextEncoder().encode('P-256\0'),
    new Uint8Array([0, clientPublicKeyRaw.length]),
    clientPublicKeyRaw,
    new Uint8Array([0, serverPublicKeyRaw.length]),
    serverPublicKeyRaw
  );

  const cek = await hkdf(salt, prk, concat(new TextEncoder().encode('Content-Encoding: aesgcm\0'), context), 16);
  const nonce = await hkdf(salt, prk, concat(new TextEncoder().encode('Content-Encoding: nonce\0'), context), 12);

  // Chiffrer le payload avec AES-128-GCM
  const encryptionKey = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const paddedPayload = concat(new Uint8Array(2), new TextEncoder().encode(payloadStr));

  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, encryptionKey, paddedPayload)
  );

  return { ciphertext, salt, serverPublicKey: serverPublicKeyRaw };
}

async function hkdf(
  salt: Uint8Array,
  ikm: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey('raw', ikm, { name: 'HKDF' }, false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    key,
    length * 8
  );
  return new Uint8Array(bits);
}

function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    result.set(a, offset);
    offset += a.length;
  }
  return result;
}

async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<Response> {
  const url = new URL(subscription.endpoint);
  const audience = `${url.protocol}//${url.host}`;

  const vapidHeader = await buildVapidAuthHeader(audience, vapidPublicKey, vapidPrivateKey);
  const { ciphertext, salt, serverPublicKey } = await encryptPayload(
    subscription.p256dh,
    subscription.auth,
    payload
  );

  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      Authorization: vapidHeader,
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aesgcm',
      Encryption: `salt=${bufferToBase64url(salt)}`,
      'Crypto-Key': `dh=${bufferToBase64url(serverPublicKey)}`,
      TTL: '86400',
    },
    body: ciphertext,
  });

  return response;
}

// ── Handler principal ──────────────────────────────────────
serve(async (req) => {
  // Gestion CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { title, body } = await req.json() as { title: string; body: string };

    if (!title || !body) {
      return new Response(
        JSON.stringify({ error: 'title et body sont requis' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') || '';
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') || '';

    if (!vapidPublicKey || !vapidPrivateKey) {
      return new Response(
        JSON.stringify({ error: 'Clés VAPID manquantes dans les secrets Supabase' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Récupérer tous les abonnements (bypass RLS via service role)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );

    const { data: subscriptions, error: dbError } = await supabaseAdmin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth, user_id');

    if (dbError) {
      return new Response(
        JSON.stringify({ error: dbError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: 'Aucun abonné trouvé' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const payload = JSON.stringify({ title, body });

    // Envoyer à tous les abonnés en parallèle
    const results = await Promise.allSettled(
      subscriptions.map((sub) =>
        sendPushNotification(sub, payload, vapidPublicKey, vapidPrivateKey)
      )
    );

    // Nettoyer les abonnements expirés (statut 404 ou 410)
    const expiredEndpoints: string[] = [];
    results.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        const status = result.value.status;
        if (status === 404 || status === 410) {
          expiredEndpoints.push(subscriptions[idx].endpoint);
        }
      }
    });

    if (expiredEndpoints.length > 0) {
      await supabaseAdmin
        .from('push_subscriptions')
        .delete()
        .in('endpoint', expiredEndpoints);
    }

    const sent = results.filter(
      (r) => r.status === 'fulfilled' && (r.value.status === 200 || r.value.status === 201)
    ).length;

    const failed = results.length - sent;

    return new Response(
      JSON.stringify({ success: true, sent, failed, total: results.length }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
