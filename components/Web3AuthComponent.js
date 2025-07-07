'use client';

import { useEffect, useState } from "react";
import { Web3Auth } from "@web3auth/modal";
import { OpenloginAdapter } from "@web3auth/openlogin-adapter";
import { CHAIN_NAMESPACES } from "@web3auth/base";
import { ethers } from "ethers";

const clientId = process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID;

export default function Web3AuthComponent() {
  const [web3auth, setWeb3auth] = useState(null);
  const [provider, setProvider] = useState(null);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        const web3authInstance = new Web3Auth({
          clientId,
          web3AuthNetwork: "mainnet",
          chainConfig: {
            chainNamespace: CHAIN_NAMESPACES.EIP155,
            chainId: "0x1", // Ethereum Mainnet
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
            setProvider(web3authInstance.provider);
            const userInfo = await web3authInstance.getUserInfo();
            setUser(userInfo);
            }
      } catch (err) {
        console.error("Web3Auth init error:", err);
      }
    };

    init();
  }, []);

  const login = async () => {
    if (!web3auth) return;
    const provider = await web3auth.connect();
    setProvider(provider);
    const userInfo = await web3auth.getUserInfo();
    setUser(userInfo);
  };

  const logout = async () => {
    if (!web3auth) return;
    await web3auth.logout();
    setProvider(null);
    setUser(null);
  };

  const getAccounts = async () => {
    if (!provider) return;
    const ethersProvider = new ethers.BrowserProvider(provider);
    const signer = await ethersProvider.getSigner();
    const address = await signer.getAddress();
    alert(`Address: ${address}`);
  };

  return (
    <div style={{ padding: 24 }}>
      <h2>Web3Auth + Next.js (JS)</h2>
      {!provider ? (
        <button onClick={login}>Login</button>
      ) : (
        <>
          <button onClick={getAccounts}>Get Address</button>
          <button onClick={logout}>Logout</button>
        </>
      )}
      {user && (
        <pre style={{ marginTop: 20 }}>{JSON.stringify(user, null, 2)}</pre>
      )}
    </div>
  );
}
