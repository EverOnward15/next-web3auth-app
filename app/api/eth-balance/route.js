// app/api/eth-balance/route.js
import { ethers } from "ethers";

const providerSepolia = new ethers.JsonRpcProvider(
  "https://eth-sepolia.g.alchemy.com/v2/BNWSJyDPIkokUZwitRmnB"
);
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!ethers.isAddress(address)) {
    return new Response(JSON.stringify({ error: "Invalid address" }), {
      status: 400,
    });
  }

  try {
    const balanceWei = await providerEth.getBalance(address);
    const balanceEth = ethers.formatEther(balanceWei);
    return new Response(JSON.stringify({ balance: balanceEth }), {
      status: 200,
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
    });
  }
}
