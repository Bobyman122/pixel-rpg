'use client';

import { useEffect, useState, useCallback } from 'react';
import { useGameStore } from '@/store/gameStore';
import { InputManager } from '@/engine/InputManager';

export function DialogueBox() {
  const dialogue = useGameStore((s) => s.currentDialogue);
  const lineId = useGameStore((s) => s.currentDialogueLine);
  const advanceDialogue = useGameStore((s) => s.advanceDialogue);
  const storyFlags = useGameStore((s) => s.storyFlags);
  const [displayedText, setDisplayedText] = useState('');
  const [charIndex, setCharIndex] = useState(0);
  const [isComplete, setIsComplete] = useState(false);
  const [selectedChoice, setSelectedChoice] = useState(0);

  const line = dialogue && lineId ? dialogue.lines[lineId] : null;

  // Skip lines that require a flag we don't have
  useEffect(() => {
    if (line?.requireFlag && !storyFlags.has(line.requireFlag)) {
      advanceDialogue();
    }
  }, [line, storyFlags, advanceDialogue]);

  // Typewriter effect
  useEffect(() => {
    if (!line) return;
    setDisplayedText('');
    setCharIndex(0);
    setIsComplete(false);
    setSelectedChoice(0);
  }, [line]);

  useEffect(() => {
    if (!line || isComplete) return;
    const text = line.text;
    if (charIndex >= text.length) {
      setIsComplete(true);
      return;
    }
    const timer = setTimeout(() => {
      setDisplayedText(text.substring(0, charIndex + 1));
      setCharIndex(charIndex + 1);
    }, 30);
    return () => clearTimeout(timer);
  }, [line, charIndex, isComplete]);

  // Input handling
  useEffect(() => {
    if (!line) return;

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'z' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        if (!isComplete) {
          // Skip to full text
          setDisplayedText(line.text);
          setCharIndex(line.text.length);
          setIsComplete(true);
        } else if (line.choices && line.choices.length > 0) {
          advanceDialogue(selectedChoice);
        } else {
          advanceDialogue();
        }
      }
      if (isComplete && line.choices) {
        if (e.key === 'ArrowUp') {
          setSelectedChoice((prev) => (prev - 1 + line.choices!.length) % line.choices!.length);
        }
        if (e.key === 'ArrowDown') {
          setSelectedChoice((prev) => (prev + 1) % line.choices!.length);
        }
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [line, isComplete, selectedChoice, advanceDialogue]);

  if (!line) return null;

  return (
    <div
      className="absolute bottom-0 left-0 right-0 pointer-events-auto"
      style={{
        padding: '0 12px 12px',
      }}
    >
      <div
        className="border-2 rounded-sm p-3"
        style={{
          backgroundColor: 'rgba(0, 0, 40, 0.92)',
          borderColor: '#6688cc',
          fontFamily: 'monospace',
          fontSize: '18px',
          lineHeight: '1.4',
        }}
      >
        {/* Speaker name */}
        {line.speaker && (
          <div className="text-yellow-300 font-bold mb-1" style={{ fontSize: '16px' }}>
            {line.speaker}
          </div>
        )}

        {/* Text */}
        <div className="text-white" style={{ minHeight: '50px' }}>
          {displayedText}
          {!isComplete && <span className="animate-pulse">|</span>}
        </div>

        {/* Choices */}
        {isComplete && line.choices && line.choices.length > 0 && (
          <div className="mt-2 border-t border-gray-600 pt-2">
            {line.choices.map((choice, i) => (
              <div
                key={i}
                className={`${i === selectedChoice ? 'text-yellow-300' : 'text-gray-400'}`}
                style={{ fontSize: '16px' }}
              >
                {i === selectedChoice ? '> ' : '  '}
                {choice.text}
              </div>
            ))}
          </div>
        )}

        {/* Continue indicator */}
        {isComplete && !line.choices && (
          <div className="text-gray-400 text-right animate-bounce" style={{ fontSize: '12px' }}>
            ▼
          </div>
        )}
      </div>
    </div>
  );
}
