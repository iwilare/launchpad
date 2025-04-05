// src/components/VirtualKeyboard.tsx
import React from 'react';

interface VirtualKeyboardProps {
  activeNotes: {[key: number]: boolean};
  playNote: (note: number, velocity?: number) => void;
  stopNote: (note: number) => void;
}

interface KeyConfig {
  note: number;
  name: string;
  type: 'white' | 'black';
}

const VirtualKeyboard: React.FC<VirtualKeyboardProps> = ({ activeNotes, playNote, stopNote }) => {
  // Define two octaves of keys
  const keys: KeyConfig[] = [
    // Octave 3
    { note: 48, name: 'C3', type: 'white' },
    { note: 49, name: 'C#3', type: 'black' },
    { note: 50, name: 'D3', type: 'white' },
    { note: 51, name: 'D#3', type: 'black' },
    { note: 52, name: 'E3', type: 'white' },
    { note: 53, name: 'F3', type: 'white' },
    { note: 54, name: 'F#3', type: 'black' },
    { note: 55, name: 'G3', type: 'white' },
    { note: 56, name: 'G#3', type: 'black' },
    { note: 57, name: 'A3', type: 'white' },
    { note: 58, name: 'A#3', type: 'black' },
    { note: 59, name: 'B3', type: 'white' },

    // Octave 4
    { note: 60, name: 'C4', type: 'white' },
    { note: 61, name: 'C#4', type: 'black' },
    { note: 62, name: 'D4', type: 'white' },
    { note: 63, name: 'D#4', type: 'black' },
    { note: 64, name: 'E4', type: 'white' },
    { note: 65, name: 'F4', type: 'white' },
    { note: 66, name: 'F#4', type: 'black' },
    { note: 67, name: 'G4', type: 'white' },
    { note: 68, name: 'G#4', type: 'black' },
    { note: 69, name: 'A4', type: 'white' },
    { note: 70, name: 'A#4', type: 'black' },
    { note: 71, name: 'B4', type: 'white' },

    // Octave 5 C
    { note: 72, name: 'C5', type: 'white' },
  ];

  return (
    <div className="keyboard-container">
      <div className="virtual-keyboard">
        {keys.map(key => (
          <button
            key={key.note}
            className={`key ${key.type} ${activeNotes[key.note] ? 'active' : ''}`}
            onMouseDown={() => playNote(key.note, 0.7)}
            onMouseUp={() => stopNote(key.note)}
            onMouseLeave={() => activeNotes[key.note] && stopNote(key.note)}
            onTouchStart={(e) => {
              e.preventDefault();
              playNote(key.note, 0.7);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              stopNote(key.note);
            }}
          >
            <span className="key-label">{key.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default VirtualKeyboard;
