"use client";

import { useEffect, useState } from "react";
import { Web3AuthMPCCoreKit, WEB3AUTH_NETWORK } from "@web3auth/mpc-core-kit";
import { OpenloginAdapter } from "@web3auth/openlogin-adapter";
import { tssLib } from "@toruslabs/tss-dkls-lib";
import { WALLET_CONNECTORS, AUTH_CONNECTION } from "@web3auth/mpc-core-kit";
// import { StorageKey } from "@web3auth/base";

import * as bitcoin from "bitcoinjs-lib";
import { ECPairFactory } from "ecpair";
import * as tinysecp from "tiny-secp256k1";

import styles from "../components/Web3AuthComponent.module.css";

import { Buffer } from "buffer";
if (typeof window !== "undefined") {
  window.Buffer = Buffer;
}

const ECPair = ECPairFactory(tinysecp);

const CLIENT_ID =
  "BJMWhIYvMib6oGOh5c5MdFNV-53sCsE-e1X7yXYz_jpk2b8ZwOSS2zi3p57UQpLuLtoE0xJAgP0OCsCaNJLBJqY";

function deriveBTCWallet(provider) {
  return provider.request({ method: "private_key" }).then((privateKeyHex) => {
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

export default function Web3AuthComponent() {
  const [web3auth, setWeb3auth] = useState(null);
  const [provider, setProvider] = useState(null);
  const [user, setUser] = useState(null);
  const [telegramUser, setTelegramUser] = useState(null);
  const [jwtToken, setJwtToken] = useState(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [adapter, setAdapter] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        const web3authInstance = new Web3AuthMPCCoreKit({
          web3AuthClientId: CLIENT_ID,
          web3AuthNetwork: WEB3AUTH_NETWORK.DEVNET, // or use "WEB3AUTH_NETWORK.TESTNET" if you import the enum
          manualSync: true,
          tssLib: tssLib,
        storage: window.localStorage,
        });

        await web3authInstance.init();

        setWeb3auth(web3authInstance);
        setProvider(web3authInstance.provider);
      } catch (err) {
        console.error("Web3Auth init error:", err);
        alert("Web3 Auth init error: " + err);
      }
    };

    init();
  }, []);

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
          fetch("/api/jwks", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(userData),
          })
            .then((res) => res.json())
            .then((data) => {
              setJwtToken(data.token);
              alert(data.token);
              console.log("Received JWT Token:", data.token);
            })
            .catch((err) => console.error("JWT error:", err));
        }
      }
    };
    document.body.appendChild(script);
  }, []);

  const handleLogin = async () => {
    if (!web3auth || !jwtToken) {
      alert("Web3Auth not ready or JWT missing");
      return;
    }

    try {
      setIsLoggingIn(true);

      const provider = await web3auth.connectTo(WALLET_CONNECTORS.AUTH, {
        authConnection: AUTH_CONNECTION.CUSTOM,
        authConnectionId: "telegram-jwt-verifier", // This must match the verifier set in your Web3Auth dashboard
        idToken: jwtToken,
        extraLoginOptions: {
          isUserIdCaseSensitive: false,
        },
      });

      setProvider(provider);

      const userInfo = await web3auth.getUserInfo();
      setUser(userInfo);

      const privateKey = await provider.request({ method: "private_key" });
      if (privateKey) {
        alert("Key returned: " + privateKey.slice(0, 10) + "...");
        console.log("Private Key:", privateKey);
      } else {
        alert("No key returned.");
      }
    } catch (err) {
      console.error("Login error:", err);
      alert("Login failed: " + err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    if (!web3auth) return;
    await web3auth.logout();
    setUser(null);
    setProvider(null);
  };

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
      <h1 className={styles.title}>MVP Wallet Login - JWT Kit</h1>
      <h2 className={styles.subtitle}>Tech: Web3Auth Core + Next.js</h2>

      {!provider ? (
        <button
          className={styles.button}
          onClick={handleLogin}
          disabled={isLoggingIn}
        >
          {jwtToken
            ? "Login via Telegram (JWT)"
            : "Waiting for Telegram Login..."}
        </button>
      ) : (
        <>
          <button className={styles.button} onClick={handleGetAccounts}>
            Get Address
          </button>
          <button className={styles.button} onClick={handleLogout}>
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
