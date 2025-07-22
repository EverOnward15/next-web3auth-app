import { payments, networks } from 'bitcoinjs-lib';
import * as secp from '@noble/secp256k1';

export async function POST(req) {
  try {
    const bodyText = await req.text();
    const { privateKeyHex } = JSON.parse(bodyText);

    if (!privateKeyHex || typeof privateKeyHex !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid privateKeyHex' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const hex = privateKeyHex.trim().replace(/^0x/, '').toLowerCase();

    if (!/^[a-f0-9]{64}$/.test(hex)) {
      return new Response(
        JSON.stringify({ error: 'privateKeyHex must be a 64-character hex string.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const privateKeyBytes = Uint8Array.from(Buffer.from(hex, 'hex'));

    if (privateKeyBytes.length !== 32) {
      return new Response(JSON.stringify({ error: 'Private key must be 32 bytes.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const publicKey = secp.getPublicKey(privateKeyBytes, true); // compressed = true

    const { address } = payments.p2pkh({
      pubkey: Buffer.from(publicKey),
      network: networks.testnet, // Or networks.bitcoin for mainnet
    });

    return new Response(JSON.stringify({ address }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
