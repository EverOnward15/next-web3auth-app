// utils/patchBitcoinCrypto.js
import * as bitcoinjs from "bitcoinjs-lib";
import ecc from "@bitcoinerlab/secp256k1";
import { sha256 } from "@noble/hashes/sha256";
import { hmac } from "@noble/hashes/hmac";
import { Buffer } from "buffer";

// Polyfill Buffer in browser
if (typeof window !== "undefined" && !window.Buffer) {
  window.Buffer = Buffer;
}

export function initBitcoinEcc() {
  // 1) init the full tiny-secp256k1 impl
  bitcoinjs.initEccLib(ecc);

  // 2) ensure the 'hashes' bucket exists
  const crypto = bitcoinjs.crypto;
  if (!crypto.hashes) crypto.hashes = {};

  // 3) override SHA‐256
  crypto.hashes.sha256 = (buffer) =>
    Buffer.from(sha256(Buffer.from(buffer)));

  // 4) override HMAC‐SHA256 (sync)
  crypto.hashes.hmacSha256Sync = (key, data) => {
    const keyBytes = Buffer.isBuffer(key) ? key : Buffer.from(key);
    const dataBytes = Buffer.isBuffer(data) ? data : Buffer.from(data);
    return Buffer.from(hmac(sha256, keyBytes, dataBytes));
  };

  // 5) for extra safety, patch crypto.* too (some codepaths)
  crypto.sha256 = crypto.hashes.sha256;
  crypto.hmacSha256Sync = crypto.hashes.hmacSha256Sync;
}

// Export after patch
export const { Psbt, Transaction, payments, networks, ECPair } = bitcoinjs;
