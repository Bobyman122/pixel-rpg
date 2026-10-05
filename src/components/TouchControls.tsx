'use client';

import { useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Input, type Button } from '@/engine/InputManager';

function buzz() {
  try {
    navigator.vibrate?.(8);
  } catch {
    // vibration is optional
  }
}

type Dir = 'up' | 'down' | 'left' | 'right';

/** Keep receiving moves after the finger slides off; harmless if the browser refuses. */
function capture(e: ReactPointerEvent<HTMLElement>) {
  try {
    e.currentTarget.setPointerCapture(e.pointerId);
  } catch {
    // some browsers throw for synthetic or already-released pointers
  }
}

/** A single pad that tracks the thumb, so you can roll between directions without lifting. */
function DPad() {
  const [dir, setDir] = useState<Dir | null>(null);
  const current = useRef<Dir | null>(null);

  const apply = (next: Dir | null) => {
    if (next === current.current) return;
    if (current.current) Input.setVirtual(current.current, false);
    if (next) {
      Input.setVirtual(next, true);
      buzz();
    }
    current.current = next;
    setDir(next);
  };

  const fromEvent = (e: ReactPointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2);
    const dy = e.clientY - (r.top + r.height / 2);
    if (Math.hypot(dx, dy) < r.width * 0.12) return null;
    return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
  };

  return (
    <div
      className="dpad"
      role="group"
      aria-label="Directional pad"
      onPointerDown={(e) => {
        capture(e);
        apply(fromEvent(e));
      }}
      onPointerMove={(e) => {
        if (e.buttons || e.pointerType === 'touch') apply(fromEvent(e));
      }}
      onPointerUp={() => apply(null)}
      onPointerCancel={() => apply(null)}
      onLostPointerCapture={() => apply(null)}
    >
      <div className="dpad-cross">
        {(['up', 'down', 'left', 'right'] as Dir[]).map((d) => (
          <span key={d} className={`dpad-arm dpad-${d} ${dir === d ? 'is-down' : ''}`} />
        ))}
        <span className="dpad-hub" />
      </div>
    </div>
  );
}

function PadButton({ button, label, className }: { button: Button; label: string; className: string }) {
  const [down, setDown] = useState(false);
  const set = (v: boolean) => {
    setDown(v);
    Input.setVirtual(button, v);
    if (v) buzz();
  };
  return (
    <button
      type="button"
      aria-label={label}
      className={`${className} ${down ? 'is-down' : ''}`}
      onPointerDown={(e) => {
        capture(e);
        set(true);
      }}
      onPointerUp={() => set(false)}
      onPointerCancel={() => set(false)}
      onLostPointerCapture={() => set(false)}
      onContextMenu={(e) => e.preventDefault()}
    >
      {label}
    </button>
  );
}

export function TouchControls() {
  return (
    <div className="touch-controls" aria-label="On-screen controls">
      <div className="touch-left">
        <DPad />
      </div>
      <div className="touch-center">
        <PadButton button="menu" label="START" className="pill-btn" />
      </div>
      <div className="touch-right">
        <PadButton button="cancel" label="B" className="face-btn face-b" />
        <PadButton button="confirm" label="A" className="face-btn face-a" />
      </div>
    </div>
  );
}
