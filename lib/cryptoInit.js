let cryptoPromise;

export function initializeCrypto() {
  if (cryptoPromise) return cryptoPromise;

  cryptoPromise = (async () => {
    const secp = await import("@noble/secp256k1");
    const bitcoin = await import("bitcoinjs-lib");
    const { hmac } = await import("@noble/hashes/hmac");
    const { sha256 } = await import("@noble/hashes/sha256");
    const { ripemd160 } = await import("@noble/hashes/ripemd160");

    // ✅ Patch noble secp256k1 utils
    secp.utils.hmacSha256Sync = (key, ...msgs) => {
      console.log("✅ secp.utils.hmacSha256Sync patched");
      return hmac(sha256, key, ...msgs);
    };
    secp.utils.sha256Sync = sha256;

    // ✅ Patch global hashes object (required by some Bitcoin signer libs)
    const hashesShim = {
      hmacSha256Sync: (key, msg) => hmac(sha256, key, msg),
    };

    globalThis.hashes = globalThis.hashes || hashesShim;
    window.hashes = window.hashes || hashesShim;

    console.log("✅ typeof hashes.hmacSha256Sync:", typeof hashes.hmacSha256Sync);
    console.log("✅ typeof secp.utils.hmacSha256Sync:", typeof secp.utils.hmacSha256Sync);

    // ✅ Patch bitcoin.crypto explicitly (if needed)
    bitcoin.crypto = {
      ...bitcoin.crypto,
      ripemd160: (buffer) => ripemd160(buffer),
      sha256: (buffer) => sha256(buffer),
      hmacSha256Sync: (key, data) => hmac(sha256, key, data),
    };

    return { secp, bitcoin };
  })();

  return cryptoPromise;
}
