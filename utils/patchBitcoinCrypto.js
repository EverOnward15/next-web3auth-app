// utils/patchBitcoinCrypto.js
import * as bitcoinjs from "bitcoinjs-lib";
import tinysecp from "tiny-secp256k1";
import { sha256 } from "@noble/hashes/sha256";
import { hmac } from "@noble/hashes/hmac";
import { Buffer } from "buffer";

// 1) Browser Buffer polyfill
if (typeof window !== "undefined" && !window.Buffer) {
  window.Buffer = Buffer;
}

// 2) Install the ECC backend
bitcoinjs.initEccLib(tinysecp);

// 3) Ensure the `hashes` namespace exists
const c = bitcoinjs.crypto;
if (!c.hashes) c.hashes = {};

// 4) Patch SHA-256
c.hashes.sha256 = (buf) =>
  Buffer.from(sha256(Buffer.from(buf)));

// 5) Patch HMAC-SHA256 (sync)
c.hashes.hmacSha256 = (key, data) =>
  Buffer.from(
    hmac(
      sha256,
      Buffer.isBuffer(key) ? key : Buffer.from(key),
      Buffer.isBuffer(data) ? data : Buffer.from(data)
    )
  );
c.hashes.hmacSha256Sync = c.hashes.hmacSha256;

// 6) Aliases (some internal paths look up these)
c.hmacSha256        = c.hashes.hmacSha256;
c.hmacSha256Sync    = c.hashes.hmacSha256Sync;
bitcoinjs.crypto    = { ...c, hashes: c.hashes };

// 7) Finally export
export const { Psbt, Transaction, payments, networks, ECPair } = bitcoinjs;
