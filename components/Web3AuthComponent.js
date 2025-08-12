///Users/prathameshbhoite/Code/lotus-app/next-web3auth-app/components/Web3AuthComponent.js

import { useEffect, useState, useCallback, useRef } from "react";
import { payments, networks } from "bitcoinjs-lib";
import { Buffer } from "buffer";
import AccountMenu from "../components/AccountMenu"; // adjust path

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
import { providerEth } from "../lib/eth-provider";
import { QRCodeSVG } from "qrcode.react";

/*=============================================== Start Async functions ========================================================================*/

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
  localStorage.setItem("ethAddress", ethAddress.toLowerCase());
  return ethAddress.toLowerCase();
}

/*=============================================== Start default component ========================================================================*/

export default function Web3AuthComponent() {
  const [web3auth, setWeb3auth] = useState(null);
  const [provider, setProvider] = useState(null);
  const [user, setUser] = useState(null);
  const [telegramUser, setTelegramUser] = useState(null);
  const [jwtToken, setJwtToken] = useState(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [tryRestore, setTryRestore] = useState(true);
  const [btcWallet, setBtcWallet] = useState(null); //
  const [btcBalance, setBtcBalance] = useState(null); //
  const [selectedCrypto, setSelectedCrypto] = useState("BTC");
  const [sendToAddress, setSendToAddress] = useState("");
  const [sendAmount, setSendAmount] = useState("");
  const [sendStatus, setSendStatus] = useState(null);
  const [showSendModal, setShowSendModal] = useState(false);

  /* =================================================== ETH & USDT Wallet =================================================================== */
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
  const USDT_CONTRACT = "0xdAC17F958D2ee523a2206206994597C13D831ec7"; // Mainnet
  const ERC20_ABI = [
    "function balanceOf(address owner) view returns (uint256)",
    "function decimals() view returns (uint8)",
  ];

  async function getEthBalance(address) {
    try {
      const res = await fetch(`/api/eth-balance?address=${address}`);
      const data = await res.json();
      if (res.ok) {
        alert("Balance ETH: " + data.balance);
        setEthBalance(data.balance);
        return;
      } else throw new Error(data.error);
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

  async function sendEth({ fromAddress, privateKeyHex, toAddress, amountEth }) {
    const maxRetries = 3;

    // ✅ Normalize and validate the private key
    let pk = privateKeyHex.trim();
    if (!pk.startsWith("0x")) pk = "0x" + pk;

    if (!/^0x[0-9a-fA-F]{64}$/.test(pk)) {
      alert("❌ Invalid private key format");
      throw new Error("Invalid private key format");
    }

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const wallet = new ethers.Wallet(pk, providerEth);

        if (!ethers.isAddress(toAddress)) {
          alert("Invalid destination ETH address.");
          throw new Error("Invalid address");
        }

        if (isNaN(amountEth) || amountEth <= 0) {
          alert("Invalid amount. Please enter a valid number.");
          throw new Error("Invalid amount");
        }

        const tx = await wallet.sendTransaction({
          to: toAddress,
          value: ethers.parseEther(amountEth.toString()),
        });

        await tx.wait();
        alert(`✅ Transaction sent successfully! Hash:\n ${tx.hash} \n
          View on Etherscan: https://sepolia.etherscan.io/tx/${tx.hash}`);

        return tx.hash;
      } catch (error) {
        if (attempt < maxRetries) {
          alert(`Attempt ${attempt} failed: ${error.message}. Retrying...`);
          await new Promise((res) => setTimeout(res, 2000));
        } else {
          alert(`All ${maxRetries} attempts failed: ${error.message}`);
          throw error;
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
      balance: usdtBalance !== null ? `${usdtBalance} ETH` : "Loading...",
    },
    ETH: {
      address: ethWallet || "Unavailable",
      balance: ethBalance !== null ? `${ethBalance} ETH` : "Loading...",
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

  useEffect(() => {
    const fetchETHWalletAndBalance = async () => {
      const wallet = await deriveETHAddress(provider);
      alert("I'm here " + wallet);
      if (!wallet) return;
      setEthWallet(wallet);
      getEthBalance(wallet);
    };

    fetchETHWalletAndBalance();
  }, [provider]);

  /* =================================================== BTC Wallet =================================================================== */
  // Automatically get wallet + balance if provider is availabl
  useEffect(() => {
    const fetchWalletAndBalance = async () => {
      if (!provider) return;
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
  }, [provider]);

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
    if (web3auth.connected) return;
    setIsLoggingIn(true);
    setTryRestore(false);
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
    handleLogin();
  }, [web3auth]);

  useEffect(() => {
    const tryRestoreSession = async () => {
      if (!tryRestore) return;
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
      setTryRestore(true);
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
      const fee = estimatedVBytes * feeRate["1"]; // ---------------------------------- CHECK THIS PART

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

  /*========================================================= Wallet UI ============================================================ */

  const [isBalanceLoading, setIsBalanceLoading] = useState(true);
  const [networkOnline, setNetworkOnline] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const walletAddress = balances[selectedCrypto]?.address || "";

  // Simulate network check
  useEffect(() => {
    const checkNetwork = () => {
      if (btcBalance !== null && ethBalance !== null) {
        setNetworkOnline(true);
      } else setNetworkOnline(false);
    };
    checkNetwork();
    window.addEventListener("online", checkNetwork);
    window.addEventListener("offline", checkNetwork);
    return () => {
      window.removeEventListener("online", checkNetwork);
      window.removeEventListener("offline", checkNetwork);
    };
  }, [btcBalance, ethBalance]);

  // Simulate balance loading
  // useEffect(() => {
  //   setTimeout(() => {
  //     setIsBalanceLoading(false);
  //   }, 1200);
  // }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(balances[selectedCrypto].address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Fake transaction list (replace with real ones if available)
  const recentTransactions = [
    {
      txid: "abc123",
      amount: "-0.002 BTC",
      status: "Confirmed",
      timestamp: "Aug 04, 10:30",
    },
    {
      txid: "def456",
      amount: "+0.01 BTC",
      status: "Pending",
      timestamp: "Aug 03, 14:05",
    },
    {
      txid: "ghi789",
      amount: "-0.005 BTC",
      status: "Confirmed",
      timestamp: "Aug 02, 19:45",
    },
  ];

  // handlers in parent
  const handleOpenSettings = useCallback(() => {
    // open your settings modal / navigate
    setShowSettings(true);
  }, [setShowSettings]);

  // const handleOpenWallet = useCallback(() => {
  //   // maybe switch UI to wallet tab or scroll to wallet card
  //   // setSelectedTab("wallet");
  // }, [setSelectedTab]);

  const menuRef = useRef();
  const profileName = telegramUser
    ? `${telegramUser.first_name || ""} ${telegramUser.last_name || ""}`.trim()
    : "Account";

  return (
    <>
      <div className={styles.container}>
        <div className={styles.networkStatus}>
          Network:{" "}
          <span className={networkOnline ? styles.online : styles.offline}>
            {networkOnline ? "Online" : "Offline"}
          </span>
        </div>
        <br></br>
        <h1 className={styles.title}>BTC ETH Wallet</h1>
        <h2 className={styles.subtitle}></h2>

        {telegramUser && (
          <>
            {telegramUser.photo_url && (
              <>
                <img
                  src={telegramUser?.photo_url || "/assets/default-avatar.png"}
                  alt={profileName}
                  onClick={() => menuRef.current?.toggle()}
                  className={styles.avatarTopRight}
                  aria-haspopup="true"
                  style={{ cursor: "pointer" }}
                />

                <AccountMenu
                  ref={menuRef}
                  telegramUser={telegramUser}
                  balances={balances}
                  selectedCrypto={selectedCrypto}
                  onOpenSettings={() => console.log("Settings")}
                  onOpenWallet={() => console.log("Wallet")}
                  onLogout={() => console.log("Logout")}
                />
              </>
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

            <div className={styles.telegramContainer}>
              <div className={styles.walletInfo}>
                <p className={styles.walletLabel}>
                  <strong>{selectedCrypto} Address:</strong>
                  <span className={styles.copyIcon} onClick={handleCopy}>
                    <img src="/assets/copy.svg" />
                  </span>
                  {copied && <span className={styles.copiedText}>Copied!</span>}
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
          </>
        )}

        <div className={styles.actionButtons}>
          <button className={styles.actionButton}>
            <img
              src="/assets/add.svg"
              className={styles.transactIcon}
              alt="Buy icon"
            />{" "}
            Buy
          </button>
          <button onClick={openSendModal} className={styles.actionButton}>
            <img
              src="/assets/send.svg"
              className={styles.transactIcon}
              alt="Send icon"
            />{" "}
            Send
          </button>
          <button
            onClick={() => setShowQR(true)}
            className={styles.actionButton}
          >
            {" "}
            <img
              src="/assets/share.svg"
              className={styles.transactIcon}
              alt="Share icon"
            />{" "}
            Share
          </button>
        </div>

        <div className={styles.transactionsSection}>
          <h3>Recent Transactions</h3>
          <ul className={styles.txList}>
            {recentTransactions.map((tx) => (
              <li key={tx.txid} className={styles.txItem}>
                <div className={styles.txDetails}>
                  <span className={styles.txAmount}>
                    {tx.amount > 0 ? "+" : ""}
                    {tx.amount}
                  </span>
                  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
                  <span
                    className={`${styles.txStatus} ${
                      tx.status === "Confirmed"
                        ? styles.txConfirmed
                        : styles.txPending
                    }`}
                  >
                    {tx.status}
                  </span>
                </div>
                <div className={styles.txMeta}>
                  <span className={styles.txTime}>{tx.timestamp}</span>
                  <span className={styles.txId}>{tx.txid.slice(0, 10)}...</span>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {!provider?.request ? (
          <div className={styles.loginDiv}>
            <button
              className={styles.button}
              onClick={handleLogin}
              disabled={isLoggingIn}
            >
              {jwtToken
                ? "Login via Telegram (JWT)"
                : "Waiting for Telegram Login..."}
            </button>
          </div>
        ) : (
          <div className={styles.loginDiv}>
            <button className={styles.button} onClick={handleGetAccounts}>
              Get Address & Balance
            </button>
          </div>
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
          onClick={() => getEthBalance(localStorage.getItem("ethAddress"))}
          // onClick={() =>
          //   getEthBalance("0xe0ee822620933b173b56b19321e3a57e60d07fd5")
          // }
        >
          Check Eth Wallet balance
        </button>

        {user && (
          <>
            <h3 className={styles.sectionTitle}>Web3Auth User Info:</h3>
            <pre className={styles.debugBox}>
              {JSON.stringify(user, null, 2)}
            </pre>
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
                <button
                  onClick={handleSendCrypto}
                  className={styles.sendButton}
                >
                  Send
                </button>
                <button
                  onClick={closeSendModal}
                  className={styles.cancelButton}
                >
                  Cancel
                </button>
              </div>
              {sendStatus && <p className={styles.sendStatus}>{sendStatus}</p>}
            </div>
          </div>
        )}
      </div>

      {/*QR Code*/}
      {showQR && (
        <div className={styles.qrOverlay} onClick={() => setShowQR(false)}>
          <div
            className={styles.qrModal}
            onClick={(e) => e.stopPropagation()} // Prevent closing on inner click
          >
            <h3 className={styles.balanceLabel}>
              Scan to get {selectedCrypto} address
            </h3>
            <br></br>
            <QRCodeSVG value={walletAddress} size={200} />
            <br></br>
            <br></br>
            <p className={styles.subtitle}>{walletAddress}</p>
            <br></br>
            <button
              className={styles.cancelButton}
              onClick={() => setShowQR(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* BOTTOM MENU STARTS HERE */}
      <div className={styles.bottomMenu}>
        <button className={styles.menuItem}>
          <span className={styles.menuIcon}>
            {" "}
            <img
              src="/assets/wallet.svg"
              className={styles.transactIcon}
              alt="Wallet icon"
            />{" "}
          </span>
          <span className={styles.menuLabel}>Wallet</span>
        </button>
        <button className={styles.menuItem}>
          <span className={styles.menuIcon}>
            {" "}
            <img
              src="/assets/send2.svg"
              className={styles.transactIcon}
              alt="Send icon"
            />{" "}
          </span>
          <span className={styles.menuLabel}>Send</span>
        </button>
        <button className={styles.menuItem}>
          <span className={styles.menuIcon}>
            {" "}
            <img
              src="/assets/history.svg"
              className={styles.transactIcon}
              alt="History icon"
            />{" "}
          </span>
          <span className={styles.menuLabel}>History</span>
        </button>
        <button className={styles.menuItem}>
          <span className={styles.menuIcon}>
            {" "}
            <img
              src="/assets/settings.svg"
              className={styles.transactIcon}
              alt="Settings icon"
            />{" "}
          </span>
          <span className={styles.menuLabel}>Settings</span>
        </button>
      </div>
    </>
  );
}
