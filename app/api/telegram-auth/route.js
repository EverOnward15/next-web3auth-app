// app/api/telegram-auth/route.js
import { readFileSync } from "fs";
import path from "path";
import jwt from "jsonwebtoken";

const privateKey = process.env.PRIVATE_KEY.replace(/\\n/g, '\n');

// For POST requests (e.g. from frontend apps)
export async function POST(request) {
  const data = await request.json();

  const { id, first_name, last_name, username, photo_url, auth_date, hash } = data;

  const secret = process.env.TELEGRAM_BOT_TOKEN;
  if (!secret) {
    return new Response("Missing bot token", { status: 500 });
  }

  const checkString = Object.entries({
    auth_date,
    first_name,
    id,
    last_name,
    photo_url,
    username,
  })
    .filter(([_, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("\n");

  const crypto = await import("node:crypto");
  const hmac = crypto.createHmac("sha256", crypto.createHash("sha256").update(secret).digest());
  hmac.update(checkString);
  const expectedHash = hmac.digest("hex");

  if (expectedHash !== hash) {
    return new Response("Unauthorized", { status: 401 });
  }

  const jwtSecret = process.env.JWT_SECRET;
const token = jwt.sign(
  {
    sub: id,
    aud: "web3auth",
    iss: "https://next-web3auth-app.vercel.app/api/telegram-auth", // your backend API issuer
    id,
    first_name,
    last_name,
    username,
    photo_url,
  },
  privateKey,
  {
    algorithm: "RS256",
    expiresIn: "1h",
    keyid: "telegram-key-1", // must match 'kid' in JWKS
  }
  );

  return Response.json({ token, user: { id, first_name, last_name, username, photo_url } });
}

// For GET requests from Telegram widget
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const params = Object.fromEntries(searchParams.entries());

  const {
    id,
    first_name,
    last_name,
    username,
    photo_url,
    auth_date,
    hash,
  } = params;

  const secret = process.env.TELEGRAM_BOT_TOKEN;
  if (!secret) {
    return new Response("Missing bot token", { status: 500 });
  }

  const checkString = Object.entries({
    auth_date,
    first_name,
    id,
    last_name,
    photo_url,
    username,
  })
    .filter(([_, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${v}`)
    .sort()
    .join("\n");

  const crypto = await import("node:crypto");
  const hmac = crypto.createHmac("sha256", crypto.createHash("sha256").update(secret).digest());
  hmac.update(checkString);
  const expectedHash = hmac.digest("hex");

  if (expectedHash !== hash) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Redirect or respond as needed
  return Response.json({
    success: true,
    user: { id, first_name, last_name, username, photo_url },
  });
}
