// utils/patchBitcoinCrypto.js
import * as bitcoinjs from "bitcoinjs-lib";
import * as ecc from "@noble/secp256k1";
import { sha256 } from "@noble/hashes/sha256";
import { hmac } from "@noble/hashes/hmac";
import { Buffer } from "buffer";

// Polyfill Buffer in browser
if (typeof window !== "undefined" && !window.Buffer) {
  window.Buffer = Buffer;
}

// Call this function before using bitcoinjs-lib
export function initBitcoinEcc() {
  bitcoinjs.initEccLib({
    ...ecc,
    isPoint: (p) => {
      try {
        return ecc.Point.fromHex(p) instanceof ecc.Point;
      } catch {
        return false;
      }
    },
    pointFromScalar: (scalar, compressed = true) =>
      ecc.getPublicKey(scalar, compressed),
    pointCompress: (pubkey, compressed = true) =>
      ecc.getPublicKey(pubkey, compressed),
    sign: ecc.sign,
    verify: ecc.verify,
  });

  // Monkey-patch bitcoinjs-lib's crypto
  bitcoinjs.crypto.sha256 = (buffer) =>
    Buffer.from(sha256(Buffer.from(buffer)));
  bitcoinjs.crypto.hmacSha256Sync = (key, data) => {
    const keyBytes = Buffer.isBuffer(key) ? key : Buffer.from(key);
    const dataBytes = Buffer.isBuffer(data) ? data : Buffer.from(data);
    return Buffer.from(hmac(sha256, keyBytes, dataBytes));
  };
}

// Export later
export const { Psbt, Transaction, payments, networks, ECPair } = bitcoinjs;
