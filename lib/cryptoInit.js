// cryptoInit.js
let cryptoPromise;

export function initializeCrypto() {
  if (cryptoPromise) return cryptoPromise;

  cryptoPromise = (async () => {
    const secp = await import("@noble/secp256k1");
    const bitcoin = await import("bitcoinjs-lib");
    const { hmac } = await import("@noble/hashes/hmac");
    const { sha256 } = await import("@noble/hashes/sha256");
    const { ripemd160 } = await import("@noble/hashes/ripemd160");
const { utils: secpUtils } = await import('@noble/secp256k1');
const hashesShim = {
  hmacSha256Sync: (key, msg) => hmac(sha256, key, msg),
};

globalThis.hashes = globalThis.hashes || hashesShim;
window.hashes = window.hashes || hashesShim;

    // Patch noble-secp256k1
    secp.utils.hmacSha256Sync = (key, ...msgs) => {
      alert("hmacSha256Sync is set in cryptoInit.js");
      return hmac(sha256, key, ...msgs);
    };
    secp.utils.sha256Sync = (b) => sha256(b);

    

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
