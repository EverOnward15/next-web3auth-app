"use client"; // Only needed if this is inside `app/` directory

import "../lib/cryptoPatch";
import dynamic from "next/dynamic";

// Dynamically import the component with SSR disabled
const Web3AuthComponent = dynamic(() => import("@/components/Web3AuthComponent"), {
  ssr: false,
});

export default function Home() {
  return (
    <main>
      <Web3AuthComponent />
    </main>
  );
}