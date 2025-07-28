// lib/cryptoInit.js
import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha256';
import { ripemd160 } from '@noble/hashes/ripemd160';

let cryptoInitialized = false;

export async function initializeCrypto() {
  if (cryptoInitialized) return;
  
  // Dynamically import the libraries
  const secp = await import('@noble/secp256k1');
  const bitcoin = await import('bitcoinjs-lib');

  // Patch noble-secp256k1
  if (!secp.utils.hmacSha256Sync) {
    secp.utils.hmacSha256Sync = (key, ...msgs) => hmac(sha256, key, ...msgs);
    secp.utils.sha256Sync = (b) => sha256(b);
  }

  // Create complete crypto implementation
  if (!bitcoin.crypto?.hmacSha256Sync) {
    bitcoin.crypto = {
      sha256: (b) => Buffer.from(sha256(b)),
      hash256: (b) => Buffer.from(sha256(sha256(b))),
      ripemd160: (b) => Buffer.from(ripemd160(b)),
      hmacSha256: (k, b) => Buffer.from(hmac(sha256, k, b)),
      hmacSha256Sync: (k, b) => Buffer.from(hmac(sha256, k, b))
    };
  }

  cryptoInitialized = true;
  return { secp, bitcoin };
}