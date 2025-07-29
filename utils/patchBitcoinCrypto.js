// patchedBitcoin.js
import { sha256 } from "@noble/hashes/sha256";
import { hmac } from "@noble/hashes/hmac";
import { Buffer } from "buffer";
import * as bitcoinjs from "bitcoinjs-lib";

bitcoinjs.crypto = {
  ...bitcoinjs.crypto,
  sha256: (buffer) => Buffer.from(sha256(Buffer.from(buffer))),
  hmacSha256Sync: (key, data) => {
    const keyBytes = Buffer.isBuffer(key) ? key : Buffer.from(key);
    const dataBytes = Buffer.isBuffer(data) ? data : Buffer.from(data);
    return Buffer.from(hmac(sha256, keyBytes, dataBytes));
  },
};

export default bitcoinjs;
