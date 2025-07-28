import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha256';
import { ripemd160 } from '@noble/hashes/ripemd160';

let cryptoInitialized = false;

export async function initializeCrypto() {
  const secp = await import('@noble/secp256k1');
  const bitcoin = await import('bitcoinjs-lib');

  if (!cryptoInitialized) {
    // Patch noble-secp256k1
    secp.utils.hmacSha256Sync = (key, ...msgs) => hmac(sha256, key, ...msgs);
    secp.utils.sha256Sync = (b) => sha256(b);
    cryptoInitialized = true;
  }

  return { secp, bitcoin };
}
