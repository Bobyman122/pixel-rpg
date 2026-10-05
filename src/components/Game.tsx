'use client';

import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Sound } from '@/engine/audio';
import { GAME_HEIGHT, GAME_WIDTH } from '@/engine/constants';
import { GameLoop } from '@/engine/GameLoop';
import { Input } from '@/engine/InputManager';
import { SceneManager } from '@/engine/SceneManager';
import { session } from '@/engine/session';
import { setWindowTheme } from '@/gfx/ui';
import { TitleScene } from '@/scenes/TitleScene';
import { useGame } from '@/store/gameStore';
import { loadSettings, saveSettings, type Settings } from '@/systems/settings';
import { TouchControls } from './TouchControls';

function applySettings(s: Settings) {
  setWindowTheme(s.windowTheme);
  Sound.setSfxEnabled(s.sfx);
  Sound.setMusicEnabled(s.music);
}

function subscribeCoarse(cb: () => void) {
  const mq = window.matchMedia('(pointer: coarse)');
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

function useCoarsePointer() {
  return useSyncExternalStore(
    subscribeCoarse,
    () => window.matchMedia('(pointer: coarse)').matches,
    () => false,
  );
}

function subscribeFullscreen(cb: () => void) {
  document.addEventListener('fullscreenchange', cb);
  return () => document.removeEventListener('fullscreenchange', cb);
}

/** Largest scale that fits; whole numbers when there's room so pixels stay square. */
function fitScale(w: number, h: number) {
  const s = Math.min(w / GAME_WIDTH, h / GAME_HEIGHT);
  if (s >= 2) return Math.floor(s);
  return Math.max(0.5, Math.floor(s * 20) / 20);
}

export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(2);
  const crt = useGame((s) => s.settings.crt);
  const soundOn = useGame((s) => s.settings.sfx || s.settings.music);
  const coarse = useCoarsePointer();
  const [forceTouch, setForceTouch] = useState(false);
  const fullscreen = useSyncExternalStore(
    subscribeFullscreen,
    () => !!document.fullscreenElement,
    () => false,
  );
  const showTouch = coarse || forceTouch;

  useEffect(() => {
    session.touch = showTouch;
  }, [showTouch]);

  // Boot the engine once.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const store = useGame.getState();
    store.updateSettings(loadSettings());
    applySettings(useGame.getState().settings);
    const unsubscribe = useGame.subscribe((s, prev) => {
      if (s.settings !== prev.settings) {
        applySettings(s.settings);
        saveSettings(s.settings);
      }
    });

    const unlock = () => Sound.unlock();
    Input.onFirstInteraction = unlock;
    window.addEventListener('pointerdown', unlock);

    let pending = 0;
    const removeHook = GameLoop.addHook((dt) => {
      if (!session.playing) return;
      pending += dt;
      if (pending >= 1) {
        useGame.getState().addPlayTime(pending);
        pending = 0;
      }
    });

    if (process.env.NODE_ENV === 'development') {
      // Lets automated playtests read game state; stripped from production builds.
      (window as unknown as { __cq?: unknown }).__cq = { store: useGame, scenes: SceneManager };
    }

    GameLoop.init(canvas);
    SceneManager.clear();
    SceneManager.push(new TitleScene());
    GameLoop.start();

    return () => {
      GameLoop.stop();
      SceneManager.clear();
      Sound.stopMusic();
      removeHook();
      unsubscribe();
      Input.destroy();
      window.removeEventListener('pointerdown', unlock);
    };
  }, []);

  // Keep the screen as large as the space allows.
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const { width, height } = entries[0].contentRect;
      setScale(fitScale(width - 16, height - 16));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const toggleSound = () => {
    const next = !soundOn;
    useGame.getState().updateSettings({ sfx: next, music: next });
    Sound.unlock();
  };

  const toggleFullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void document.documentElement.requestFullscreen?.().catch(() => {});
  };

  const w = Math.round(GAME_WIDTH * scale);
  const h = Math.round(GAME_HEIGHT * scale);

  return (
    <main className={`app ${showTouch ? 'has-touch' : ''}`}>
      <header className="topbar">
        <div className="brand">
          <svg viewBox="0 0 16 24" width="14" height="21" aria-hidden="true">
            <path d="M8 0 L15 9 L8 24 L1 9 Z" fill="#5aa8f8" />
            <path d="M8 0 L8 24 L1 9 Z" fill="#a8dcff" />
            <path d="M1 9 L15 9 L8 24 Z" fill="#2c64c8" opacity="0.55" />
          </svg>
          <span>Crystal Quest</span>
        </div>
        <div className="toolbar">
          <button type="button" className="tool" onClick={toggleSound} aria-label={soundOn ? 'Mute audio' : 'Unmute audio'} title={soundOn ? 'Mute' : 'Unmute'}>
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <path d="M4 9h4l5-4v14l-5-4H4z" fill="currentColor" />
              {soundOn ? (
                <path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" />
              ) : (
                <path d="M16 9l5 6M21 9l-5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              )}
            </svg>
          </button>
          <button
            type="button"
            className={`tool ${crt ? 'is-on' : ''}`}
            onClick={() => useGame.getState().updateSettings({ crt: !crt })}
            aria-label="Toggle CRT scanlines"
            aria-pressed={crt}
            title="CRT filter"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              <rect x="3" y="5" width="18" height="13" rx="2" stroke="currentColor" strokeWidth="2" fill="none" />
              <path d="M6 9h12M6 12h12M6 15h12" stroke="currentColor" strokeWidth="1" opacity="0.6" />
              <path d="M9 21h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
          {!coarse && (
            <button
              type="button"
              className={`tool ${forceTouch ? 'is-on' : ''}`}
              onClick={() => setForceTouch((v) => !v)}
              aria-label="Show on-screen controls"
              aria-pressed={forceTouch}
              title="On-screen controls"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
                <rect x="2" y="7" width="20" height="11" rx="5" stroke="currentColor" strokeWidth="2" fill="none" />
                <path d="M7 10.5v4M5 12.5h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                <circle cx="16" cy="11.5" r="1.4" fill="currentColor" />
                <circle cx="18" cy="14" r="1.4" fill="currentColor" />
              </svg>
            </button>
          )}
          <button type="button" className="tool" onClick={toggleFullscreen} aria-label="Toggle fullscreen" title="Fullscreen">
            <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
              {fullscreen ? (
                <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" stroke="currentColor" strokeWidth="2" fill="none" />
              ) : (
                <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" stroke="currentColor" strokeWidth="2" fill="none" />
              )}
            </svg>
          </button>
        </div>
      </header>

      <div ref={stageRef} className="stage">
        <div className="bezel" style={{ width: w + 12, height: h + 12 }}>
          <canvas ref={canvasRef} className="screen" style={{ width: w, height: h }} aria-label="Crystal Quest game screen" />
          {crt && <div className="crt" style={{ width: w, height: h }} />}
        </div>
      </div>

      {showTouch ? (
        <TouchControls />
      ) : (
        <footer className="legend">
          <span>
            <kbd>←</kbd>
            <kbd>↑</kbd>
            <kbd>↓</kbd>
            <kbd>→</kbd> Move
          </span>
          <span>
            <kbd>Z</kbd> Confirm / Talk
          </span>
          <span>
            <kbd>X</kbd> Cancel · hold to run
          </span>
          <span>
            <kbd>Esc</kbd> Menu
          </span>
        </footer>
      )}
    </main>
  );
}
