// // app/providers.js
// "use client";

// import { useEffect, useState } from 'react';
// import { Buffer } from "buffer";
// import { sha256 } from "@noble/hashes/sha256";
// import { hmac } from "@noble/hashes/hmac";
// import { ripemd160 } from "@noble/hashes/ripemd160";

// if (typeof window !== "undefined") {
//   window.Buffer = Buffer;
// }

// export default function CryptoPatchProvider({ children }) {
//   const [isPatched, setIsPatched] = useState(false);

//   useEffect(() => {
//     async function applyCryptoPatches() {
//       try {
//         // Patch noble-secp256k1 first
//         const secp = await import("@noble/secp256k1");
//         secp.utils.hmacSha256Sync = (key, ...msgs) => hmac(sha256, key, ...msgs);
//         secp.utils.sha256Sync = (b) => sha256(b);
        
//         // Then patch bitcoinjs-lib
//         const bitcoin = await import("bitcoinjs-lib");
        
//         // Create a complete crypto implementation
//         const cryptoImpl = {
//           sha256: (b) => Buffer.from(sha256(b)),
//           hash256: (b) => Buffer.from(sha256(sha256(b))),
//           ripemd160: (b) => Buffer.from(ripemd160(b)),
//           hmacSha256: (k, b) => Buffer.from(hmac(sha256, k, b)),
//           hmacSha256Sync: (k, b) => Buffer.from(hmac(sha256, k, b))
//         };

//         // Replace the entire crypto module
//         bitcoin.crypto = cryptoImpl;
        
//         console.log("Crypto patches applied successfully");
//         setIsPatched(true);
//       } catch (err) {
//         console.error("Failed to apply crypto patches:", err);
//         throw err;
//       }
//     }

//     applyCryptoPatches();
//   }, []);

//   if (!isPatched) {
//     return <div>Initializing cryptography...</div>;
//   }

//   return children;
// }