// app/providers.js
"use client"; // Keep this here

import { useEffect, useState } from 'react';

// 1) Expose Buffer globally (if not already)
import { Buffer } from "buffer";
if (typeof window !== "undefined") {
  window.Buffer = Buffer;
}

// Do NOT import bitcoin and secp at the top level like this if you're getting "Failed to resolve module specifier"
// import * as secp from "@noble/secp256k1"; // REMOVE THIS LINE
// import * as bitcoin from "bitcoinjs-lib"; // REMOVE THIS LINE

// Keep noble hashes imports, as they are used directly by the patch functions you define
import { sha256 } from "@noble/hashes/sha256";
import { hmac } from "@noble/hashes/hmac";
import { ripemd160 } from "@noble/hashes/ripemd160";

export default function CryptoPatchProvider({ children }) {
  const [isPatched, setIsPatched] = useState(false);

  useEffect(() => {
    async function applyCryptoPatches() {
      // Dynamically import these modules inside useEffect
      // This ensures they are processed by Webpack and available in the client bundle
      // before their properties are accessed for patching.
      const secp = await import("@noble/secp256k1");
      const bitcoin = await import("bitcoinjs-lib");

      // 2) Patch noble-secp256k1
      secp.utils.hmacSha256Sync = (key, ...msgs) => hmac(sha256, key, ...msgs);
      console.log("CryptoPatchProvider: secp.utils.hmacSha256Sync patched.");

      // 3) Patch bitcoinjs-lib
      bitcoin.crypto.sha256 = (b) => Buffer.from(sha256(b));
      bitcoin.crypto.hash256 = (b) => Buffer.from(sha256(sha256(b)));
      bitcoin.crypto.ripemd160 = (b) => Buffer.from(ripemd160(b));
      bitcoin.crypto.hmacSha256 = (k, b) => Buffer.from(hmac(sha256, k, b));
      bitcoin.crypto.hmacSha256Sync = (k, b) => Buffer.from(hmac(sha256, k, b));
      console.log("CryptoPatchProvider: bitcoin.crypto patched.");

      setIsPatched(true);
    }

    applyCryptoPatches();
  }, []); // Run once on component mount

  // Render children only after patches are applied (optional, but good for certainty)
  if (!isPatched) {
    return null; // Or a loading spinner
  }

  return children;
}