'use client';

import { useEffect, useRef } from 'react';
import { GameLoop, GAME_WIDTH, GAME_HEIGHT } from '@/engine/GameLoop';
import { SceneManager } from '@/engine/SceneManager';
import { TitleScene } from '@/scenes/TitleScene';
import { DialogueBox } from './DialogueBox';
import { MenuOverlay } from './MenuOverlay';

export function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    GameLoop.init(canvas);
    SceneManager.clear();
    SceneManager.push(new TitleScene());
    GameLoop.start();

    return () => {
      GameLoop.stop();
    };
  }, []);

  return (
    <div className="relative" style={{ width: GAME_WIDTH * 3, height: GAME_HEIGHT * 3 }}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        style={{
          imageRendering: 'pixelated',
          width: GAME_WIDTH * 3,
          height: GAME_HEIGHT * 3,
        }}
      />
      <DialogueBox />
      <MenuOverlay />
    </div>
  );
}
