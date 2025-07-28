// cryptoInit.js

import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha256';
import { ripemd160 } from '@noble/hashes/ripemd160';

let cryptoInitialized = false;

export async function initializeCrypto() {
  if (cryptoInitialized) {
    const bitcoin = await import('bitcoinjs-lib');
    const secp = await import('@noble/secp256k1');
    return { bitcoin, secp };
  }

  const secp = await import('@noble/secp256k1');
  const bitcoin = await import('bitcoinjs-lib');
  const { initEccLib } = await import('bitcoinjs-lib/src/crypto');

  // Patch noble-secp256k1
  secp.utils.hmacSha256Sync = (key, ...msgs) => hmac(sha256, key, ...msgs);
  secp.utils.sha256Sync = (b) => sha256(b);

  // Register noble-secp256k1 with bitcoinjs-lib
  initEccLib(secp); // ✅ this is critical

  cryptoInitialized = true;
  return { bitcoin };
}
