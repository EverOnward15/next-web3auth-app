// app/api/token/route.js
import { SignJWT, importPKCS8 } from "jose";

export async function POST(req) {
  try {
    const body = await req.json();
    const rawPrivateKey = process.env.PRIVATE_KEY?.replace(/\\n/g, "\n");

    if (!rawPrivateKey) {
      return new Response("Private key not set", { status: 500 });
    }

    const privateKey = await importPKCS8(rawPrivateKey.trim(), "RS256");

    const token = await new SignJWT(body)
      .setProtectedHeader({ alg: "RS256", kid: "telegram-key-1" })
      .setIssuedAt()
      .setExpirationTime("30m")
      .setSubject(String(body.sub || body.id)) // 🔧 Cast to string
      .sign(privateKey);

    return new Response(JSON.stringify({ token }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    console.error("Token Generation Error:", err);
    return new Response("Failed to generate token", { status: 500 });
  }
}
