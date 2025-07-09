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
          web3AuthNetwork: "mainnet",
          chainConfig: {
            chainNamespace: CHAIN_NAMESPACES.EIP155,
            chainId: "0x1",
            rpcTarget: "https://rpc.ankr.com/eth",
          },
        });

        const openloginAdapter = new OpenloginAdapter({
          adapterSettings: {
            network: "mainnet",
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

  // Inject Telegram Widget on mount
  useEffect(() => {
    window.onTelegramAuth = async function (userData) {
      setTelegramUser(userData);
      console.log("Telegram user data:", userData);

      try {
        const res = await fetch("/api/telegram-jwt", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userData),
        });

        const data = await res.json();
        setJwtToken(data.token);
        console.log("JWT token:", data.token);
      } catch (error) {
        console.error("Error calling local JWT API:", error);
      }
    };

    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-widget.js?7";
    script.setAttribute("data-telegram-login", process.env.NEXT_PUBLIC_TELEGRAM_BOT || "WebThreeWallet_Bot");
    script.setAttribute("data-size", "large");
    script.setAttribute("data-userpic", "false");
    script.setAttribute("data-request-access", "write");
    // script.setAttribute("data-callback", "onTelegramAuth");
    script.setAttribute(
  "data-auth-url",
  "https://next-web3auth-app.vercel.app/api/telegram-auth"
); // 🔥 Add this line
script.async = true;

    document.getElementById("telegram-login")?.appendChild(script);
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
      <h1 className={styles.title}>MVP Wallet - Test Phase 2</h1>
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
