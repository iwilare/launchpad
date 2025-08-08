import { type Note, type NoteRepr, NoteName, noteReprToNote } from "./notes";

export type SaxKey =
  | 'octave'
  // standard keys
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
  'octave': 15
}

type Combo = { keys: SaxKey[]; note: NoteRepr, priority: number };

export const COMBOS: Combo[] = [
  { keys: ['b', 'a', 'g', 'f', 'e', 'd', 'c', 'low b♭'], note: { name: NoteName.A_SHARP, octave: -1 }, priority: 8 },
  { keys: ['b', 'a', 'g', 'f', 'e', 'd', 'c', 'low b' ], note: { name: NoteName.B,       octave: -1 }, priority: 8 },
  { keys: ['b', 'a', 'g', 'f', 'e', 'd', 'c'          ], note: { name: NoteName.C,       octave: 0 }, priority: 7 },
  { keys: ['b', 'a', 'g', 'f', 'e', 'd', 'c', 'low c♯'], note: { name: NoteName.C_SHARP, octave: 0 }, priority: 8 },
  { keys: ['b', 'a', 'g', 'f', 'e', 'd'               ], note: { name: NoteName.D,       octave: 0 }, priority: 6 },
  { keys: ['b', 'a', 'g', 'f', 'e', 'd', 'd♯'         ], note: { name: NoteName.D_SHARP, octave: 0 }, priority: 7 },
  { keys: ['b', 'a', 'g', 'f', 'e',                   ], note: { name: NoteName.E,       octave: 0 }, priority: 5 },
  { keys: ['b', 'a', 'g', 'f',                        ], note: { name: NoteName.F,       octave: 0 }, priority: 5 },
  { keys: ['b', 'a', 'g', 'f', 'f♯'                   ], note: { name: NoteName.F_SHARP, octave: 0 }, priority: 5 },
  { keys: ['b', 'a', 'g', 'e',                        ], note: { name: NoteName.F_SHARP, octave: 0 }, priority: 4 },
  { keys: ['b', 'a', 'g',                             ], note: { name: NoteName.G,       octave: 0 }, priority: 3 },
  { keys: ['b', 'a', 'g', 'g♯'                        ], note: { name: NoteName.G_SHARP, octave: 0 }, priority: 4 },
  { keys: ['b', 'a',                                  ], note: { name: NoteName.A,       octave: 0 }, priority: 2 },
  { keys: ['b', 'a', 'side b♭'                        ], note: { name: NoteName.A_SHARP, octave: 0 }, priority: 3 },
  { keys: ['b', 'b♭ bis'                              ], note: { name: NoteName.A_SHARP, octave: 0 }, priority: 2 },
  { keys: ['b', 'f',                                  ], note: { name: NoteName.A_SHARP, octave: 0 }, priority: 2 },
  { keys: ['b', 'e',                                  ], note: { name: NoteName.A_SHARP, octave: 0 }, priority: 2 },
  { keys: ['b',                                       ], note: { name: NoteName.B,       octave: 0 }, priority: 1 },
  { keys: ['b', 'side c'                              ], note: { name: NoteName.C,       octave: 0 }, priority: 2 },
  { keys: [     'a',                                  ], note: { name: NoteName.C,       octave: 1 }, priority: 1 },
  { keys: [                                           ], note: { name: NoteName.C_SHARP, octave: 1 }, priority: 0 },
];

export function saxPressedKeysToNote(pressed: Map<SaxKey, number>): Note | null {
  const n = saxNote(pressed)
  if(n === null) return null;
  if((k => (k ?? 0) > 0)(pressed.get('octave')))
    n.octave += 1;
  return noteReprToNote(n);
}

export function saxNote(pressed: Map<SaxKey, number>): NoteRepr | null {
  const ordered = COMBOS.slice()
  ordered.sort((a, b) => b.priority - a.priority);
  for (const combo of ordered) {
    if (combo.keys.every(key => (p => (p ?? 0) > 0)(pressed.get(key)))) {
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
