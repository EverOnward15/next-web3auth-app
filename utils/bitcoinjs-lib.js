// utils/bitcoinjs-lib.js
import * as bitcoinjs from "bitcoinjs-lib/original";      // see below for “original” alias
import tinysecp      from "tiny-secp256k1";
import { sha256 }    from "@noble/hashes/sha256";
import { hmac }      from "@noble/hashes/hmac";
import { Buffer }    from "buffer";

// 1) polyfill Buffer
if (typeof window !== "undefined" && !window.Buffer) {
  window.Buffer = Buffer;
}

// 2) ECC backend
bitcoinjs.initEccLib(tinysecp);

// 3) patch hashes
const c = bitcoinjs.crypto;
c.hashes            = c.hashes || {};
c.hashes.sha256     = buf => Buffer.from(sha256(Buffer.from(buf)));
c.hashes.hmacSha256Sync = c.hashes.hmacSha256 =
  (k,d) => Buffer.from(hmac(sha256, Buffer.from(k), Buffer.from(d)));
c.hmacSha256Sync = c.hashes.hmacSha256Sync;
c.hmacSha256     = c.hashes.hmacSha256;

// 4) re-export
export const { Psbt, Transaction, payments, networks, ECPair } = bitcoinjs;
export default bitcoinjs;
