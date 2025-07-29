// utils/patchBitcoinCrypto.js
import * as bitcoinjs from "bitcoinjs-lib";
// import * as ecc from "@noble/secp256k1";
import { sha256 } from "@noble/hashes/sha256";
import { hmac } from "@noble/hashes/hmac";
import { Buffer } from "buffer";
import ecc from '@bitcoinerlab/secp256k1';

// Polyfill Buffer in browser
if (typeof window !== "undefined" && !window.Buffer) {
  window.Buffer = Buffer;
}


export function initBitcoinEcc() {
  // 1) init ECC impl as before
  bitcoinjs.initEccLib(ecc);

  // 2) patch the *hashes* namespace, not just crypto directly:
  const { hashes } = bitcoinjs.crypto;

  // Override SHA-256
  hashes.sha256 = (buffer) => {
    return Buffer.from(sha256(Buffer.from(buffer)));
  };

  // Provide HMAC-SHA256 (synchronous) for all code paths
  hashes.hmacSha256Sync = (key, data) => {
    const keyBytes = Buffer.isBuffer(key) ? key : Buffer.from(key);
    const dataBytes = Buffer.isBuffer(data) ? data : Buffer.from(data);
    return Buffer.from(hmac(sha256, keyBytes, dataBytes));
  };

  // If you run into missing HMAC-SHA512 or SHA-512 errors (e.g. HD wallets),
  // you can similarly patch:
  //
  // hashes.sha512 = ...
  // hashes.hmacSha512Sync = ...
}
// Export later
export const { Psbt, Transaction, payments, networks, ECPair } = bitcoinjs;
