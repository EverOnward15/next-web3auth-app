// app/api/jwks/route.js
import { exportJWK, importSPKI } from "jose";

const PUBLIC_KEY = `
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAzOVjSv1nu/M2qgS2AF7a
KovofNNJ89JEUUWG/TfFvMUNLRlATK3JcQB1diBjgiwTednDomKm71Br0hG9ytKK
I55lyDFyxiQzNbUbwew5YDS3Ud/lE0iwANS4mBqmEH0KoVEMEmDqDdP2KlmBOlLF
vlN1+4btRGBNh0j1xfQQwa9tUv5EPzlCHZaBG3M/G9gbW4PF8/NRG+uAqWaHr044
YM+j0PbyPfVKE1uhkmKMuTpd1e/zjOD8A+3XvWzp/Q6qvQ480sRvmlyT7+mXQ8a0
dbCoLqF+5g62z+VqITssyOKMvDuaFb6dm0L0PxrE5qxkxbSAnFTOe39CE5NKtreu
YQIDAQAB
-----END PUBLIC KEY-----
`;

export async function GET() {
  try {
    const key = await importSPKI(PUBLIC_KEY.trim(), "RS256");
    const jwk = await exportJWK(key);

    const jwks = {
      keys: [
        {
          ...jwk,
          use: "sig",
          alg: "RS256",
          kid: "telegram-key-1",
        },
      ],
    };

    return new Response(JSON.stringify(jwks), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    console.error("JWKS Error:", err);
    return new Response("Failed to generate JWKS", { status: 500 });
  }
}
