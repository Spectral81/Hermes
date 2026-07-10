import { createSign } from 'crypto';

export interface FcmMessage {
  title: string;
  body: string;
  data?: Record<string, string>;
}

function normalizePrivateKey(raw: string | undefined): string | null {
  if (!raw?.trim()) return null;
  let key = raw.trim();
  // Railway a veces guarda la clave entre comillas literales.
  if (key.startsWith('"') && key.endsWith('"')) {
    key = key.slice(1, -1);
  }
  key = key.replace(/\\n/g, '\n');
  if (!key.includes('BEGIN PRIVATE KEY')) return null;
  return key;
}

function getServiceAccount() {
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);

  if (!projectId || !clientEmail || !privateKey) return null;
  return { projectId, clientEmail, privateKey };
}

export function isFcmConfigured(): boolean {
  return getServiceAccount() !== null;
}

async function getAccessToken(): Promise<string> {
  const sa = getServiceAccount();
  if (!sa) throw new Error('FCM no configurado');

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const claim = Buffer.from(
    JSON.stringify({
      iss: sa.clientEmail,
      scope: 'https://www.googleapis.com/auth/firebase.messaging',
      aud: 'https://oauth2.googleapis.com/token',
      iat: now,
      exp: now + 3600,
    }),
  ).toString('base64url');

  const unsigned = `${header}.${claim}`;
  const sign = createSign('RSA-SHA256');
  sign.update(unsigned);
  const signature = sign.sign(sa.privateKey, 'base64url');
  const jwt = `${unsigned}.${signature}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`FCM OAuth error: ${text}`);
  }

  const json = (await res.json()) as { access_token?: string };
  if (!json.access_token) throw new Error('FCM OAuth: sin access_token');
  return json.access_token;
}

export async function sendFcmToToken(token: string, message: FcmMessage): Promise<boolean> {
  const sa = getServiceAccount();
  if (!sa) return false;

  const accessToken = await getAccessToken();
  const res = await fetch(
    `https://fcm.googleapis.com/v1/projects/${sa.projectId}/messages:send`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: {
          token,
          notification: { title: message.title, body: message.body },
          data: message.data ?? {},
          android: { priority: 'high' },
        },
      }),
    },
  );

  if (!res.ok) {
    const text = await res.text();
    console.error('[fcm] send failed', token.slice(0, 12), text);
    return false;
  }
  return true;
}

export async function sendFcmToTokens(
  tokens: string[],
  message: FcmMessage,
): Promise<{ sent: number; failed: number }> {
  if (!isFcmConfigured() || tokens.length === 0) {
    return { sent: 0, failed: tokens.length };
  }

  const unique = [...new Set(tokens.filter(Boolean))];
  let sent = 0;
  let failed = 0;

  await Promise.all(
    unique.map(async (token) => {
      const ok = await sendFcmToToken(token, message).catch((e) => {
        console.error('[fcm]', e);
        return false;
      });
      if (ok) sent += 1;
      else failed += 1;
    }),
  );

  return { sent, failed };
}
