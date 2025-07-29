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

export function initBitcoinEcc() {
  bitcoinjs.initEccLib({
    isPoint: (p) => {
      if (!p) return false;
      try {
        // p should be Buffer or Uint8Array representing a public key
        ecc.Point.fromHex(p);
        return true;
      } catch {
        return false;
      }
    },
    pointFromScalar: (scalar, compressed = true) => {
      // scalar is a Buffer or Uint8Array of private key bytes
      return ecc.Point.fromPrivateKey(scalar).toRawBytes(compressed);
    },
    pointCompress: (pubkey, compressed = true) => {
      // pubkey is a Buffer/Uint8Array of uncompressed public key bytes
      // decompress then re-compress it with noble to ensure correct format
      const point = ecc.Point.fromHex(pubkey);
      return point.toRawBytes(compressed);
    },
    sign: (hash, privateKey, options) => {
      // options can be { der: boolean }
      // noble's sign returns a Promise that resolves to signature Uint8Array
      // bitcoinjs expects a Buffer signature synchronously
      // So we use the sync version
      // Actually noble provides only async sign by default, but you can force sync via signSync (available since v1.7.0)
      return ecc.signSync(hash, privateKey, options);
    },
    verify: (hash, publicKey, signature) => {
      return ecc.verify(signature, hash, publicKey);
    },
  });

  // Patch crypto hashes
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
