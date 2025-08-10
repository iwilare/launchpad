import { type Note, type NoteRepr, NoteName, noteReprToNote } from "./notes";

export const DEFAULT_SAX_KEY = 'C';

export type SaxKey =
  | 'Play'
  | 'Oct 1'
  | 'Oct 2'
  | 'Oct 3'
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

export const OCTAVE_KEYS: SaxKey[] = [
  'Oct 1',
  'Oct 2',
  'Oct 3',
];

export const SAX_KEYS: SaxKey[] = NORMAL_KEYS.concat(OCTAVE_KEYS).concat(['Play']);

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

export const FINGER_KEYS: SaxKey[] = [
  'B', 'A', 'G', 'G♯', 'F', 'E', 'D', 'C', 'Oct 1', 'Play'
];

export function isMainSaxNote(key: SaxKey): boolean {
  return FINGER_KEYS.includes(key);
}

export function isSideSaxNote(key: SaxKey): boolean {
  return !isMainSaxNote(key);
}

// as they go up the saxophone
// const CANONICAL_KEY_PRIORITY: Record<SaxKey, number> = {
//   'Low B♭': 0,
//   'Low B': 1,
//   'C': 2,
//   'Low C♯': 3,
//   'D': 4,
//   'D♯': 5,
//   'E': 6,
//   'F': 7,
//   'F♯': 8,
//   'G': 9,
//   'G♯': 10,
//   'A': 11,
//   'Alt B♭': 12,
//   'B♭ bis': 12.5,
//   'B': 13,
//   'Alt C': 14,
//   'Oct': 15,
//   'Play': 999
// }

type Combo = { keys: SaxKey[]; note: NoteRepr, priority: number };

export const COMBOS: Combo[] = [
  { keys: ['B', 'A', 'G', 'F', 'E', 'D', 'C', 'Low B♭'], note: { name: NoteName.A_SHARP, octave: -1 }, priority: 8 },
  { keys: ['B', 'A', 'G', 'F', 'E', 'D', 'C', 'Low B' ], note: { name: NoteName.B,       octave: -1 }, priority: 8 },
  { keys: ['B', 'A', 'G', 'F', 'E', 'D', 'C'          ], note: { name: NoteName.C,       octave: 0 }, priority: 7 },
  { keys: ['B', 'A', 'G', 'F', 'E', 'D', 'C', 'Low C♯'], note: { name: NoteName.C_SHARP, octave: 0 }, priority: 8 },
  { keys: ['B', 'A', 'G', 'F', 'E', 'D'               ], note: { name: NoteName.D,       octave: 0 }, priority: 6 },
  { keys: ['B', 'A', 'G', 'F', 'E', 'D', 'D♯'         ], note: { name: NoteName.D_SHARP, octave: 0 }, priority: 7 },
  { keys: ['B', 'A', 'G', 'F', 'E',                   ], note: { name: NoteName.E,       octave: 0 }, priority: 5 },
  { keys: ['B', 'A', 'G', 'F',                        ], note: { name: NoteName.F,       octave: 0 }, priority: 4 },
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

export function saxNote(pressed: Map<SaxKey, number>): NoteRepr {
  const normalKeys =
    Array.from(pressed.entries()
                 .filter(([_, value]) => value > 0)
                 .map(([key, _]) => key as SaxKey)
                 .filter(isNormalKey));
  for (const c of ORDERED_COMBOS) {
    if (c.keys.every((key, _) => normalKeys.includes(key)))
      return c.note;
  }
  return { name: NoteName.C_SHARP, octave: 1 };
}

export function saxPressedKeysToNote(pressed: Map<SaxKey, number>): Note {
  const n = saxNote(pressed);
  // Octave keys are additive; previously only Oct 1 was applied due to stray semicolons.
  const octave = 4 + n.octave
    + (1 * (pressed.get('Oct 1') ?? 0))
    + (2 * (pressed.get('Oct 2') ?? 0))
    + (4 * (pressed.get('Oct 3') ?? 0));
  return noteReprToNote({ ...n, octave });
}

export function parseSaxKey(saxKeyString: string): SaxKey | null {
  return SAX_KEYS.find(key => key === saxKeyString) || null;
}
