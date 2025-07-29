import { sha256 } from "@noble/hashes/sha256";
import { hmac } from "@noble/hashes/hmac";
import { Buffer } from "buffer";

export const patchBitcoinCrypto = async () => {
  const bitcoinjs = await import("bitcoinjs-lib");

  bitcoinjs.crypto = {
    ...bitcoinjs.crypto,
    sha256: (buffer) => Buffer.from(sha256(Buffer.from(buffer))),
    hmacSha256Sync: (key, data) => {
      const keyBytes = typeof key === "string" ? Buffer.from(key, "utf8") : Buffer.from(key);
      const dataBytes = typeof data === "string" ? Buffer.from(data, "utf8") : Buffer.from(data);
      return Buffer.from(hmac(sha256, keyBytes, dataBytes));
    },
  };

  return bitcoinjs;
};
