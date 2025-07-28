// patchSecp256k1.js
import { hmac } from '@noble/hashes/hmac';
import { sha256 } from '@noble/hashes/sha256';
import * as secp from '@noble/secp256k1';

secp.utils.hmacSha256Sync = (key, ...msgs) => hmac(sha256, key, ...msgs);

export { secp };
