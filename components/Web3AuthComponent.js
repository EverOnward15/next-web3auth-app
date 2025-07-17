"use client";
import { useEffect, useState } from "react";
import { Web3Auth } from "@web3auth/single-factor-auth";
import { CHAIN_NAMESPACES, WEB3AUTH_NETWORK } from "@web3auth/base";
import { CommonPrivateKeyProvider } from "@web3auth/base-provider";
import { ECPair, networks, payments } from "bitcoinjs-lib";
import { Buffer } from "buffer";
import styles from "../components/Web3AuthComponent.module.css";

// Polyfill Buffer in browser
if (typeof window !== "undefined") {
  window.Buffer = Buffer;
}

const CLIENT_ID =
  "BJMWhIYvMib6oGOh5c5MdFNV-53sCsE-e1X7yXYz_jpk2b8ZwOSS2zi3p57UQpLuLtoE0xJAgP0OCsCaNJLBJqY";

function deriveBTCWallet(provider) {
  return provider
    .request({ method: "private_key" })
    .then((privateKeyHex) => {
      const existing = localStorage.getItem("btc_wallet");
      if (existing) {
        const wallet = JSON.parse(existing);
        alert(`Wallet already exists: ${wallet.address}`);
        return wallet;
      }

      const hex = privateKeyHex.startsWith("0x")
        ? privateKeyHex.slice(2)
        : privateKeyHex;
      const buf = Buffer.from(hex, "hex");

      const keyPair = ECPair.fromPrivateKey(buf, { network: networks.testnet });
      const { address } = payments.p2pkh({
        pubkey: keyPair.publicKey,
        network: networks.testnet,
      });

      const wallet = { address, privateKey: privateKeyHex };
      localStorage.setItem("btc_wallet", JSON.stringify(wallet));
      alert(`Wallet created: ${address}`);
      return wallet;
    });
}

export default function Web3AuthComponent() {
  const [web3auth, setWeb3auth] = useState(null);
  const [provider, setProvider] = useState(null);
  const [user, setUser] = useState(null);
  const [telegramUser, setTelegramUser] = useState(null);
  const [jwtToken, setJwtToken] = useState(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [skipRestore, setSkipRestore] = useState(false);

  // Initialize Web3Auth
  useEffect(() => {
    (async () => {
      try {
        const privateKeyProvider = new CommonPrivateKeyProvider({
          config: {
            chainConfig: {
              chainNamespace: CHAIN_NAMESPACES.OTHER,
              chainId: "0x1",
              rpcTarget: "https://dummy-rpc.com",
              displayName: "Bitcoin",
              blockExplorerUrl: "https://blockstream.info/testnet/",
              ticker: "BTC",
              tickerName: "Bitcoin",
            },
          },
        });

        const w3a = new Web3Auth({
          clientId: CLIENT_ID,
          web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
          privateKeyProvider,
        });
        await w3a.init();
        setWeb3auth(w3a);
      } catch (err) {
        console.error(err);
        alert(`Init error: ${err.message}`);
      }
    })();
  }, []);

  // Telegram WebApp init
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-web-app.js";
    script.async = true;
    script.onload = () => {
      const tg = window.Telegram?.WebApp;
      if (tg) {
        tg.ready();
        const u = tg.initDataUnsafe?.user;
        if (u) {
          setTelegramUser(u);
          fetch("/api/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(u),
          })
            .then((r) => r.json())
            .then((d) => setJwtToken(d.token))
            .catch(console.error);
        }
      }
    };
    document.body.appendChild(script);
  }, []);

  const handleLogin = async () => {
    if (!web3auth || !jwtToken || !telegramUser) return;
    setIsLoggingIn(true);
    try {
      await web3auth.connect({
        verifier: "telegram-jwt-verifier",
        verifierId: telegramUser.id.toString(),
        idToken: jwtToken,
      });
      const prov = web3auth.provider;
      setProvider(prov);
      const u = await web3auth.getUserInfo();
      setUser(u);
      localStorage.setItem("web3auth_logged_in", "true");
    } catch (err) {
      console.error(err);
      alert(`Login error: ${err.message}`);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const tryRestore = async () => {
    if (!web3auth || skipRestore) return;
    const tok = localStorage.getItem("jwt_token");
    const logged = localStorage.getItem("web3auth_logged_in");
    if (logged && tok) {
      try {
        await web3auth.connect({
          verifier: "telegram-jwt-verifier",
          verifierId: localStorage.getItem("telegram_id"),
          idToken: tok,
        });
        setProvider(web3auth.provider);
        setUser(await web3auth.getUserInfo());
      } catch {
        localStorage.clear();
      }
    }
  };
  useEffect(() => { tryRestore(); }, [web3auth]);

  const handleLogout = async () => {
    await web3auth?.logout();
    localStorage.clear();
    setSkipRestore(true);
    setProvider(null);
    setUser(null);
  };

  const checkKey = async () => {
    if (!provider) return alert("Provider missing");
    try {
      const hex = (await provider.request({ method: "private_key" })).replace(/^0x/, "");
      const buf = Buffer.from(hex, "hex");
      const kp = ECPair.fromPrivateKey(buf, { network: networks.testnet });
      const { address } = payments.p2pkh({ pubkey: kp.publicKey, network: networks.testnet });
      alert(`Address: ${address}`);
    } catch (e) {
      alert(`Key/Address error: ${e.message}`);
    }
  };

  const checkLogin = async () => {
    if (web3auth?.connected) {
      const u = await web3auth.getUserInfo();
      alert(JSON.stringify(u, null, 2));
    } else alert("Not logged in");
  };

  return (
    <div className={styles.container}>
      {!provider ? (
        <button className={styles.button} onClick={handleLogin} disabled={isLoggingIn}>
          {jwtToken ? "Login" : "Waiting…"}
        </button>
      ) : (
        <>
          <button className={styles.button} onClick={checkKey}>Check BTC Private Key</button>
          <button className={styles.button} onClick={checkLogin}>Check Web3Auth Login</button>
          <button className={styles.button} onClick={() => deriveBTCWallet(provider)}>Create BTC Wallet</button>
          <button className={styles.button} onClick={handleLogout}>Logout</button>
        </>
      )}
    </div>
  );
}
