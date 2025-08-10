import { type Note, type NoteRepr, NoteName, noteReprToNote } from "./notes";

export const DEFAULT_SAX_KEY = 'C';

export type SaxKey =
  | 'Play'
  | 'Oct'
  // standard keys
  | 'B'
  | 'B♭ bis'
  | 'A'
  | 'G'
  | 'F'
  | 'E'
  | 'D'
  | 'C'
  // left hand keys
  | 'G♯'
  | 'Low C♯'
  | 'Low B♭'
  | 'Low B'
  // right hand keys
  | 'D♯'
  | 'F♯'
  // right side
  | 'Alt B♭'
  | 'Alt C';

export const NORMAL_KEYS: SaxKey[] = [
  'B', 'B♭ bis', 'A', 'G', 'F', 'E', 'D', 'C',
  'G♯', 'Low C♯', 'Low B♭', 'Low B',
  'D♯', 'F♯',
  'Alt B♭', 'Alt C',
];

export const CONTROL_KEYS: SaxKey[] = ['Play', 'Oct'];

export const SAX_KEYS: SaxKey[] = CONTROL_KEYS.concat(NORMAL_KEYS)

export const MAIN_KEYS: SaxKey[] = [
  'B', 'A', 'G', 'F', 'E', 'D', 'C'
];

export const RIGHT_HAND_SIDE: SaxKey[] = [
  'C',
  'D', 'D♯',
  'E',
  'F', 'F♯',
];

export const LEFT_HAND_SIDE: SaxKey[] = [
  'G', 'G♯',
  'A', 'B', 'B♭ bis',
  'Low C♯', 'Low B♭', 'Low B',
];

export function isSaxSideNote(key: SaxKey): boolean {
  return !MAIN_KEYS.includes(key)
}

// as they go up the saxophone
const CANONICAL_KEY_PRIORITY: Record<SaxKey, number> = {
  'Low B♭': 0,
  'Low B': 1,
  'C': 2,
  'Low C♯': 3,
  'D': 4,
  'D♯': 5,
  'E': 6,
  'F': 7,
  'F♯': 8,
  'G': 9,
  'G♯': 10,
  'A': 11,
  'Alt B♭': 12,
  'B♭ bis': 12.5,
  'B': 13,
  'Alt C': 14,
  'Oct': 15,
  'Play': 999
}

type Combo = { keys: SaxKey[]; note: NoteRepr, priority: number };

export const COMBOS: Combo[] = [
  { keys: ['B', 'A', 'G', 'F', 'E', 'D', 'C', 'Low B♭'], note: { name: NoteName.A_SHARP, octave: -1 }, priority: 8 },
  { keys: ['B', 'A', 'G', 'F', 'E', 'D', 'C', 'Low B' ], note: { name: NoteName.B,       octave: -1 }, priority: 8 },
  { keys: ['B', 'A', 'G', 'F', 'E', 'D', 'C'          ], note: { name: NoteName.C,       octave: 0 }, priority: 7 },
  { keys: ['B', 'A', 'G', 'F', 'E', 'D', 'C', 'Low C♯'], note: { name: NoteName.C_SHARP, octave: 0 }, priority: 8 },
  { keys: ['B', 'A', 'G', 'F', 'E', 'D'               ], note: { name: NoteName.D,       octave: 0 }, priority: 6 },
  { keys: ['B', 'A', 'G', 'F', 'E', 'D', 'D♯'         ], note: { name: NoteName.D_SHARP, octave: 0 }, priority: 7 },
  { keys: ['B', 'A', 'G', 'F', 'E',                   ], note: { name: NoteName.E,       octave: 0 }, priority: 5 },
  { keys: ['B', 'A', 'G', 'F',                        ], note: { name: NoteName.F,       octave: 0 }, priority: 5 },
  { keys: ['B', 'A', 'G', 'F', 'F♯'                   ], note: { name: NoteName.F_SHARP, octave: 0 }, priority: 5 },
  { keys: ['B', 'A', 'G', 'E',                        ], note: { name: NoteName.F_SHARP, octave: 0 }, priority: 4 },
  { keys: ['B', 'A', 'G',                             ], note: { name: NoteName.G,       octave: 0 }, priority: 3 },
  { keys: ['B', 'A', 'G', 'G♯'                        ], note: { name: NoteName.G_SHARP, octave: 0 }, priority: 4 },
  { keys: ['B', 'A',                                  ], note: { name: NoteName.A,       octave: 0 }, priority: 2 },
  { keys: ['B', 'A', 'Alt B♭'                         ], note: { name: NoteName.A_SHARP, octave: 0 }, priority: 3 },
  { keys: ['B', 'B♭ bis'                              ], note: { name: NoteName.A_SHARP, octave: 0 }, priority: 2 },
  { keys: ['B', 'F'                                   ], note: { name: NoteName.A_SHARP, octave: 0 }, priority: 2 },
  { keys: ['B', 'E'                                   ], note: { name: NoteName.A_SHARP, octave: 0 }, priority: 2 },
  { keys: ['B'                                        ], note: { name: NoteName.B,       octave: 0 }, priority: 1 },
  { keys: ['B', 'Alt C'                               ], note: { name: NoteName.C,       octave: 0 }, priority: 2 },
  { keys: [     'A'                                   ], note: { name: NoteName.C,       octave: 1 }, priority: 1 },
  { keys: [                                           ], note: { name: NoteName.C_SHARP, octave: 1 }, priority: 0 },
];

export const ORDERED_COMBOS: Combo[] = (s => { s.sort((a, b) => b.priority - a.priority); return s; })(COMBOS.slice());

export function isNormalKey(key: SaxKey): boolean {
  return NORMAL_KEYS.includes(key);
}

export function saxNote(pressed: Map<SaxKey, number>): NoteRepr | null {
  for (const c of ORDERED_COMBOS) {
    // is pressed subset of combo?
    if(pressed.entries()
              .filter(([_, value]) => (p => (p ?? 0) > 0)(value))
              .filter(([key, _]) => isNormalKey(key))
              .every(([key, _]) => c.keys.includes(key)))
      return c.note;
  }
  return null;
}

export function saxPressedKeysToNote(pressed: Map<SaxKey, number>): Note | null {
  const n = saxNote(pressed)
  if(n === null) return null;
  const octave = 4 + n.octave + ((pressed.get('Oct') ?? 0) > 0 ? 1 : 0);
  return noteReprToNote({ ...n, octave });
}

export function parseSaxKey(saxKeyString: string): SaxKey | null {
  return SAX_KEYS.find(key => key === saxKeyString) || null;
}
