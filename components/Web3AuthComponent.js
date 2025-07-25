"use client";
import { useEffect, useState } from "react";
import { Web3Auth } from "@web3auth/single-factor-auth";
import { CHAIN_NAMESPACES, WEB3AUTH_NETWORK } from "@web3auth/base";
import styles from "../components/Web3AuthComponent.module.css";
import { CommonPrivateKeyProvider } from "@web3auth/base-provider";
import { Buffer } from "buffer";
if (typeof window !== "undefined") {
  window.Buffer = Buffer;
}

import { payments, networks } from "bitcoinjs-lib";
import * as secp from "@noble/secp256k1";

const CLIENT_ID =
  "BJMWhIYvMib6oGOh5c5MdFNV-53sCsE-e1X7yXYz_jpk2b8ZwOSS2zi3p57UQpLuLtoE0xJAgP0OCsCaNJLBJqY";

// Derive BTC address from private key
const deriveBTCAddress = async (privKey) => {
  const privKeyBuffer = Buffer.from(privKey, "hex");
  const pubkey = secp.getPublicKey(privKeyBuffer, true); // compressed
  const { address } = payments.p2wpkh({
    pubkey: Buffer.from(pubkey),
    network: networks.testnet,
  });
  return address;
};

const deriveBTCWallet = async (provider) => {
  try {
    const privateKey = await provider.request({
      method: "private_key",
    });

    const address = await deriveBTCAddress(privateKey);
    return { privateKey, address };
  } catch (err) {
    console.error("Error deriving BTC wallet:", err);
    return null;
  }
};

export default function Web3AuthComponent() {
  const [web3auth, setWeb3auth] = useState(null);
  const [provider, setProvider] = useState(null);
  const [user, setUser] = useState(null);
  const [telegramUser, setTelegramUser] = useState(null);
  const [jwtToken, setJwtToken] = useState(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [skipRestore, setSkipRestore] = useState(false);
  const [btcWallet, setBtcWallet] = useState(null);
  const [btcBalance, setBtcBalance] = useState(null);
  const [loadingBalance, setLoadingBalance] = useState(false);

  // Get Telegram user info
  useEffect(() => {
    const tgUser = window?.Telegram?.WebApp?.initDataUnsafe?.user;
    setTelegramUser(tgUser);

    const initData = window?.Telegram?.WebApp?.initData || "";
    const encoded = encodeURIComponent(initData);

    if (encoded) {
      fetch(`/api/auth?initData=${encoded}`)
        .then((res) => res.json())
        .then((data) => {
          if (data?.token) {
            setJwtToken(data.token);
          }
        })
        .catch((err) => console.error("JWT fetch error:", err));
    }
  }, []);

  // Initialize Web3Auth instance
  useEffect(() => {
    const init = async () => {
      const web3authInstance = new Web3Auth({
        clientId: CLIENT_ID,
        web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
        chainConfig: {
          chainNamespace: CHAIN_NAMESPACES.OTHER,
        },
      });
      setWeb3auth(web3authInstance);
    };
    init();
  }, []);

  // Restore session on load
  useEffect(() => {
    const restoreSession = async () => {
      if (!web3auth || skipRestore || !telegramUser || !jwtToken) return;

      try {
        const privKeyProvider = new CommonPrivateKeyProvider({
          config: { chainConfig: { chainNamespace: CHAIN_NAMESPACES.OTHER } },
        });

        const sub = telegramUser?.id?.toString();
        const idToken = jwtToken;

        const provider = await web3auth.connect({
          verifier: "telegram-x-login",
          verifierId: sub,
          idToken,
          privateKeyProvider: privKeyProvider,
        });

        setProvider(provider);
        const userInfo = await web3auth.getUserInfo();
        setUser(userInfo);
      } catch (error) {
        console.log("Restore session failed:", error);
      }
    };

    restoreSession();
  }, [web3auth, telegramUser, jwtToken, skipRestore]);

  // Create wallet and fetch balance
  useEffect(() => {
    const fetchWalletAndBalance = async () => {
      if (!provider) return;
      setLoadingBalance(true);
      try {
        const wallet = await deriveBTCWallet(provider);
        if (!wallet) {
          setLoadingBalance(false);
          return;
        }

        const res = await fetch(
          `https://blockstream.info/testnet/api/address/${wallet.address}`
        );
        const data = await res.json();

        const balanceSatoshis =
          data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum;
        const balanceTbtc = balanceSatoshis / 1e8;

        setBtcWallet(wallet);
        setBtcBalance(balanceTbtc);
      } catch (err) {
        alert("Error fetching BTC balance: " + err.message);
      } finally {
        setLoadingBalance(false);
      }
    };

    fetchWalletAndBalance();
  }, [provider]);

  const handleLogin = async () => {
    if (!web3auth || !telegramUser || !jwtToken) return;

    setIsLoggingIn(true);
    try {
      const privKeyProvider = new CommonPrivateKeyProvider({
        config: { chainConfig: { chainNamespace: CHAIN_NAMESPACES.OTHER } },
      });

      const sub = telegramUser?.id?.toString();
      const idToken = jwtToken;

      const provider = await web3auth.connect({
        verifier: "telegram-x-login",
        verifierId: sub,
        idToken,
        privateKeyProvider: privKeyProvider,
      });

      setProvider(provider);
      const userInfo = await web3auth.getUserInfo();
      setUser(userInfo);
    } catch (error) {
      alert("Login failed: " + error.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    setUser(null);
    setProvider(null);
    setSkipRestore(true);
    setBtcWallet(null);
    setBtcBalance(null);
  };

  const handleRefreshBalance = async () => {
    if (!btcWallet) {
      alert("No BTC wallet found.");
      return;
    }
    setLoadingBalance(true);
    try {
      const res = await fetch(
        `https://blockstream.info/testnet/api/address/${btcWallet.address}`
      );
      if (!res.ok) {
        alert("Failed to fetch balance info.");
        setLoadingBalance(false);
        return;
      }
      const data = await res.json();

      const balanceSatoshis =
        data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum;
      const balanceTbtc = balanceSatoshis / 1e8;
      setBtcBalance(balanceTbtc);
    } catch (err) {
      alert("Error refreshing balance: " + err.message);
    } finally {
      setLoadingBalance(false);
    }
  };

  const handleBuyCrypto = () => {
    alert("Buy BTC functionality coming soon.");
  };

  const handleReceiveCrypto = () => {
    if (!btcWallet) {
      alert("No wallet available to receive crypto.");
      return;
    }
    alert(`Your BTC receiving address:\n${btcWallet.address}`);
  };

  const handleSendCrypto = () => {
    alert("Send BTC functionality coming soon.");
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>MVP Wallet</h1>
      <h2 className={styles.subtitle}>Tech: Web3Auth Core + Next.js</h2>

      {telegramUser && (
        <div className={styles.telegramContainer}>
          <p className={styles.welcomeText}>
            Welcome, <strong>{telegramUser.first_name}</strong>!
          </p>
          {telegramUser.photo_url && (
            <img
              src={telegramUser.photo_url}
              alt={`${telegramUser.first_name}'s profile`}
              className={styles.telegramImage}
            />
          )}
        </div>
      )}

  {/* Wallet Display Area */}
  {btcWallet && (
    <div className={styles.walletSection}>
      <h3 className={styles.sectionTitle}>Your BTC Wallet</h3>
      
      <div className={styles.walletInfoBox}>
        <p>
          <strong>Address:</strong>
          <code className={styles.walletAddress}>{btcWallet.address}</code>
        </p>
        <p>
          <strong>Balance:</strong>{" "}
          {loadingBalance
            ? "Loading..."
            : btcBalance !== null
            ? `${btcBalance} tBTC`
            : "N/A"}
        </p>
      </div>

      <div className={styles.buttonGroup}>
        <button
          className={styles.walletButton}
          onClick={handleRefreshBalance}
          disabled={loadingBalance}
        >
          {loadingBalance ? "Refreshing..." : "Refresh Balance"}
        </button>
        <button className={styles.walletButton} onClick={handleBuyCrypto}>
          Buy BTC
        </button>
        <button className={styles.walletButton} onClick={handleReceiveCrypto}>
          Receive BTC
        </button>
        <button className={styles.walletButton} onClick={handleSendCrypto}>
          Send BTC
        </button>
      </div>
    </div>
  )}


      {!user ? (
        <button onClick={handleLogin} disabled={isLoggingIn || !telegramUser || !jwtToken}>
          {isLoggingIn ? "Logging in..." : "Login with Telegram"}
        </button>
      ) : (
        <button onClick={handleLogout}>Logout</button>
      )}
    </div>
  );
}
