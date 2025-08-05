// utils/eth-provider.js
import { ethers } from "ethers";

export const providerEth = new ethers.JsonRpcProvider(
  "https://eth-sepolia.g.alchemy.com/v2/BNWSJyDPIkokUZwitRmnB"
);
