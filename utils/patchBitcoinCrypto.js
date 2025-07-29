// utils/patchBitcoinCrypto.js

import * as bitcoinjs from "bitcoinjs-lib";
import * as ecc from "@noble/secp256k1";
import { sha256 } from "@noble/hashes/sha256";
import { hmac } from "@noble/hashes/hmac";
import { Buffer } from "buffer";

// Provide ECC methods (for ECPair signing etc.)
bitcoinjs.initEccLib(ecc);

// Monkey-patch the crypto used inside PSBT
bitcoinjs.crypto.sha256 = (buffer) => Buffer.from(sha256(Buffer.from(buffer)));
bitcoinjs.crypto.hmacSha256Sync = (key, data) => {
  const keyBytes = Buffer.isBuffer(key) ? key : Buffer.from(key);
  const dataBytes = Buffer.isBuffer(data) ? data : Buffer.from(data);
  return Buffer.from(hmac(sha256, keyBytes, dataBytes));
};

export const { Psbt, Transaction, payments, networks, ECPair } = bitcoinjs;
