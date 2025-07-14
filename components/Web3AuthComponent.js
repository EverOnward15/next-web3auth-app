'use client';

import { useEffect, useState } from "react";
import { Web3Auth } from "@web3auth/modal";
import { OpenloginAdapter } from "@web3auth/openlogin-adapter";
import { CHAIN_NAMESPACES } from "@web3auth/base";
import * as bitcoin from 'bitcoinjs-lib';
import * as bip39 from 'bip39';
import * as bip32 from 'bip32';
import TKey from "@tkey/core";
import WebStorageModule from "@tkey/web-storage";
import { ECPairFactory } from 'ecpair';
import * as tinysecp from 'tiny-secp256k1';


import styles from "../components/Web3AuthComponent.module.css";

const clientId = process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID;
const ECPair = ECPairFactory(tinysecp);


export default function Web3AuthComponent() {
  const [web3auth, setWeb3auth] = useState(null);
  const [provider, setProvider] = useState(null);
  const [user, setUser] = useState(null);
  const [telegramUser, setTelegramUser] = useState(null);
  const [jwtToken, setJwtToken] = useState(null);

  const deriveBTCWallet = async (web3authInstance) => {
  const privKeyProvider = web3authInstance.provider;
  const privateKeyHex = await privKeyProvider.request({
    method: "private_key"
  });

  // Convert hex to Buffer
  const privateKeyBuffer = Buffer.from(privateKeyHex, "hex");

  // Generate BTC address
  const keyPair = ECPair.fromPrivateKey(privateKeyBuffer, {
  network: bitcoin.networks.testnet,
});


  const { address } = bitcoin.payments.p2pkh({
    pubkey: keyPair.publicKey,
    network: bitcoin.networks.testnet,
  });

  return {
    address,
    privateKey: privateKeyHex,
  };
};

  // Init Web3Auth on mount
  useEffect(() => {
    const init = async () => {
      if (!clientId) {
        console.log("Web3Auth clientID missing.");
        console.warn("Web3Auth clientId missing");
        alert("Web3Auth clientID missing.")
        return;
      }

      try {
        const web3authInstance = new Web3Auth({
          clientId,
          web3AuthNetwork: "testnet",
        chainConfig: {
  chainNamespace: CHAIN_NAMESPACES.OTHER,
}
        });

        const openloginAdapter = new OpenloginAdapter({
          adapterSettings: {
            network: "testnet",
            uxMode: "popup",
            loginConfig: {
            jwt: {
              verifier: "telegram-jwt-verifier", // must match your Web3Auth dashboard
              typeOfLogin: "jwt",
              clientId, // same as your Web3Auth project ID
            },
          },
          },
        });


// 👇 NEW: Add adapter using .configureAdapter() before initModal()
web3authInstance.configureAdapter(openloginAdapter);
// OR 👇 BETTER in v6+
web3authInstance.initModal({
  modalConfig: {
    // optional config here
  },
});
        await web3authInstance.initModal();

        setWeb3auth(web3authInstance);

        if (web3authInstance.connected) {
          const provider = web3authInstance.provider;
          setProvider(provider);
          const userInfo = await web3authInstance.getUserInfo();
          setUser(userInfo);
        }
      } catch (err) {
        console.error("Web3Auth init error:", err);
        alert("Web3Auth init error:" + err);
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
        alert("Telegram WebApp user:", userData);

        // Optional: Send to backend to generate JWT
        fetch("/api/telegram-jwt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userData),
        })
          .then((res) => res.json())
          .then((data) => {
            setJwtToken(data.token);
            alert("JWT token from Telegram WebApp:", data.token);
          })
          .catch((err) => {
  console.error("JWT error:", err);
  alert("JWT Error: " + err.message);
});
      } else {
        console.warn("No user data in Telegram context");
        alert("No user data in Telegram context");
      }
    } else {
      console.warn("Telegram WebApp not available");
      alert("Telegram WebApp not available");
    }
  };
  document.body.appendChild(script);
}, []);


const loginWithTelegramJWT = async () => {
  if (!web3auth || !jwtToken) {
    console.warn("Web3Auth or JWT not available");
    alert("Web3Auth or JWT not available", + err);
    return;
  }

  try {
    const provider = await web3auth.connectTo("openlogin", {
      loginProvider: "jwt",
      extraLoginOptions: {
        id_token: jwtToken,
        verifierIdField: "sub", // or "email" or "name", based on your JWT content
        domain: "https://next-web3auth-app.vercel.app/api/jwks", // optional
      },
    });

    setProvider(provider);
    const userInfo = await web3auth.getUserInfo();
    setUser(userInfo);
    alert("Login successful. Web3Auth user: " + JSON.stringify(userInfo));
  } catch (err) {
    console.error("JWT Web3Auth login error:", err);
    alert("JWT Web3Auth login error" + err.message);
  }
};

useEffect(() => {
  if (jwtToken && web3auth) {
    loginWithTelegramJWT();
  }
}, [jwtToken, web3auth]);

  const logout = async () => {
    if (!web3auth) return;
    try {
      await web3auth.logout();
      setProvider(null);
      setUser(null);
      setTelegramUser(null);
      setJwtToken(null);
    } catch (err) {
      console.error("Web3Auth logout error:", err);
      alert("Web3Auth logout error:" + err);
    }
  };

  const getAccounts = async () => {
    if (!web3auth) return;
    try {
      const btcWallet = await deriveBTCWallet(web3auth);
      const address = btcWallet.address;

      const res = await fetch(`https://blockstream.info/testnet/api/address/${address}`);
      const data = await res.json();

      const balance = data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum;

      alert(`BTC Address: ${address}\nBalance: ${balance / 1e8} tBTC`);
      console.log("BTC Wallet Info:", btcWallet, "Balance:", balance);
    } catch (err) {
      console.error("BTC Wallet Derivation Error:", err);
      alert("BTC Wallet Derivation Error:" + err);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>MVP Wallet Login - Test Phase 4</h1>
      <h2 className={styles.subtitle}>Tech: Web3Auth + Next.js (JS)</h2>

      {!provider ? (
        <button className={styles.button} onClick={loginWithTelegramJWT}>
          Login via Web3Auth
        </button>
      ) : (
        <>
          <button onClick={getAccounts}>Get Address</button>
          <button onClick={logout}>Logout</button>
        </>
      )}

      <div id="telegram-login" style={{ marginTop: 20 }} />

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
