"use client";

import { useEffect, useState } from "react";
import {
  Web3AuthProvider,
  useWeb3Auth,
} from "@web3auth/modal/react";

import * as bitcoin from "bitcoinjs-lib";
import { ECPairFactory } from "ecpair";
import * as tinysecp from "tiny-secp256k1";

import styles from "../components/Web3AuthComponent.module.css";

import { Buffer } from "buffer";
if (typeof window !== "undefined") {
  window.Buffer = Buffer;
}

const ECPair = ECPairFactory(tinysecp);

// ✅ Move this to env var if possible
const CLIENT_ID = "BJMWhIYvMib6oGOh5c5MdFNV-..."; // Your actual ID

function deriveBTCWallet(provider) {
  return provider
    .request({ method: "private_key" })
    .then((privateKeyHex) => {
      const privateKeyBuffer = Buffer.from(privateKeyHex, "hex");
      const keyPair = ECPair.fromPrivateKey(privateKeyBuffer, {
        network: bitcoin.networks.testnet,
      });
      const { address } = bitcoin.payments.p2pkh({
        pubkey: keyPair.publicKey,
        network: bitcoin.networks.testnet,
      });

      return { address, privateKey: privateKeyHex };
    });
}

function Web3AuthInner() {
  const {
    web3auth,
    provider,
    user,
    login,
    logout,
  } = useWeb3Auth();

  const [telegramUser, setTelegramUser] = useState(null);
  const [jwtToken, setJwtToken] = useState(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-web-app.js";
    script.async = true;
    script.onload = () => {
      if (window.Telegram?.WebApp) {
        const tg = window.Telegram.WebApp;
        tg.ready();
        const userData = tg.initDataUnsafe?.user;
        if (userData) {
          setTelegramUser(userData);
          fetch("/api/telegram-jwt", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(userData),
          })
            .then((res) => res.json())
            .then((data) => setJwtToken(data.token))
            .catch((err) => console.error("JWT error:", err));
        }
      }
    };
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (jwtToken && web3auth) {
      login("openlogin", {
        loginProvider: "jwt",
        extraLoginOptions: {
          id_token: jwtToken,
          verifierIdField: "sub",
          domain: "next-web3auth-app.vercel.app",
        },
      }).catch(console.error);
    }
  }, [jwtToken, login, web3auth]);

  const handleGetAccounts = async () => {
    if (!provider) return;
    try {
      const btcWallet = await deriveBTCWallet(provider);
      const res = await fetch(
        `https://blockstream.info/testnet/api/address/${btcWallet.address}`
      );
      const data = await res.json();
      const balance =
        data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum;
      alert(
        `BTC Address: ${btcWallet.address}\nBalance: ${balance / 1e8} tBTC`
      );
    } catch (err) {
      alert("Error fetching BTC info: " + err.message);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>MVP Wallet Login - Test Phase 4</h1>
      <h2 className={styles.subtitle}>Tech: Web3Auth + Next.js (JS)</h2>

      {!provider ? (
        <button className={styles.button} onClick={() => login()}>
          Login via Web3Auth
        </button>
      ) : (
        <>
          <button className={styles.button} onClick={handleGetAccounts}>
            Get Address
          </button>
          <button className={styles.button} onClick={() => logout()}>
            Logout
          </button>
        </>
      )}

      {user && (
        <>
          <h3>Web3Auth User Info:</h3>
          <pre>{JSON.stringify(user, null, 2)}</pre>
        </>
      )}

      {telegramUser && (
        <>
          <h3>Telegram User Info:</h3>
          <pre>{JSON.stringify(telegramUser, null, 2)}</pre>
        </>
      )}

      {jwtToken && (
        <>
          <h3>JWT Token:</h3>
          <pre>{jwtToken}</pre>
        </>
      )}
    </div>
  );
}

export default function Web3AuthComponent() {
  if (!CLIENT_ID) {
    return <div>Error: Web3Auth client ID is missing</div>;
  }

  const web3AuthOptions = {
    clientId: CLIENT_ID,
    chainConfig: {
      chainNamespace: "eip155",
      chainId: "0x13881",
      rpcTarget: "https://rpc-mumbai.maticvigil.com",
    },
    openloginAdapterSettings: {
      network: "testnet",
    },
  };

  return (
    <Web3AuthProvider config={web3AuthOptions}>
      <Web3AuthInner />
    </Web3AuthProvider>
  );
}
