import { NoteNameList, type Note, type NoteRepr, NoteName, isBlackNote, stringToNoteName, noteReprToNote, noteToNoteRepr } from "./notes";
import type { SaxKey, allMainKeys, COMBOS_IN_ORDER, saxPressedKeysToNote } from "./saxophone";

// The Launchpad key numbers
export type Key = number;

// Hex color codes for Launchpad (00-7F)
export type LaunchpadColor = number;

export const DEFAULT_COLOR = 0x00;
export const DEFAULT_WHITE_REST: LaunchpadColor = 0x00;
export const DEFAULT_WHITE_PRESSED: LaunchpadColor = 0x25;
export const DEFAULT_BLACK_REST: LaunchpadColor = 0x03;
export const DEFAULT_BLACK_PRESSED: LaunchpadColor = 0x24;

export type Controller = Map<Key, { active: boolean, color: LaunchpadColor }>;

export type MappingColor = { rest: LaunchpadColor; pressed: LaunchpadColor };

// Extended mapping types for different actions
export type NoteMapping =
  | { type: 'note'; target: Note; color: MappingColor }
  | { type: 'pitch'; bend: number; color: MappingColor }
  | { type: 'timbre'; waveform: OscillatorType; color: MappingColor }
  | { type: 'sax'; saxKey: SaxKey; color: MappingColor };

// Map of Launchpad keys to their mappings
export type NoteMap = Map<Key, NoteMapping>;

// Interface for a MIDI note mapping
export type NiceNoteMapping =
  | { k: number; type: 'note'; n: string; o: number; r?: LaunchpadColor; p?: LaunchpadColor }
  | { k: number; type: 'pitch'; b: number; r?: LaunchpadColor; p?: LaunchpadColor }
  | { k: number; type: 'timbre'; w: string; r?: LaunchpadColor; p?: LaunchpadColor }
  | { k: number; type: 'sax'; s: string; r?: LaunchpadColor; p?: LaunchpadColor };

// Map of MIDI notes to their mappings
export type NiceNoteMap = NiceNoteMapping[];

export const DEFAULT_START_NOTE: Note = 39; // D#2
export const DEFAULT_HORIZONTAL_STEP = 2;   // Wicky-Hayden
export const DEFAULT_VERTICAL_STEP = 5;

export function defaultColorFromNote(note: Note): MappingColor {
  return isBlackNote(note)
       ? { rest: DEFAULT_BLACK_REST, pressed: DEFAULT_BLACK_PRESSED }
       : { rest: DEFAULT_WHITE_REST, pressed: DEFAULT_WHITE_PRESSED };
}

export function generateIsomorphicLayoutMap(
  startNote: Note,
  horizontalStep: number,
  verticalStep: number,
  colorForNote: (note: Note) => MappingColor,
): NoteMap {
  const noteMap: NoteMap = new Map();
  GRID_LAYOUT.forEach((row, rowIndex) => {
    row.forEach((source, colIndex) => {
      const target = (startNote + (colIndex * horizontalStep) + (rowIndex * verticalStep)) as Note;
      noteMap.set(source, { type: 'note', target, color: colorForNote(target) });
    });
  });
  return noteMap;
}

export const SAX_START_NOTE: Note = 58; // Bb3

export function generateSaxophoneLayoutMap(): NoteMap {
  // Rough physical arrangement: left-hand stack (upper) and right-hand stack (lower), plus a few palm/side keys
  // Many cells intentionally unmapped
  const coords: Array<{ r: number; c: number }> = [
    // Left hand main stack (top-ish)
    { r: 7, c: 1 }, // B
    { r: 6, c: 1 }, // C
    { r: 5, c: 1 }, // C#
    { r: 4, c: 1 }, // D
    { r: 3, c: 1 }, // D#
    { r: 2, c: 1 }, // E
    // Right hand main stack (lower)
    { r: 7, c: 3 }, // F
    { r: 6, c: 3 }, // F#
    { r: 5, c: 3 }, // G
    { r: 4, c: 3 }, // G#
    { r: 3, c: 3 }, // A
    { r: 2, c: 3 }, // A#
    { r: 1, c: 3 }, // B
    // Palm keys (top row)
    { r: 8, c: 2 }, // C
    { r: 8, c: 3 }, // C#
    { r: 8, c: 4 }, // D
    // Side keys (right side)
    { r: 6, c: 6 }, // D# side
    { r: 5, c: 6 }, // E side
    { r: 4, c: 6 }, // F side
  ];

  const map: NoteMap = new Map();
  let note: Note = SAX_START_NOTE;
  coords.forEach(({ r, c }) => {
    if (r >= 0 && r < GRID_LAYOUT.length && c >= 0 && c < GRID_LAYOUT[r].length) {
      const source = GRID_LAYOUT[r][c];
      map.set(source, { type: 'note', target: note, color: defaultColorFromNote(note) });
      note = (note + 1) as Note; // chromatic steps
    }
  });
  return map;
}

export function niceNoteMapParse(value: string): NiceNoteMap | string {
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return 'Invalid JSON: expected an array of mappings';
    }

    const result: NiceNoteMap = [];
    for (const entry of parsed) {
      if (entry === null || typeof entry !== 'object') {
        return 'Invalid mapping entry: expected an object';
      }
      const key = (entry as any).k;
      if (typeof key !== 'number') {
        return 'Invalid or missing "k" (key) in mapping entry';
      }

      const rest: LaunchpadColor = (entry as any).r ?? DEFAULT_COLOR;
      const pressed: LaunchpadColor = (entry as any).p ?? DEFAULT_COLOR;

      if ('n' in (entry as any) || 'o' in (entry as any)) {
        const name = (entry as any).n;
        const octave = (entry as any).o;
        if (typeof name !== 'string' || typeof octave !== 'number') {
          return 'Invalid note mapping: expected "n" (string) and "o" (number)';
        }
        result.push({ k: key, type: 'note', n: name, o: octave, r: rest, p: pressed });
        continue;
      }

      if ('b' in (entry as any)) {
        const bend = (entry as any).b;
        if (typeof bend !== 'number') {
          return 'Invalid bend mapping: expected "b" (number)';
        }
        result.push({ k: key, type: 'pitch', b: bend, r: rest, p: pressed });
        continue;
      }

      if ('w' in (entry as any)) {
        const waveform = (entry as any).w;
        if (typeof waveform !== 'string') {
          return 'Invalid timbre mapping: expected "w" (string)';
        }
        result.push({ k: key, type: 'timbre', w: waveform, r: rest, p: pressed });
        continue;
      }

      if ('s' in (entry as any)) {
        const saxKey = (entry as any).s;
        if (typeof saxKey !== 'string') {
          return 'Invalid saxophone mapping: expected "s" (string)';
        }
        result.push({ k: key, type: 'sax', s: saxKey, r: rest, p: pressed });
        continue;
      }

      return 'Invalid mapping entry: must include either note ("n" and "o"), bend ("b"), timbre ("w"), or saxophone ("s") fields';
    }

    return result;
  } catch (_err) {
    return 'Invalid JSON format';
  }
}

export function niceNoteMapToNoteMap(m: NiceNoteMap): NoteMap | string {
  const newNoteMap: NoteMap = new Map();
  for (const mapping of m) {
    const pressed = mapping.p !== undefined ? mapping.p : DEFAULT_COLOR;
    const rest = mapping.r !== undefined ? mapping.r : DEFAULT_COLOR;

    if (mapping.k === undefined) {
      return 'Invalid mapping: missing key ("k")';
    }

    if (mapping.type === 'note') {
      const noteName = stringToNoteName(mapping.n);
      if (!noteName) {
        return `Invalid note name: ${mapping.n}`;
      }
      newNoteMap.set(mapping.k, {
        type: 'note',
        target: noteReprToNote({ name: noteName, octave: mapping.o }),
        color: { rest, pressed },
      });
      continue;
    }

    if (mapping.type === 'pitch') {
      newNoteMap.set(mapping.k, {
        type: 'pitch',
        bend: mapping.b,
        color: { rest, pressed },
      });
      continue;
    }

    if (mapping.type === 'timbre') {
      newNoteMap.set(mapping.k, {
        type: 'timbre',
        waveform: mapping.w as OscillatorType,
        color: { rest, pressed },
      });
      continue;
    }

    if (mapping.type === 'sax') {
      // Validate that the sax key is a valid MainKeys value
      const validSaxKeys = ['b', 'b♭ bis', 'a', 'g', 'f', 'e', 'd', 'c', 'g♯', 'low c♯', 'low b♭', 'low b', 'd♯', 'f♯', 'side b♭', 'side c'];
      if (!validSaxKeys.includes(mapping.s)) {
        return `Invalid saxophone key: ${mapping.s}. Valid keys are: ${validSaxKeys.join(', ')}`;
      }
      newNoteMap.set(mapping.k, {
        type: 'sax',
        saxKey: mapping.s as SaxKey,
        color: { rest, pressed },
      });
      continue;
    }

    return 'Invalid mapping entry: must include either note ("n" and "o"), bend ("b"), timbre ("w"), or saxophone ("s") fields';
  }
  return newNoteMap;
}

export function niceNoteMap(value: string): NoteMap | string {
  const parsed = niceNoteMapParse(value);
  if (typeof parsed === 'string') {
    return parsed;
  }
  return niceNoteMapToNoteMap(parsed);
}

export function noteMapToNiceNoteMapFormat(noteMap: NoteMap): string {
  const noteMappings = Array.from(noteMap.values()).filter(
    (m): m is Extract<NoteMapping, { type: 'note' }> => m.type === 'note'
  );

  const maxNameLength = noteMappings.length > 0
    ? Math.max(
        ...noteMappings.map((m) => {
          const noteRepr = noteToNoteRepr(m.target);
          return noteRepr.name.length;
        })
      )
    : 1;

  return `[\n${Array.from(noteMap.entries())
    .map(([sourceKey, mapping]) => {
      switch (mapping.type) {
        case 'note': {
          const noteRepr = noteToNoteRepr(mapping.target);
          const namePadding = ' '.repeat(maxNameLength - noteRepr.name.length);
          return `  { "k": ${sourceKey}, "type": "note", "n": "${noteRepr.name}"${namePadding}, "o": ${noteRepr.octave}, "r": ${mapping.color.rest}, "p": ${mapping.color.pressed} }`;
        }
        case 'pitch':
          return `  { "k": ${sourceKey}, "type": "pitch", "b": ${mapping.bend}, "r": ${mapping.color.rest}, "p": ${mapping.color.pressed} }`;
        case 'timbre':
          return `  { "k": ${sourceKey}, "type": "timbre", "w": "${mapping.waveform}", "r": ${mapping.color.rest}, "p": ${mapping.color.pressed} }`;
        case 'sax':
          return `  { "k": ${sourceKey}, "type": "sax", "s": "${mapping.saxKey}", "r": ${mapping.color.rest}, "p": ${mapping.color.pressed} }`;
        default: {
          const m = mapping as { color: MappingColor };
          return `  { "k": ${sourceKey}, "type": "unknown", "r": ${m.color.rest}, "p": ${m.color.pressed} }`;
        }
      }
    })
    .join(',\n')}\n]`;
}



// export const niceNoteMapStringToNoteMap = (niceNoteMapString: string): NoteMap | string => {
//   try {
//     // TODO: Check if casting can be done
//     const niceNoteMap = JSON.parse(niceNoteMapString) as NiceNoteMap;
//     const noteMap: NoteMap = {};
//     for (const [key, value] of Object.entries(niceNoteMap)) {
//       let val = stringToNoteName(value.name);
//       if (!val) {
//         return 'Invalid note name ' + value.name;
//       }
//       noteMap[parseInt(key)] = {
//         target: noteReprToNote({ name: val, octave: value.octave }),
//         restColor: value.restColor,
//         pressedColor: value.pressedColor
//       };
//     }
//     return noteMap;
//   } catch (error) {
//     return 'Invalid JSON format';
//   }
// };


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

// Default note mappings for the entire range (36-99)
export const DEFAULT_MAPPINGS: NoteMap = generateIsomorphicLayoutMap(
  DEFAULT_START_NOTE,
  DEFAULT_HORIZONTAL_STEP,
  DEFAULT_VERTICAL_STEP,
  defaultColorFromNote,
);

export interface DeviceSettings {
    brightness: number;
}

export interface ColorSettings {
    singleColor: boolean;
    whiteRest: LaunchpadColor;
    whitePressed: LaunchpadColor;
    blackRest: LaunchpadColor;
    blackPressed: LaunchpadColor;
}

export type ShowSameNote = "no" | "yes" | "octave";

export type NoteState = Map<Note, number> // number of times the note is being pressed

export const increaseNoteMut = (noteState: NoteState, note: number) => {
    noteState.set(note, (noteState.get(note) ?? 0) + 1);
};

export const decreaseNoteMut = (noteState: NoteState, note: number) => {
    const v = noteState.get(note);
    if (v === undefined)
        return;
    else if (v == 1)
        noteState.delete(note);
    else
        noteState.set(note, v - 1);
};

export const isActiveNote = (noteState: NoteState, note: number) => {
    const v = noteState.get(note);
    return v !== undefined && v > 0;
};

export const isLastNote = (noteState: NoteState, note: number) => {
    const v = noteState.get(note);
    return v !== undefined && v == 1;
};

export function colorFromSettings(settings: ColorSettings, note: Note | null): MappingColor {
    return settings.singleColor ? {
        rest: settings.whiteRest,
        pressed: settings.whitePressed,
    } : note !== null && !isBlackNote(note) ? {
        rest: settings.whiteRest,
        pressed: settings.whitePressed,
    } : {
        rest: settings.blackRest,
        pressed: settings.blackPressed,
    }
}

export function applyColorsToMap(settings: ColorSettings, noteMap: NoteMap): NoteMap {
    const newNoteMap: NoteMap = new Map();
    noteMap.forEach((mapping, note) => {
        newNoteMap.set(note, { ...mapping,
            color: colorFromSettings(settings, 'target' in mapping ? mapping.target : null) });
    });
    return newNoteMap;
}
