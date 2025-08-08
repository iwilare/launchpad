import { type Note, type NoteRepr, NoteName } from "./notes";

export type SaxKey =
  | 'b'
  | 'b♭ bis'
  | 'a'
  | 'g'
  | 'f'
  | 'e'
  | 'd'
  | 'c'
  // left hand keys
  | 'g♯'
  | 'low c♯'
  | 'low b♭'
  | 'low b'
  // right hand keys
  | 'd♯'
  | 'f♯'
  // right side
  | 'side b♭'
  | 'side c';

export const allMainKeys: SaxKey[] = [
  'b', 'b♭ bis', 'a', 'g', 'f', 'e', 'd', 'c',
  'g♯', 'low c♯', 'low b♭', 'low b',
  'd♯', 'f♯',
  'side b♭', 'side c'
];

// as they go up the saxophone
const CANONICAL_KEY_PRIORITY: Record<SaxKey, number> = {
  'low b♭': 0,
  'low b': 1,
  'c': 2,
  'low c♯': 3,
  'd': 4,
  'd♯': 5,
  'e': 6,
  'f': 7,
  'f♯': 8,
  'g': 9,
  'g♯': 10,
  'a': 11,
  'side b♭': 12,
  'b♭ bis': 12.5,
  'b': 13,
  'side c': 14,
}

type Combo = { keys: SaxKey[]; note: NoteRepr };

export const COMBOS_IN_ORDER: Combo[] = [
  { keys: ['b', 'a', 'g', 'f', 'e', 'd', 'c', 'low b♭'], note: { name: NoteName.A_SHARP, octave: -1 } },
  { keys: ['b', 'a', 'g', 'f', 'e', 'd', 'c', 'low b' ], note: { name: NoteName.B,       octave: -1 } },
  { keys: ['b', 'a', 'g', 'f', 'e', 'd', 'c'          ], note: { name: NoteName.C,       octave: 0 } },
  { keys: ['b', 'a', 'g', 'f', 'e', 'd', 'c', 'low c♯'], note: { name: NoteName.C_SHARP, octave: 0 } },
  { keys: ['b', 'a', 'g', 'f', 'e', 'd'               ], note: { name: NoteName.D,       octave: 0 } },
  { keys: ['b', 'a', 'g', 'f', 'e', 'd', 'd♯'         ], note: { name: NoteName.D_SHARP, octave: 0 } },
  { keys: ['b', 'a', 'g', 'f', 'e',                   ], note: { name: NoteName.E,       octave: 0 } },
  { keys: ['b', 'a', 'g', 'f',                        ], note: { name: NoteName.F,       octave: 0 } },
  { keys: ['b', 'a', 'g', 'f', 'f♯'                   ], note: { name: NoteName.F_SHARP, octave: 0 } },
  { keys: ['b', 'a', 'g', 'e',                        ], note: { name: NoteName.F_SHARP, octave: 0 } },
  { keys: ['b', 'a', 'g',                             ], note: { name: NoteName.G,       octave: 0 } },
  { keys: ['b', 'a', 'g', 'g♯'                        ], note: { name: NoteName.G_SHARP, octave: 0 } },
  { keys: ['b', 'a',                                  ], note: { name: NoteName.A,       octave: 0 } },
  { keys: ['b', 'a', 'side b♭'                        ], note: { name: NoteName.A_SHARP, octave: 0 } },
  { keys: ['b', 'b♭ bis'                              ], note: { name: NoteName.A_SHARP, octave: 0 } },
  { keys: ['b', 'f',                                  ], note: { name: NoteName.A_SHARP, octave: 0 } },
  { keys: ['b', 'e',                                  ], note: { name: NoteName.A_SHARP, octave: 0 } },
  { keys: ['b',                                       ], note: { name: NoteName.B,       octave: 0 } },
  { keys: ['b', 'side c'                              ], note: { name: NoteName.C,       octave: 0 } },
  { keys: [     'a',                                  ], note: { name: NoteName.C,       octave: 1 } },
  { keys: [                                           ], note: { name: NoteName.C_SHARP, octave: 1 } },
];

export function saxPressedKeysToNote(pressed: Set<SaxKey>): NoteRepr | null {
  const keys = Array.from(pressed).sort((a, b) => CANONICAL_KEY_PRIORITY[a] - CANONICAL_KEY_PRIORITY[b]);
  for (const combo of COMBOS_IN_ORDER) {
    if(keys.every(k => combo.keys.includes(k))) {
      return combo.note;
    }
  }
  return null;
}

// Parse a saxophone key string and validate it against MainKeys
export function parseSaxKey(saxKeyString: string): SaxKey | null {
  if (allMainKeys.includes(saxKeyString as SaxKey)) {
    return saxKeyString as SaxKey;
  }
  return null
}
