// Original chiptune loops. Each token is one eighth-note step:
// a note (C4, F#3, Bb2), "-" for a rest, or "=" to hold the previous note.

export interface Channel {
  wave: OscillatorType;
  vol: number;
  notes: string;
}

export interface Track {
  bpm: number;
  loop: boolean;
  channels: Channel[];
}

const bars = (...b: string[]) => b.join(' ');

export const MUSIC: Record<string, Track> = {
  title: {
    bpm: 84,
    loop: true,
    channels: [
      {
        wave: 'triangle',
        vol: 0.32,
        notes: bars(
          'E5 = = = D5 = C5 =',
          'A4 = = = C5 = D5 =',
          'E5 = = = G5 = E5 =',
          'D5 = = = = = - -',
          'C5 = = = B4 = A4 =',
          'F4 = = = A4 = C5 =',
          'B4 = = = D5 = B4 =',
          'A4 = = = = = - -',
        ),
      },
      {
        wave: 'square',
        vol: 0.05,
        notes: bars(
          'A3 C4 E4 A4 E4 C4 E4 C4',
          'F3 A3 C4 F4 C4 A3 C4 A3',
          'C4 E4 G4 C5 G4 E4 G4 E4',
          'G3 B3 D4 G4 D4 B3 D4 B3',
          'A3 C4 E4 A4 E4 C4 E4 C4',
          'F3 A3 C4 F4 C4 A3 C4 A3',
          'G3 B3 D4 G4 D4 B3 D4 B3',
          'A3 C4 E4 A4 E4 C4 E4 C4',
        ),
      },
      {
        wave: 'triangle',
        vol: 0.3,
        notes: bars(
          'A2 = = = A2 = = =',
          'F2 = = = F2 = = =',
          'C3 = = = C3 = = =',
          'G2 = = = G2 = = =',
          'A2 = = = A2 = = =',
          'F2 = = = F2 = = =',
          'G2 = = = G2 = = =',
          'A2 = = = A2 = = =',
        ),
      },
    ],
  },

  village: {
    bpm: 116,
    loop: true,
    channels: [
      {
        wave: 'square',
        vol: 0.09,
        notes: bars(
          'G4 = C5 = E5 = D5 C5',
          'E5 = = D5 C5 = A4 =',
          'F4 = A4 = C5 = A4 C5',
          'D5 = = = B4 = G4 =',
          'G4 = C5 = E5 = G5 E5',
          'A5 = G5 = E5 = C5 =',
          'D5 = F5 = E5 = D5 =',
          'D5 = C5 = B4 = = =',
        ),
      },
      {
        wave: 'triangle',
        vol: 0.12,
        notes: bars(
          '- E4 - G4 - E4 - G4',
          '- C4 - E4 - C4 - E4',
          '- A3 - C4 - A3 - C4',
          '- B3 - D4 - B3 - D4',
          '- E4 - G4 - E4 - G4',
          '- C4 - E4 - C4 - E4',
          '- F3 - A3 - F3 - A3',
          '- B3 - D4 - B3 - D4',
        ),
      },
      {
        wave: 'triangle',
        vol: 0.3,
        notes: bars(
          'C3 - G2 - C3 - G2 -',
          'A2 - E2 - A2 - E2 -',
          'F2 - C3 - F2 - C3 -',
          'G2 - D3 - G2 - D3 -',
          'C3 - G2 - C3 - G2 -',
          'A2 - E2 - A2 - E2 -',
          'D3 - A2 - D3 - A2 -',
          'G2 - D3 - G2 - B2 -',
        ),
      },
    ],
  },

  forest: {
    bpm: 124,
    loop: true,
    channels: [
      {
        wave: 'square',
        vol: 0.08,
        notes: bars(
          'D5 = = = A4 = D5 E5',
          'F5 = E5 = C5 = = =',
          'D5 = = = F5 = E5 D5',
          'E5 = = = = = - -',
          'D5 = = = A4 = D5 E5',
          'F5 = G5 = E5 = C5 =',
          'D5 = F5 = Bb5 = A5 G5',
          'A5 = = = C#5 = E5 =',
        ),
      },
      {
        wave: 'square',
        vol: 0.035,
        notes: bars(
          '- F4 - A4 - F4 - A4',
          '- E4 - G4 - E4 - G4',
          '- D4 - F4 - D4 - F4',
          '- E4 - G4 - E4 - G4',
          '- F4 - A4 - F4 - A4',
          '- E4 - G4 - E4 - G4',
          '- D4 - F4 - D4 - F4',
          '- C#4 - E4 - C#4 - E4',
        ),
      },
      {
        wave: 'triangle',
        vol: 0.3,
        notes: bars(
          'D3 D3 A2 A2 D3 D3 A2 C3',
          'C3 C3 G2 G2 C3 C3 G2 G2',
          'Bb2 Bb2 F2 F2 Bb2 Bb2 F2 F2',
          'C3 C3 G2 G2 C3 C3 E3 E3',
          'D3 D3 A2 A2 D3 D3 A2 C3',
          'C3 C3 G2 G2 C3 C3 G2 G2',
          'Bb2 Bb2 F2 F2 Bb2 Bb2 F2 F2',
          'A2 A2 E2 E2 A2 A2 C#3 E3',
        ),
      },
    ],
  },

  cave: {
    bpm: 76,
    loop: true,
    channels: [
      {
        wave: 'triangle',
        vol: 0.16,
        notes: bars(
          'A3 E4 A4 B4 C5 B4 A4 E4',
          'A3 E4 A4 B4 C5 E5 D5 B4',
          'F3 C4 F4 G4 A4 G4 F4 C4',
          'E3 B3 E4 G#4 B4 G#4 E4 B3',
        ),
      },
      {
        wave: 'square',
        vol: 0.05,
        notes: bars(
          '- - - - E5 = = =',
          '- - - - D5 = C5 =',
          '- - - - A4 = = =',
          'B4 = = = G#4 = = =',
        ),
      },
      {
        wave: 'triangle',
        vol: 0.3,
        notes: bars('A2 = = = = = = =', 'A2 = = = = = = =', 'F2 = = = = = = =', 'E2 = = = = = = ='),
      },
    ],
  },

  battle: {
    bpm: 156,
    loop: true,
    channels: [
      {
        wave: 'square',
        vol: 0.08,
        notes: bars(
          'E5 = = B4 E5 = G5 =',
          'G5 = E5 = C5 = E5 =',
          'F#5 = = = A5 = F#5 =',
          'D#5 = = = B4 = = =',
          'E5 = B4 = E5 = G5 =',
          'A5 = G5 = E5 = C5 =',
          'D5 = F#5 = A5 = G5 F#5',
          'B4 = D#5 = F#5 = B5 =',
        ),
      },
      {
        wave: 'square',
        vol: 0.035,
        notes: bars(
          '- B3 - E4 - B3 - E4',
          '- C4 - E4 - C4 - E4',
          '- D4 - F#4 - D4 - F#4',
          '- D#4 - F#4 - D#4 - F#4',
          '- B3 - E4 - B3 - E4',
          '- C4 - E4 - C4 - E4',
          '- D4 - F#4 - D4 - F#4',
          '- D#4 - F#4 - D#4 - F#4',
        ),
      },
      {
        wave: 'triangle',
        vol: 0.32,
        notes: bars(
          'E2 E3 E2 E3 E2 E3 E2 E3',
          'C2 C3 C2 C3 C2 C3 C2 C3',
          'D2 D3 D2 D3 D2 D3 D2 D3',
          'B1 B2 B1 B2 B1 B2 B1 B2',
          'E2 E3 E2 E3 E2 E3 E2 E3',
          'C2 C3 C2 C3 C2 C3 C2 C3',
          'D2 D3 D2 D3 D2 D3 D2 D3',
          'B1 B2 B1 B2 D#2 D#3 F#2 F#3',
        ),
      },
    ],
  },

  boss: {
    bpm: 144,
    loop: true,
    channels: [
      {
        wave: 'sawtooth',
        vol: 0.05,
        notes: bars(
          'D5 = = = A5 = = =',
          'G#5 = = = A5 = F5 E5',
          'D5 = = = F5 = E5 D5',
          'C#5 = = = E5 = A4 =',
          'D5 = F5 = A5 = D6 =',
          'C6 = Bb5 = A5 = G5 F5',
          'G5 = = = Bb5 = A5 G5',
          'A5 = = = C#5 = = =',
        ),
      },
      {
        wave: 'square',
        vol: 0.035,
        notes: bars(
          '- F4 - A4 - F4 - A4',
          '- F4 - A4 - F4 - A4',
          '- D4 - F4 - D4 - F4',
          '- C#4 - E4 - C#4 - E4',
          '- F4 - A4 - F4 - A4',
          '- F4 - A4 - F4 - A4',
          '- D4 - G4 - D4 - G4',
          '- C#4 - E4 - C#4 - E4',
        ),
      },
      {
        wave: 'triangle',
        vol: 0.34,
        notes: bars(
          'D2 D2 D3 D2 D2 D3 C3 D3',
          'D2 D2 D3 D2 D2 D3 F3 E3',
          'Bb1 Bb1 Bb2 Bb1 Bb1 Bb2 A2 Bb2',
          'A1 A1 A2 A1 C#2 C#3 E2 E3',
          'D2 D2 D3 D2 D2 D3 C3 D3',
          'D2 D2 D3 D2 D2 D3 F3 E3',
          'G1 G1 G2 G1 G1 G2 F2 G2',
          'A1 A1 A2 A1 C#2 C#3 E2 E3',
        ),
      },
    ],
  },

  victory: {
    bpm: 150,
    loop: false,
    channels: [
      { wave: 'square', vol: 0.1, notes: 'G4 C5 E5 G5 = = E5 = F5 = D5 = G5 = = = C6 = = = = = = -' },
      { wave: 'square', vol: 0.05, notes: 'E4 G4 C5 E5 = = C5 = A4 = A4 = B4 = = = E5 = = = = = = -' },
      { wave: 'triangle', vol: 0.3, notes: 'C3 = = = = = = = F2 = = = G2 = = = C3 = = = = = = -' },
    ],
  },

  rest: {
    bpm: 96,
    loop: false,
    channels: [
      { wave: 'triangle', vol: 0.25, notes: 'C5 E5 G5 C6 = = B5 = G5 = = = C6 = = = = -' },
      { wave: 'triangle', vol: 0.25, notes: 'C3 = = = = = G2 = = = = = C3 = = = = -' },
    ],
  },

  gameover: {
    bpm: 80,
    loop: false,
    channels: [
      { wave: 'triangle', vol: 0.25, notes: 'A4 = = = G4 = = = F4 = = = E4 = = = = = = = -' },
      { wave: 'triangle', vol: 0.25, notes: 'D3 = = = = = = = Bb2 = = = A2 = = = = = = = -' },
    ],
  },

  fanfare: {
    bpm: 132,
    loop: false,
    channels: [
      { wave: 'square', vol: 0.09, notes: 'C5 E5 G5 = E5 G5 C6 = = = -' },
      { wave: 'triangle', vol: 0.28, notes: 'C3 = = = G2 = C3 = = = -' },
    ],
  },
};
