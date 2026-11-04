'use client';

import dynamic from 'next/dynamic';

const Simulator = dynamic(() => import('@/components/Simulator'), { ssr: false });

export default function Home() {
  return <Simulator />;
}
