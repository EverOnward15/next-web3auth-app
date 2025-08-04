///Users/prathameshbhoite/Code/lotus-app/next-web3auth-app/components/Web3AuthComponent.js

import { useEffect, useState } from "react";
import { payments, networks } from "bitcoinjs-lib";
import { Buffer } from "buffer";

// 1) polyfill Buffer
if (typeof window !== "undefined" && !window.Buffer) {
  window.Buffer = Buffer;
}

import { Transaction } from "@scure/btc-signer"; // Later MAINNET
import * as btcSigner from "@scure/btc-signer";
import { hex } from "@scure/base";
import { getPublicKey, sign } from "@noble/secp256k1";
// Then import everything else
import { Web3Auth } from "@web3auth/single-factor-auth";
import { CHAIN_NAMESPACES, WEB3AUTH_NETWORK } from "@web3auth/base";
import styles from "../components/Web3AuthComponent.module.css";
import { CommonPrivateKeyProvider } from "@web3auth/base-provider";
import * as secp from "@noble/secp256k1";
import { keccak256 } from "js-sha3";
import { ethers } from "ethers";
const CLIENT_ID =
  "BJMWhIYvMib6oGOh5c5MdFNV-53sCsE-e1X7yXYz_jpk2b8ZwOSS2zi3p57UQpLuLtoE0xJAgP0OCsCaNJLBJqY";
let privateKey;

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
  // Generate p2wpkh (SegWit) Bitcoin testnet address
  const { address } = payments.p2wpkh({
    pubkey: Buffer.from(publicKey),
    network: networks.testnet,
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
  privateKey = hex; // Added new
  const existingWallet = localStorage.getItem("btc_wallet");

  if (existingWallet) {
    const wallet = JSON.parse(existingWallet);
    alert("Wallet already exists:\n" + wallet.address);
    return wallet;
  }

  try {
    const address = await deriveBTCAddress(hex);
    const wallet = { address };
    localStorage.setItem("btc_wallet", JSON.stringify(wallet));

    alert("✅ BTC Testnet Wallet Created:\n" + address);
    return wallet;
  } catch (err) {
    alert("❌ Error deriving address: " + err.message);
    return null;
  }
}

async function deriveETHAddress(provider) {
  const privateKeyHex = await provider.request({ method: "private_key" });
  const privateKey = privateKeyHex.startsWith("0x")
    ? privateKeyHex.slice(2)
    : privateKeyHex;

  alert("Privatekeyhexnew: " + privateKey);
  const pubKey = getPublicKey(privateKey, false).slice(1); // uncompressed, drop 0x04
  const hash = keccak256(pubKey); // keccak256 hash
  const ethAddress = "0x" + hash.slice(-40);
  alert("ethAddress new: " + ethAddress.toLocaleLowerCase());
  return ethAddress.toLowerCase();
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

  // For USDT (ERC20)
  const [ethWallet, setEthWallet] = useState(null); //
  const [ethBalance, setEthBalance] = useState(null); //
  const [usdtBalance, setUsdtBalance] = useState(null); //
  // const providerEth = new ethers.JsonRpcProvider("https://eth.llamarpc.com"); // Mainnet
  // const USDT_CONTRACT = "0xdAC17F958D2ee523a2206206994597C13D831ec7"; // Mainnet
  // const ERC20_ABI = [
  //   "function balanceOf(address owner) view returns (uint256)",
  //   "function decimals() view returns (uint8)",
  // ];
  const providerEth = new ethers.JsonRpcProvider("https://rpc.sepolia.org"); // Testnet
  const USDT_CONTRACT = "0xdAC17F958D2ee523a2206206994597C13D831ec7"; // Mainnet
  const ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
  ];

  async function getEthBalance(address) {
    try {
      const balanceWei = await providerEth.getBalance(address);
      return ethers.formatEther(balanceWei);
    } catch (err) {
      alert("Error fetching ETH balance: " + err.message);
      return null;
    }
  }

  async function getUSDTBalance(address) {
    const contract = new ethers.Contract(USDT_CONTRACT, ERC20_ABI, provider);
    const rawBalance = await contract.balanceOf(address);
    const decimals = await contract.decimals();
    return ethers.formatUnits(rawBalance, decimals);
  }

  async function sendEth(
    fromAddress,
    privateKeyHex,
    toAddress,
    amountEth,
    maxRetries = 3
  ) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const wallet = new ethers.Wallet(privateKeyHex, providerEth);

        if (!ethers.isAddress(toAddress)) {
          alert("Invalid destination ETH address.");
          throw new Error("Invalid address");
        }

        if (isNaN(amountEth) || amountEth <= 0) {
          alert("Invalid amount. Please enter a valid number.");
          throw new Error("Invalid amount");
        }

        const tx = await wallet.sendTransaction({
          to: toAddress, // corrected key: 'to' not 'toAddress'
          value: ethers.parseEther(amountEth.toString()),
        });

        await tx.wait();
        return tx.hash;
      } catch (error) {
        if (attempt < maxRetries) {
          alert(`Attempt ${attempt} failed: ${error.message}. Retrying...`);
          await new Promise((res) => setTimeout(res, 2000)); // 2 sec wait before retry
        } else {
          alert(`All ${maxRetries} attempts failed: ${error.message}`);
          throw error; // let the outer try/catch handle this
        }
      }
    }
  }

  async function sendUSDT(privateKey, to, amount) {
    const wallet = new ethers.Wallet(privateKey, providerEth);
    const contract = new ethers.Contract(USDT_CONTRACT, ERC20_ABI, wallet);

    const decimals = await contract.decimals();
    const value = ethers.parseUnits(amount, decimals);
    const tx = await contract.transfer(to, value);
    await tx.wait();
    return tx.hash;
  }

  // You can later plug in USDT or ETH balances like this:
  const balances = {
    BTC: {
      address: btcWallet?.address || "Unavailable",
      balance: btcBalance !== null ? `${btcBalance} BTC` : "Loading...",
    },
    USDT: {
      address: ethWallet || "Unavailable",
      balance: ethBalance !== null ? `${ethBalance} ETH` : "Loading...",
    },
    ETH: {
      address: ethWallet || "Unavailable",
      balance: usdtBalance !== null ? `${usdtBalance} ETH` : "Loading...",
    },
  };

  // Automatically get wallet + balance if provider is availabl
  useEffect(() => {
    const fetchKey = async () => {
      if (!provider) return;
      if (!privateKey) {
        privateKey = await provider.request({ method: "private_key" });
        console.log("Key set:", privateKey);
      }
    };

    fetchKey();
  }, [provider]);

  /* =================================================== ETH & USDT Wallet =================================================================== */
  useEffect(() => {
    const fetchWalletAndBalance = async () => {
      if (!provider) return;
      const wallet = await deriveETHAddress(provider);
      if (!wallet) return;

      const ethBalance = await getEthBalance(userAddress);
      const usdtBalance = await getUSDTBalance(userAddress);

      setEthWallet(wallet);
      setEthBalance(ethBalance);
      setUsdtBalance(usdtBalance);
    };

    fetchWalletAndBalance();
  }, [provider]);

  /* =================================================== BTC Wallet =================================================================== */
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

        // Only use hardcoded user in development
        const isDev = process.env.NODE_ENV === "development";

        const hardcodedUser = {
          id: 6843497770,
          first_name: "Prathamesh",
          last_name: "B",
          language_code: "en",
          allows_write_to_pm: true,
          photo_url:
            "https://t.me/i/userpic/320/dc1gn5C51K2CGmfaSE0UFFwsMM1V3-G0B3Z8KTwtLlRauXiRcblZsYg1M7j3NP8m.svg",
        };

        const userToUse = userData || (isDev ? hardcodedUser : null);

        if (!userToUse) {
          console.warn("No Telegram user data available.");
          return;
        }

        setTelegramUser(userToUse);

        fetch("/api/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(userToUse),
        })
          .then((res) => res.json())
          .then((data) => {
            setJwtToken(data.token);
            alert(data.token); // optional, remove in prod
            console.log("Received JWT Token:", data.token);
          })
          .catch((err) => console.error("JWT error:", err));
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
    try {
      alert("🔐 Step 1: Decoding private key...");
      const key = privateKeyHex.replace(/^0x/, "");
      const priv = Uint8Array.from(Buffer.from(key, "hex"));
      const pub = await getPublicKey(priv, true); // already a Uint8Array

      alert(`🧪 pub: ${hex.encode(pub)}, length: ${pub.length}`);
      if (!(pub instanceof Uint8Array) || pub.length !== 33) {
        throw new Error(
          `Invalid public key format. Expected 33-byte Uint8Array, got: ${pub}`
        );
      }

      alert("🏗️ Step 2: Building sender address...");
      // ✅ derive exactly as you do elsewhere for testnet
      const { address: fromAddrDerived, output: fromScriptBuffer } =
        payments.p2wpkh({
          pubkey: Buffer.from(pub),
          network: networks.testnet,
        });
      if (fromAddrDerived !== fromAddress) {
        alert(
          `⚠️ Warning: Derived address ${fromAddrDerived} doesn't match input ${fromAddress}`
        );
      } else {
        alert(`✅ Sender address confirmed: ${fromAddrDerived}`);
      }

      alert("🌐 Step 3: Fetching UTXOs...");
      const res = await fetch(
        `https://blockstream.info/testnet/api/address/${fromAddress}/utxo`
      );
      const utxos = await res.json();

      if (!utxos.length) {
        alert("❌ No UTXOs found. Cannot proceed.");
        return;
      }

      const valueSat = Math.floor(amountInBTC * 1e8);
      const dustLimit = toAddress.startsWith("1") ? 546 : 294;
      if (valueSat < dustLimit) {
        alert(
          `❌ Cannot send ${valueSat} sats. It is below the dust threshold (${dustLimit} sats). Send a larger amount.`
        );
        return;
      }

      // const fee = 1000;
      const feeRate = await (
        await fetch("https://blockstream.info/testnet/api/fee-estimates")
      ).json();
      const fee = estimatedVBytes * feeRate["1"]; // 1-block target

      let total = 0,
        selected = [];
      for (const u of utxos) {
        selected.push(u);
        total += u.value;
        if (total >= valueSat + fee) break;
      }

      if (total < valueSat + fee) {
        alert("❌ Insufficient balance.");
        return;
      }

      alert("🧱 Step 4: Creating transaction...");
      const tx = new Transaction({ version: 2 });

      for (const u of selected) {
        tx.addInput({
          txid: u.txid,
          index: u.vout,
          witnessUtxo: {
            script: fromScriptBuffer,
            amount: BigInt(u.value),
          },
        });
      }

      let toScript;
      try {
        // Try Bech32 (P2WPKH)
        toScript = payments.p2wpkh({
          address: toAddress,
          network: networks.testnet,
        }).output;
        alert("📮 Recipient address detected as P2WPKH (Bech32)");
      } catch (e1) {
        try {
          // Fallback to Legacy (P2PKH)
          toScript = payments.p2pkh({
            address: toAddress,
            network: networks.testnet,
          }).output;
          alert("📮 Recipient address detected as P2PKH (Legacy/Base58)");
        } catch (e2) {
          alert("❌ Invalid recipient address: " + toAddress);
          return;
        }
      }

      tx.addOutput({ script: toScript, amount: BigInt(valueSat) });

      const change = total - valueSat - fee;
      if (change > 0) {
        const { output: changeScript } = payments.p2wpkh({
          address: fromAddress,
          network: networks.testnet,
        });
        tx.addOutput({ script: changeScript, amount: BigInt(change) });
        alert(`💰 Adding change back to sender: ${change} sats`);
      }

      alert("✍️ Step 5: Signing transaction...");
      tx.sign(priv);
      tx.finalize();

      const rawHex = tx.hex;
      alert("📤 Raw TX HEX: " + rawHex);
      alert("📤 Step 6: Broadcasting transaction...");

      const broadcast = await fetch("https://blockstream.info/testnet/api/tx", {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: rawHex,
      });

      const txid = await broadcast.text();
      alert("✅ Transaction sent successfully!\nTXID: " + txid);
      return txid;
    } catch (err) {
      alert("❌ Error during sendBTC:\n" + (err.message || err));
    }
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
        alert("User is logged in:\n");
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
          // privateKeyHex: btcWallet.privateKey,
          privateKeyHex: privateKey,
          amountInBTC: parseFloat(sendAmount),
        });
        setSendStatus("BTC sent successfully!");
      } else if (selectedCrypto === "ETH") {
        if (!ethWallet) {
          alert("No ETH wallet available");
          setSendStatus(null);
          return;
        }
        await sendEth({
          fromAddress: ethWallet,
          toAddress: sendToAddress.trim(),
          // privateKeyHex: btcWallet.privateKey,
          privateKeyHex: privateKey,
          amountEth: parseFloat(sendAmount),
        });
        setSendStatus("ETH sent successfully!");
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
      <h2 className={styles.subtitle}></h2>

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
      <button
        className={styles.button}
        onClick={() => deriveETHAddress(provider)}
      >
        Create Eth Wallet Test
      </button>
      <button
        className={styles.button}
        onClick={() => getEthBalance(ethWallet)}
      >
        Check Eth Wallet balance
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
