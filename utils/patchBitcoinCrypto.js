// utils/patchBitcoinCrypto.js
import * as bitcoinjs from "bitcoinjs-lib";
import ecc from "@bitcoinerlab/secp256k1";
import { sha256 } from "@noble/hashes/sha256";
import { hmac } from "@noble/hashes/hmac";
import { Buffer } from "buffer";

// 1. Polyfill Buffer in browser
if (typeof window !== "undefined" && !window.Buffer) {
  window.Buffer = Buffer;
}

// 2. Init ECC
bitcoinjs.initEccLib(ecc);

// 3. Patch hashes namespace
const crypto = bitcoinjs.crypto;
if (!crypto.hashes) crypto.hashes = {};

const hmacSha256 = (key, data) => {
  const keyBuf = Buffer.isBuffer(key) ? key : Buffer.from(key);
  const dataBuf = Buffer.isBuffer(data) ? data : Buffer.from(data);
  return Buffer.from(hmac(sha256, keyBuf, dataBuf));
};

const sha256Fn = (data) => {
  return Buffer.from(sha256(Buffer.from(data)));
};

// 4. Patch all known access points
crypto.hashes.sha256 = sha256Fn;
crypto.hashes.hmacSha256 = hmacSha256;
crypto.hashes.hmacSha256Sync = hmacSha256;

crypto.sha256 = sha256Fn;
crypto.hmacSha256 = hmacSha256;
crypto.hmacSha256Sync = hmacSha256;

// 5. Export the patched objects
export const { Psbt, Transaction, payments, networks, ECPair } = bitcoinjs;
