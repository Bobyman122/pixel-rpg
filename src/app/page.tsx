'use client';

import { GameCanvas } from '@/components/GameCanvas';

export default function Home() {
  return (
    <div className="w-full h-full flex items-center justify-center bg-black">
      <GameCanvas />
    </div>
  );
}
