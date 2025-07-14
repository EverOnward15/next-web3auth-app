import { readFileSync } from "fs";
import path from "path";
import jwkToPem from "jwk-to-pem";
import { exportJWK } from "jose";

export async function GET() {
  const publicKey = readFileSync(path.join(process.cwd(), "keys/public.pem"));
  const { importSPKI } = await import("jose");
  const key = await importSPKI(publicKey.toString(), "RS256");
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
}
