import { jwtVerify, SignJWT } from 'jose';

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (request.method === 'POST' && url.pathname === '/auth/telegram') {
      const body = await request.json();

      const botToken = TELEGRAM_BOT_TOKEN; // set via secret
      const jwtSecret = JWT_SECRET;        // set via secret

      const isValid = await verifyTelegramPayload(body, botToken);
      if (!isValid) {
        return new Response(JSON.stringify({ error: 'Invalid Telegram payload' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const token = await new SignJWT({
        id: body.id,
        username: body.username,
        first_name: body.first_name,
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('7d')
        .sign(new TextEncoder().encode(jwtSecret));

      return new Response(JSON.stringify({ token }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not Found', { status: 404 });
  },
};

async function verifyTelegramPayload(payload, botToken) {
  const { hash, ...data } = payload;

  const dataCheckString = Object.keys(data)
    .sort()
    .map((key) => `${key}=${data[key]}`)
    .join('\n');

  const encoder = new TextEncoder();
  const key = await crypto.subtle.digest(
    'SHA-256',
    encoder.encode(botToken)
  );

  const hmacKey = await crypto.subtle.importKey(
    'raw',
    key,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    hmacKey,
    encoder.encode(dataCheckString)
  );

  const hex = Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return hex === hash;
}
