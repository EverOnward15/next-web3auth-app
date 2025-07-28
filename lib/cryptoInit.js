export async function initializeCrypto() {
  const secp = await import("@noble/secp256k1");
  const bitcoin = await import("bitcoinjs-lib");
  const { hmac } = await import("@noble/hashes/hmac");
  const { sha256 } = await import("@noble/hashes/sha256");
  const { ripemd160 } = await import("@noble/hashes/ripemd160");

  if (!cryptoInitialized) {
    secp.utils.hmacSha256Sync = (key, ...msgs) => hmac(sha256, key, ...msgs);
    secp.utils.sha256Sync = (b) => sha256(b);

    // ✅ Patch bitcoin.crypto globally for bip32 and others
    bitcoin.crypto = {
      ...bitcoin.crypto,
      ripemd160: (buffer) => ripemd160(buffer),
      sha256: (buffer) => sha256(buffer),
      hmacSha256Sync: (key, data) => hmac(sha256, key, data), // <== this fixes your error
    };

    cryptoInitialized = true;
  }

  return { secp, bitcoin };
}
