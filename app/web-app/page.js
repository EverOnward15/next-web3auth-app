
import Web3AuthComponent from "@/components/Web3AuthComponent";

// Dynamically import with SSR disabled
const Web3AuthComponent = dynamic(() => import('@/components/Web3AuthComponent'), {
  ssr: false,
});


export default function MiniAppPage() {
  return <Web3AuthComponent />;
}
