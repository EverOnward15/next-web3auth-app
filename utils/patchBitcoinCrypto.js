// utils/patchBitcoinCrypto.js
import * as bitcoinjs from "bitcoinjs-lib";
import tinysecp from "tiny-secp256k1";

// Polyfill Buffer in browsers
import { Buffer } from "buffer";
if (typeof window !== "undefined" && !window.Buffer) {
  window.Buffer = Buffer;
}

// Initialize bitcoinjs-lib with the complete tiny-secp256k1 API
bitcoinjs.initEccLib(tinysecp);
