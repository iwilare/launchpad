import { SvelteMap } from "svelte/reactivity";
import { isBlackNote, type Note } from "./notes";
import type { SaxKey } from "./saxophone";
import { type NoteMapping, type MappingColor, type NoteMap, type LaunchpadColor, colorFromSettings, type ColorSettings } from "./ui";

export const SAX_START_NOTE: Note = 58; // Bb3

export const DEFAULT_COLOR = 0x00;
export const DEFAULT_ANTI_COLOR = 0x25;

export const DEFAULT_WHITE_REST: LaunchpadColor = 0x00;
export const DEFAULT_WHITE_PRESSED: LaunchpadColor = 0x25;
export const DEFAULT_BLACK_REST: LaunchpadColor = 0x03;
export const DEFAULT_BLACK_PRESSED: LaunchpadColor = 0x24;

export const DEFAULT_SAX_REST: LaunchpadColor = 0x23;
export const DEFAULT_SAX_PRESSED: LaunchpadColor = 0x27;
export const DEFAULT_SAX_SIDE_REST: LaunchpadColor = 0x74;
export const DEFAULT_SAX_SIDE_PRESSED: LaunchpadColor = 0x77;

export const DEFAULT_START_NOTE: Note = 39; // D#2

export const DEFAULT_HORIZONTAL_STEP = 2;   // Wicky-Hayden
export const DEFAULT_VERTICAL_STEP = 5;

// Note: row 0 is the bottom row
export const GRID_LAYOUT: Note[][] = [
  [11, 12, 13, 14, 15, 16, 17, 18, 19],
  [21, 22, 23, 24, 25, 26, 27, 28, 29],
  [31, 32, 33, 34, 35, 36, 37, 38, 39],
  [41, 42, 43, 44, 45, 46, 47, 48, 49],
  [51, 52, 53, 54, 55, 56, 57, 58, 59],
  [61, 62, 63, 64, 65, 66, 67, 68, 69],
  [71, 72, 73, 74, 75, 76, 77, 78, 79],
  [81, 82, 83, 84, 85, 86, 87, 88, 89],
  [91, 92, 93, 94, 95, 96, 97, 98, 99],
] as const;

export const DEFAULT_DELTA_MAP: number[][] = [
  [ 0,  2,  4,  5,  7,  9, 11, 12, 14],
  [ 1,  3,  5,  6,  8, 10, 12, 13, 15],
  [ 2,  4,  6,  7,  9, 11, 13, 14, 16],
  [ 3,  5,  7,  8, 10, 12, 14, 15, 17],
  [ 4,  6,  8,  9, 11, 13, 15, 16, 18],
  [ 5,  7,  9, 10, 12, 14, 16, 17, 19],
  [ 6,  8, 10, 11, 13, 15, 17, 18, 20],
  [ 7,  9, 11, 12, 14, 16, 18, 19, 21],
  [ 8, 10, 12, 13, 15, 17, 19, 20, 22],
]

export const EXTRA_DELTA_MAP: number[][] = [
  [ 0,  2,  4,  5,  7,  9, 11, 12, 14],
  [ 1,  3,  5,  6,  8, 10, 12, 13, 15],

  [12, 14, 16, 17, 19, 21, 23, 24, 26],
  [13, 15, 17, 18, 20, 22, 24, 25, 27],

  [24, 26, 28, 29, 31, 33, 35, 36, 38],
  [25, 27, 29, 30, 32, 34, 36, 37, 39],

  [36, 38, 40, 41, 43, 45, 47, 48, 50],
  [37, 39, 41, 42, 44, 46, 48, 49, 51],

  [48, 50, 52, 53, 55, 57, 59, 60, 62],
]

export const emptyMapping: () => NoteMap = () => new SvelteMap();

// Default note mappings for the entire range (36-99)
export const DEFAULT_MAPPINGS: NoteMap = generateIsomorphicLayoutMap(
  DEFAULT_START_NOTE,
  DEFAULT_HORIZONTAL_STEP,
  DEFAULT_VERTICAL_STEP,
  ((m: Note) => (isBlackNote(m)
      ? { rest: DEFAULT_BLACK_REST, pressed: DEFAULT_BLACK_PRESSED }
      : { rest: DEFAULT_WHITE_REST, pressed: DEFAULT_WHITE_PRESSED })));

export function generateIsomorphicLayoutMap(
  startNote: Note,
  horizontalStep: number,
  verticalStep: number,
  colorForTarget: (note: Note) => MappingColor,
): NoteMap {
  const noteMap: NoteMap = new SvelteMap();
  GRID_LAYOUT.forEach((row, rowIndex) => {
    row.forEach((source, colIndex) => {
      const target = (startNote + (colIndex * horizontalStep) + (rowIndex * verticalStep)) as Note;
      noteMap.set(source, { mapping: { type: 'note', target }, color: colorForTarget(target) });
    });
  });
  return noteMap;
}

const DEFAULT_SAXOPHONE_KEYS_COORDINATES: Array<{ r: number; c: number, n: SaxKey }> = [
  // Right hand
  { c: 4, r: 0, n: 'D♯' }, { c: 3, r: 0, n: 'C'  },
  { c: 4, r: 1, n: 'D' },  { c: 3, r: 1, n: 'F♯' },
  { c: 4, r: 2, n: 'E' },
  { c: 4, r: 3, n: 'F' },                          { c: 0, r: 2, n: 'Alt B♭' }, { c: 0, r: 3, n: 'Alt B♭' }, { c: 0, r: 4, n: 'Alt B♭' },

  { c: 0, r: 5, n: 'Play' }, { c: 0, r: 6, n: 'Play' },

  // left hand
                               { c: 5, r: 3, n: 'Low B♭' },
  { c: 6, r: 4, n: 'Low C♯' }, { c: 5, r: 4, n: 'G♯'     }, { c: 4, r: 4, n: 'Low B' },
                                                            { c: 4, r: 5, n: 'G' },
                                                            { c: 4, r: 6, n: 'A' },
                              { c: 5, r: 7, n: 'B♭ bis' },  { c: 4, r: 7, n: 'B' }, { c: 3, r: 7, n: 'B♭ bis' },
  { c: 7, r: 8, n: 'Oct 1' }, { c: 6, r: 8, n: 'Oct 2' },
];

export function generateSaxophoneLayoutMap(colorForNote: (note: NoteMapping) => MappingColor): NoteMap {
  const map: NoteMap = new SvelteMap();
  DEFAULT_SAXOPHONE_KEYS_COORDINATES.forEach(({ r, c, n }) => {
    if (0 <= r && r < GRID_LAYOUT.length && 0 <= c && c < GRID_LAYOUT[r].length) {
      const source = GRID_LAYOUT[r][c];
      const mapping: NoteMapping = { type: 'sax', key: n };
      map.set(source, { mapping, color: colorForNote(mapping) });
    }
  });
  return map;
}

export function applyColorsToMap(settings: ColorSettings, noteMap: NoteMap): NoteMap {
  const newNoteMap: NoteMap = new SvelteMap();
  noteMap.forEach(({ mapping }, note) => {
    newNoteMap.set(note, { mapping, color: colorFromSettings(settings, mapping), });
  });
  return newNoteMap;
}

export function generateFromDeltaMap(deltaMap: number[][], startNote: Note, getNoteColor: (mapping: NoteMapping) => MappingColor) {
  const noteMap: NoteMap = new SvelteMap();
  GRID_LAYOUT.forEach((row, rowIndex) => {
    row.forEach((source, colIndex) => {
      const target = (startNote + deltaMap[rowIndex][colIndex]) as Note;
      const mapping: NoteMapping = { type: 'note', target: target }
      noteMap.set(source, { mapping, color: getNoteColor(mapping) });
    });
  });
  return noteMap;
}
