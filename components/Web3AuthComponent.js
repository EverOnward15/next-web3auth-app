///Users/prathameshbhoite/Code/lotus-app/next-web3auth-app/components/Web3AuthComponent.js
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

import * as secp from "@noble/secp256k1";
import axios from "axios";
import { payments, networks, Psbt } from "bitcoinjs-lib";
import ECPairFactory from "ecpair";
import * as tinysecp from "tiny-secp256k1";

// Create an ECPair that bitcoinjs-lib’s Psbt can use:
const ECPair = ECPairFactory(tinysecp);

const CLIENT_ID =
  "BJMWhIYvMib6oGOh5c5MdFNV-53sCsE-e1X7yXYz_jpk2b8ZwOSS2zi3p57UQpLuLtoE0xJAgP0OCsCaNJLBJqY";

/*------------------ Start of Code --------------------*/

//Function to derive BTC Address
async function deriveBTCAddress(privateKeyHex) {
  const hex = privateKeyHex.trim().replace(/^0x/, "").toLowerCase();

  if (!/^[a-f0-9]{64}$/.test(hex)) {
    throw new Error("privateKeyHex must be a 64-character hex string.");
  }

  const privateKeyBytes = Uint8Array.from(Buffer.from(hex, "hex"));

  if (privateKeyBytes.length !== 32) {
    throw new Error("Private key must be 32 bytes.");
  }

  // Get compressed public key (33 bytes)
  const publicKey = await secp.getPublicKey(privateKeyBytes, true);

  // Generate p2pkh Bitcoin testnet address
  const { address } = payments.p2pkh({
    pubkey: Buffer.from(publicKey),
    network: networks.testnet, // Change to networks.bitcoin for mainnet
  });

  return address;
}

//Function to call deriveBTCWallet
async function deriveBTCWallet(provider) {
  const privateKeyHex = await provider.request({ method: "private_key" });
  const hex = privateKeyHex.startsWith("0x")
    ? privateKeyHex.slice(2)
    : privateKeyHex;

  if (!/^[a-fA-F0-9]{64}$/.test(hex)) {
    alert("❌ Invalid private key. Must be 64-character hex.");
    return;
  }

  const existingWallet = localStorage.getItem("btc_wallet");

  if (existingWallet) {
    const wallet = JSON.parse(existingWallet);
    alert("Wallet already exists:\n" + wallet.address);
    return wallet;
  }

  try {
    const address = await deriveBTCAddress(hex);
    const wallet = { address, privateKey: privateKeyHex };
    localStorage.setItem("btc_wallet", JSON.stringify(wallet));

    alert("✅ BTC Testnet Wallet Created:\n" + address);
    return wallet;
  } catch (err) {
    alert("❌ Error deriving address: " + err.message);
    return null;
  }
}

export default function Web3AuthComponent() {
  const [web3auth, setWeb3auth] = useState(null);
  const [provider, setProvider] = useState(null);
  const [user, setUser] = useState(null);
  const [telegramUser, setTelegramUser] = useState(null);
  const [jwtToken, setJwtToken] = useState(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [skipRestore, setSkipRestore] = useState(false);
  const [btcWallet, setBtcWallet] = useState(null); //
  const [btcBalance, setBtcBalance] = useState(null); //
  const [selectedCrypto, setSelectedCrypto] = useState("BTC");
  const [sendToAddress, setSendToAddress] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendStatus, setSendStatus] = useState(null);
  const [showSendModal, setShowSendModal] = useState(false);

  // You can later plug in USDT or ETH balances like this:
  const balances = {
    BTC: {
      address: btcWallet?.address || "Unavailable",
      balance: btcBalance !== null ? `${btcBalance} BTC` : "Loading...",
    },
    USDT: {
      address: "0xUSDTExampleAddress",
      balance: "12.50 USDT",
    },
    ETH: {
      address: "0xETHExampleAddress",
      balance: "0.034 ETH",
    },
  };

  /*Wallet UI functions*/
  // Automatically get wallet + balance if provider is availabl
  useEffect(() => {
    const fetchWalletAndBalance = async () => {
      if (!provider || btcWallet) return;
      const wallet = await deriveBTCWallet(provider);
      if (!wallet) return;

      const res = await fetch(
        `https://blockstream.info/testnet/api/address/${wallet.address}`
      );
      const data = await res.json();

      const balanceSatoshis =
        data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum;
      const balanceTbtc = balanceSatoshis / 1e8;

      setBtcWallet(wallet);
      setBtcBalance(balanceTbtc);
    };

    fetchWalletAndBalance();
  }, [provider, btcWallet]);

  //Initialise Telegram
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

  //Initialise Web3Auth SDK
  useEffect(() => {
    const init = async () => {
      try {
        const privateKeyProvider = new CommonPrivateKeyProvider({
          config: {
            chainConfig: {
              chainNamespace: CHAIN_NAMESPACES.OTHER,
              chainId: "0x1", // Dummy, required
              rpcTarget: "https://dummy-rpc.com", // Dummy RPC to bypass validation
              displayName: "Bitcoin",
              blockExplorerUrl: "https://blockstream.info/testnet/",
              ticker: "BTC",
              tickerName: "Bitcoin",
            },
          },
        });

        const web3authInstance = new Web3Auth({
          clientId: CLIENT_ID,
          web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
          privateKeyProvider,
        });

        await web3authInstance.init();

        setWeb3auth(web3authInstance);
        // setProvider(web3authInstance.provider);
      } catch (err) {
        console.error("Web3Auth init error:", err);
        alert("Web3 Auth init error: " + err.message);
      }
    };
    init();
  }, []);

  useEffect(() => {
    if (!web3auth) {
      return;
    }
  }, []);

  const handleLogin = async () => {
    if (!web3auth || !jwtToken) return;

    setIsLoggingIn(true);
    try {
      // 1) connect() will prompt login and internally wire up the key provider
      await web3auth.connect({
        verifier: "telegram-jwt-verifier",
        verifierId: telegramUser.id.toString(),
        idToken: jwtToken,
      });
      // 2) the real provider lives on web3auth.provider
      const pkProvider = web3auth.provider;
      setProvider(pkProvider);

      // (optional) show user info
      const userInfo = await web3auth.getUserInfo();
      setUser(userInfo);
    } catch (err) {
      console.error("Login error:", err);
      alert("Login failed: " + err.message);
    } finally {
      setIsLoggingIn(false);
    }
  };

  useEffect(() => {
    const tryRestoreSession = async () => {
      if (web3auth.connected) {
        try {
          const pkProvider = web3auth.provider;
          alert(pkProvider);
          setProvider(pkProvider);

          const userInfo = await web3auth.getUserInfo();
          setUser(userInfo);
        } catch (err) {
          console.error("Session restore failed:", err);
          localStorage.clear(); // fallback
        }
      }
    };
    tryRestoreSession();
  }, [web3auth]);

  const handleLogout = async () => {
    // if (!web3auth) return;
    // await web3auth.logout();
    // Optional force cleanup
    try {
      localStorage.clear(); // Clear session
      setSkipRestore(true);
      setUser(null);
      setProvider(null);
      // setIsLoggingIn(null);
      // setJwtToken(null);
      await web3auth.logout();
      await web3auth.init();
      window.location.reload(); // <-- optional fallback
    } catch (err) {
      alert("Logout error: " + err);
    }
  };

  const handleGetAccounts = async () => {
    if (!provider) return;

    try {
      const wallet = await deriveBTCWallet(provider);

      if (!wallet) {
        alert("Failed to get BTC wallet.");
        return;
      }

      // Fetch balance from blockstream API
      const res = await fetch(
        `https://blockstream.info/testnet/api/address/${wallet.address}`
      );
      if (!res.ok) {
        alert("Failed to fetch address info");
        return;
      }
      const data = await res.json();

      const balanceSatoshis =
        data.chain_stats.funded_txo_sum - data.chain_stats.spent_txo_sum;

      const balanceTbtc = balanceSatoshis / 1e8;

      // Update UI state
      setBtcWallet(wallet);
      setBtcBalance(balanceTbtc);
    } catch (err) {
      alert("Error fetching BTC info: " + err.message);
    }
  };

  async function sendTestnetBTC({
    fromAddress,
    toAddress,
    privateKeyHex,
    amountInBTC,
  }) {
    const network = networks.testnet;
    const hex = privateKeyHex.replace(/^0x/, "");
    if (hex.length !== 64) throw new Error("Invalid private key length");
    const keyPair = ECPair.fromPrivateKey(Buffer.from(hex, "hex"));

    // 1) fetch UTXOs
    const { data: utxos } = await axios.get(
      `https://blockstream.info/testnet/api/address/${fromAddress}/utxo`
    );
    if (utxos.length === 0) throw new Error("No UTXOs");

    // 2) build PSBT
    const psbt = new Psbt({ network });
    let total = 0;
    for (const utxo of utxos) {
      const rawHex = await axios
        .get(`https://blockstream.info/testnet/api/tx/${utxo.txid}/hex`)
        .then((r) => r.data);
      const tx = bitcoin.Transaction.fromHex(rawHex);
      const out = tx.outs[utxo.vout];
      const scriptType = bitcoin.script.classifyOutput(out.script);

      if (scriptType === "witnesspubkeyhash") {
        psbt.addInput({
          hash: utxo.txid,
          index: utxo.vout,
          witnessUtxo: { script: out.script, value: BigInt(utxo.value) },
        });
      } else {
        psbt.addInput({
          hash: utxo.txid,
          index: utxo.vout,
          nonWitnessUtxo: Buffer.from(rawHex, "hex"),
        });
      }

      total += utxo.value;
      if (total >= amountInBTC * 1e8) break;
    }

    // 3) outputs
    const sats = Math.floor(amountInBTC * 1e8);
    const fee = 1000;
    if (total < sats + fee) throw new Error("Insufficient funds");
    psbt.addOutput({ address: toAddress, value: sats });
    if (total > sats + fee) {
      psbt.addOutput({ address: fromAddress, value: total - sats - fee });
    }
    alert("Testing send!");
    // 4) sign & validate
    psbt.signAllInputs(keyPair);
    psbt.validateSignaturesOfAllInputs(); // <-- throws if any input failed
    psbt.finalizeAllInputs();

    // 5) broadcast
    const txHex = psbt.extractTransaction().toHex();
    const { data: txid } = await axios.post(
      "https://blockstream.info/testnet/api/tx",
      txHex
    );
    return txid;
  }

  const checkPrivateKeyAndAddress = async () => {
    if (!provider?.request) {
      alert("❌ Provider not available.");
      return;
    }

    try {
      const privateKeyHex = await provider.request({ method: "private_key" });
      alert("✅ Raw privateKeyHex:\n" + privateKeyHex);

      if (!privateKeyHex || typeof privateKeyHex !== "string") {
        throw new Error("Invalid private key returned.");
      }

      const hex = privateKeyHex.startsWith("0x")
        ? privateKeyHex.slice(2)
        : privateKeyHex;

      alert("🧪 Cleaned hex (after removing 0x if present):\n" + hex);

      if (!/^[a-fA-F0-9]+$/.test(hex)) {
        alert("❌ Invalid hex string received.");
        return;
      }

      if (hex.length !== 64) {
        alert(
          "⚠️ Expected 64-character hex, got " + hex.length + " characters."
        );
      }

      const address = await deriveBTCAddress(hex);
      alert("✅ BTC Testnet Address:\n" + address);
    } catch (err) {
      const errorMessage =
        err?.message ||
        (typeof err === "string" ? err : JSON.stringify(err, null, 2));
      alert("❌ Error generating address:\n" + errorMessage);
    }
  };

  const checkUserLogin = async () => {
    if (!web3auth) return alert("Web3Auth not initialized");

    try {
      if (web3auth.connected) {
        const userInfo = await web3auth.getUserInfo();
        console.log("User Info:", userInfo);
        alert("User is logged in:\n" + JSON.stringify(userInfo, null, 2));
      } else {
        alert("User is NOT logged in.");
      }
    } catch (error) {
      console.error("User info error:", error);
      alert("Error getting user info.");
    }
  };

  const openSendModal = () => setShowSendModal(true);
  const closeSendModal = () => {
    setShowSendModal(false);
    setSendToAddress("");
    setSendAmount("");
    setSendStatus(null);
  };

  const handleSendCrypto = async () => {
    setSendStatus("Sending...");
    try {
      if (selectedCrypto === "BTC") {
        if (!btcWallet) {
          alert("No BTC wallet available");
          setSendStatus(null);
          return;
        }
        // Call your send BTC function here
        // You'll need to implement or call your sendTestnetBTC function
        await sendTestnetBTC({
          fromAddress: btcWallet.address,
          toAddress: sendToAddress.trim(),
          privateKeyHex: btcWallet.privateKey,
          amountInBTC: parseFloat(sendAmount),
        });
        setSendStatus("BTC sent successfully!");
      } else {
        setSendStatus(`Sending ${selectedCrypto} is not implemented yet.`);
      }
    } catch (err) {
      setSendStatus(`Error sending ${selectedCrypto}: ${err.message}`);
    }
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

          <div className={styles.walletInfo}>
            <p className={styles.walletLabel}>
              <strong>{selectedCrypto} Address:</strong>
            </p>
            <p className={styles.walletValue}>
              {balances[selectedCrypto].address}
            </p>

            <p className={styles.balanceLabel}>Balance</p>
            <p className={styles.balanceAmount}>
              {balances[selectedCrypto].balance}
            </p>
          </div>
        </div>
      )}

      <div className={styles.cryptoToggle}>
        {["BTC", "USDT", "ETH"].map((crypto) => (
          <button
            key={crypto}
            className={`${styles.cryptoButton} ${
              selectedCrypto === crypto ? styles.selectedCrypto : ""
            }`}
            onClick={() => setSelectedCrypto(crypto)}
          >
            {crypto}
          </button>
        ))}
      </div>

      <div className={styles.actionButtons}>
        <button className={styles.actionButton}>Buy</button>
        <button onClick={openSendModal} className={styles.actionButton}>
          Send
        </button>
        <button className={styles.actionButton}>Receive</button>
      </div>

      <button
        className={styles.button}
        onClick={async () => {
          const toAddress = prompt("Enter recipient Testnet BTC address:");
          const amount = parseFloat(
            prompt("Enter amount in BTC (e.g., 0.0001):")
          );

          if (!toAddress || isNaN(amount)) return alert("Invalid input");

          const privateKeyHex = btcWallet?.privateKey?.replace(/^0x/, "");

          try {
            const txid = await sendTestnetBTC({
              fromAddress: btcWallet.address,
              toAddress,
              privateKeyHex,
              amountInBTC: amount,
            });

            alert("✅ Transaction sent!\nTxID: " + txid);
            console.log("TXID:", txid);
          } catch (err) {
            console.error("Send error:", err);
            alert("❌ Send failed: " + err.message);
          }
        }}
      >
        Send BTC (Testnet)
      </button>

      {!provider?.request ? (
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
        <button className={styles.button} onClick={handleGetAccounts}>
          Get Address & Balance
        </button>
      )}

      <button className={styles.button} onClick={checkPrivateKeyAndAddress}>
        Check BTC Private Key
      </button>
      <button className={styles.button} onClick={checkUserLogin}>
        Check Web3Auth Login
      </button>
      <button className={styles.button} onClick={handleLogout}>
        Logout from Web3 Auth
      </button>
      <button
        className={styles.button}
        onClick={() => deriveBTCWallet(provider)}
      >
        Create BTC Wallet Test
      </button>

      {user && (
        <>
          <h3 className={styles.sectionTitle}>Web3Auth User Info:</h3>
          <pre className={styles.debugBox}>{JSON.stringify(user, null, 2)}</pre>
        </>
      )}

      {telegramUser && (
        <>
          <h3 className={styles.sectionTitle}>Telegram User Info:</h3>
          <pre className={styles.debugBox}>
            {JSON.stringify(telegramUser, null, 2)}
          </pre>
        </>
      )}

      {jwtToken && (
        <>
          <h3 className={styles.sectionTitle}>JWT Token:</h3>
          <pre className={styles.debugBox}>{jwtToken}</pre>
        </>
      )}

      {/* Send button opens the modal */}
      {showSendModal && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <h2>Send {selectedCrypto}</h2>
            <label>
              Recipient Address:
              <br></br>
              <input
                type="text"
                value={sendToAddress}
                onChange={(e) => setSendToAddress(e.target.value)}
                placeholder="Enter address"
                className={styles.input}
              />
            </label>
            <label>
              Amount:
              <br></br>
              <input
                type="number"
                value={sendAmount}
                onChange={(e) => setSendAmount(e.target.value)}
                placeholder="Enter amount"
                min="0"
                step="any"
                className={styles.input}
              />
            </label>
            <div className={styles.buttonRow}>
              <button onClick={handleSendCrypto} className={styles.sendButton}>
                Send
              </button>
              <button onClick={closeSendModal} className={styles.cancelButton}>
                Cancel
              </button>
            </div>
            {sendStatus && <p className={styles.sendStatus}>{sendStatus}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
