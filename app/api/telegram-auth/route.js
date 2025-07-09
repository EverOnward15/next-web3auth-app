// app/api/telegram-auth/route.js

import jwt from "jsonwebtoken";

export async function POST(request) {
  const data = await request.json();

  const { id, first_name, last_name, username, photo_url, auth_date, hash } = data;

  const secret = process.env.TELEGRAM_BOT_TOKEN;
  if (!secret) {
    return new Response("Missing bot token", { status: 500 });
  }

  // Construct the Telegram data check string
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

  // Issue JWT
  const jwtSecret = process.env.JWT_SECRET;
  const token = jwt.sign(
    {
      id,
      first_name,
      last_name,
      username,
      photo_url,
    },
    jwtSecret,
    { expiresIn: "1h" }
  );

  return Response.json({ token, user: { id, first_name, last_name, username, photo_url } });
}
