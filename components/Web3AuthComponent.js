'use client';

import { useEffect, useState } from "react";
import { Web3Auth } from "@web3auth/modal";
import { OpenloginAdapter } from "@web3auth/openlogin-adapter";
import { CHAIN_NAMESPACES } from "@web3auth/base";
import { ethers } from "ethers";
import styles from "../components/Web3AuthComponent.module.css";

const clientId = process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID;

export default function Web3AuthComponent() {
  const [web3auth, setWeb3auth] = useState(null);
  const [provider, setProvider] = useState(null);
  const [user, setUser] = useState(null);
  const [telegramUser, setTelegramUser] = useState(null);
  const [jwtToken, setJwtToken] = useState(null);

  // Init Web3Auth on mount
  useEffect(() => {
    const init = async () => {
      if (!clientId) {
        console.warn("Web3Auth clientId missing");
        return;
      }

      try {
        const web3authInstance = new Web3Auth({
          clientId,
          web3AuthNetwork: "sapphire_devnet",
        chainConfig: {
  chainNamespace: CHAIN_NAMESPACES.EIP155,
  chainId: "0x13881", // for Goerli testnet, or check what Sapphire Devnet uses
  rpcTarget: "https://80001.rpc.thirdweb.com",
}
        });

        const openloginAdapter = new OpenloginAdapter({
          adapterSettings: {
            network: "sapphire_devnet",
            uxMode: "popup",
          },
        });

        web3authInstance.configureAdapter(openloginAdapter);
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
        console.log("Telegram WebApp user:", userData);

        // Optional: Send to backend to generate JWT
        fetch("/api/telegram-jwt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userData),
        })
          .then((res) => res.json())
          .then((data) => {
            setJwtToken(data.token);
            console.log("JWT token from Telegram WebApp:", data.token);
          })
          .catch((err) => console.error("JWT error:", err));
      } else {
        console.warn("No user data in Telegram context");
      }
    } else {
      console.warn("Telegram WebApp not available");
    }
  };
  document.body.appendChild(script);
}, []);


const login = async () => {
  if (!web3auth) return;
  try {
    const provider = await web3auth.connect();
    setProvider(provider);
    const userInfo = await web3auth.getUserInfo();
    setUser(userInfo);
  } catch (err) {
    console.error("Web3Auth login error:", err);
  }
};



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
    }
  };

  const getAccounts = async () => {
    if (!provider) return;
    const ethersProvider = new ethers.BrowserProvider(provider);
    const signer = await ethersProvider.getSigner();
    const address = await signer.getAddress();
    alert(`Address: ${address}`);
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>MVP Wallet Login - Test Phase 4</h1>
      <h2 className={styles.subtitle}>Tech: Web3Auth + Next.js (JS)</h2>

      {!provider ? (
        <button className={styles.button} onClick={login}>
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
