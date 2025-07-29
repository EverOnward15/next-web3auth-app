// utils/patchBitcoinCrypto.js
import tinysecp from 'tiny-secp256k1';
import * as bitcoinjs from 'bitcoinjs-lib';
import { Buffer } from 'buffer';
import { sha256 } from '@noble/hashes/sha256';
import { hmac } from '@noble/hashes/hmac';

// Polyfill Buffer
if (typeof window !== 'undefined' && !window.Buffer) window.Buffer = Buffer;

// Init ECC
bitcoinjs.initEccLib(tinysecp);

// *Immediately* hack PSBT’s internal crypto reference:
{
  // Grab the exact module PSBT uses internally
  const psbtModule = require('bitcoinjs-lib/src/psbt'); 
  const hashes = bitcoinjs.crypto.hashes || (bitcoinjs.crypto.hashes = {});

  // Override every possible HMAC lookup
  hashes.hmacSha256    = (k,d) => Buffer.from(hmac(sha256, Buffer.from(k), Buffer.from(d)));
  hashes.hmacSha256Sync= hashes.hmacSha256;
  bitcoinjs.crypto.hmacSha256    = hashes.hmacSha256;
  bitcoinjs.crypto.hmacSha256Sync= hashes.hmacSha256;
}

// Export your patched APIs
export const { Psbt, Transaction, payments, networks, ECPair } = bitcoinjs;
