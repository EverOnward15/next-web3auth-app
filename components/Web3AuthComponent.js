"use client";
import { useEffect, useState } from "react";
import { Web3Auth } from "@web3auth/single-factor-auth";
// import { tssLib } from "@toruslabs/tss-dkls-lib";
import * as bitcoin from "bitcoinjs-lib";
import { ECPairFactory } from "ecpair";
import * as tinysecp from "tiny-secp256k1";
import styles from "../components/Web3AuthComponent.module.css";
import { CommonPrivateKeyProvider } from "@web3auth/base-provider";
import { Buffer } from "buffer";
if (typeof window !== "undefined") {
  window.Buffer = Buffer;
}
const ECPair = ECPairFactory(tinysecp);
const CLIENT_ID =
  "BJMWhIYvMib6oGOh5c5MdFNV-53sCsE-e1X7yXYz_jpk2b8ZwOSS2zi3p57UQpLuLtoE0xJAgP0OCsCaNJLBJqY";

/*------------------ Start of Code --------------------*/
function deriveBTCWallet(provider) {
  return provider.request({ method: "private_key" }).then((privateKeyHex) => {
    const existingWallet = localStorage.getItem("btc_wallet");

    if (existingWallet) {
      const wallet = JSON.parse(existingWallet);
      alert("Wallet already exists:\n" + wallet.address);
      return wallet;
    }

    const privateKeyBuffer = Buffer.from(privateKeyHex, "hex");
    const keyPair = ECPair.fromPrivateKey(privateKeyBuffer, {
      network: bitcoin.networks.testnet,
    });

    const { address } = bitcoin.payments.p2pkh({
      pubkey: keyPair.publicKey,
      network: bitcoin.networks.testnet,
    });

    const wallet = { address, privateKey: privateKeyHex };
    localStorage.setItem("btc_wallet", JSON.stringify(wallet));

    alert("Wallet created:\n" + address);
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

  useEffect(() => {
    const init = async () => {
      try {
        const privateKeyProvider = new CommonPrivateKeyProvider({
          config: {
            chainConfig: {
              chainNamespace: "other",
              chainId: "0x1", // Dummy, required
              rpcTarget: "", // Not needed for BTC
              displayName: "Bitcoin",
              blockExplorerUrl: "https://blockstream.info/testnet/",
              ticker: "BTC",
              tickerName: "Bitcoin",
            },
          },
        });

        const web3authInstance = new Web3Auth({
          clientId: CLIENT_ID,
          web3AuthNetwork: "devnet",
          privateKeyProvider,
        });

        await web3authInstance.init();

        setWeb3auth(web3authInstance);
        setProvider(web3authInstance.provider);
      } catch (err) {
        console.error("Web3Auth init error:", err);
        alert("Web3 Auth init error: " + err.message);
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
          fetch("/api/token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(userData),
          })
            .then((res) => res.json())
            .then((data) => {
              setJwtToken(data.token);
              alert(data);
              alert(data.token);
              alert("JWT data received");
              console.log("Received JWT Token:", data.token);
            })
            .catch((err) => console.error("JWT error:", err));
        }
      }
    };
    document.body.appendChild(script);
  }, []);

  const handleLogin = async () => {
    if (!web3auth) {
      alert("Web3Auth not ready");
      return;
    }
    if (!jwtToken) {
      alert("JWT token missing");
      return;
    }

    try {
      setIsLoggingIn(true);

      const provider = await web3auth.loginWithJWT({
        verifier: "telegram-jwt-verifier", // must match the verifier name from your Web3Auth dashboard
        verifierId: telegramUser.id.toString(), // can also use telegramUser.username
        idToken: jwtToken,
      });

      // Save session to localStorage
      localStorage.setItem("web3auth_logged_in", "true");
      localStorage.setItem("telegram_id", telegramUser.id.toString());
      localStorage.setItem("jwt_token", jwtToken);

      setProvider(provider);

      const userInfo = await web3auth.getUserInfo();
      setUser(userInfo);

      const privateKey = await provider.request({ method: "private_key" });
      if (privateKey) {
        alert("Key returned: " + privateKey.slice(0, 10) + "...");
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

  useEffect(() => {
    const tryRestoreSession = async () => {
      if (!web3auth) return;

      const isLoggedIn = localStorage.getItem("web3auth_logged_in");
      const storedToken = localStorage.getItem("jwt_token");
      const storedVerifierId = localStorage.getItem("telegram_id");

      if (isLoggedIn && storedToken && storedVerifierId) {
        try {
          const provider = await web3auth.loginWithJWT({
            verifier: "telegram-jwt-verifier",
            verifierId: storedVerifierId,
            idToken: storedToken,
          });

          setProvider(provider);

          const userInfo = await web3auth.getUserInfo();
          setUser(userInfo);
          setJwtToken(storedToken);
        } catch (err) {
          console.error("Session restore failed:", err);
          localStorage.clear(); // fallback
        }
      }
    };

    tryRestoreSession();
  }, [web3auth]);

  const handleLogout = async () => {
    if (!web3auth) return;
    await web3auth.logout();
    setUser(null);
    setProvider(null);
    localStorage.clear(); // Clear session
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

      {telegramUser && (
        <div style={{ marginBottom: "20px", textAlign: "center" }}>
          <p style={{ fontSize: "18px" }}>
            Welcome, <strong>{telegramUser.first_name}</strong>!
          </p>
          {telegramUser.photo_url && (
            <img
              src={telegramUser.photo_url}
              alt={`${telegramUser.first_name}'s profile`}
              style={{
                borderRadius: "50%",
                width: "100px",
                height: "100px",
                objectFit: "cover",
                marginTop: "10px",
              }}
            />
          )}
        </div>
      )}

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

      <button
        className={styles.button}
        onClick={() => deriveBTCWallet(provider)}
      >
        Create BTC Wallet
      </button>

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
