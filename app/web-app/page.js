'use client';

import dynamic from 'next/dynamic';

// Dynamically import with SSR disabled
const Web3AuthComponent = dynamic(() => import('@/components/Web3AuthComponent'), {
  ssr: false,
});


export default function MiniAppPage() {
  return <Web3AuthComponent />;
}
