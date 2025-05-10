// Note name enum with both sharp and flat representations
export enum NoteName {
  C = 'C',
  C_SHARP = 'C#',
  D = 'D',
  D_SHARP = 'D#',
  E = 'E',
  F = 'F',
  F_SHARP = 'F#',
  G = 'G',
  G_SHARP = 'G#',
  A = 'A',
  A_SHARP = 'A#',
  B = 'B'
}

export const LOWEST_CONTROLLER_NOTE = 36;

export const NoteNameList = Object.values(NoteName);

// The Launchpad key numbers
export type Key = number;

// The MIDI standard note number
export type Note = number;

// make sure the note is not out of range
export function increaseNote(note: Note): Note | null {
  return note < 127 ? note + 1 : null;
}

export function decreaseNote(note: Note): Note | null {
  return note > 0 ? note - 1 : null;
}

export function canBeIncreased(note: Note): boolean { return note < 127; }
export function canBeDecreased(note: Note): boolean { return note > 0; }

// Note representation with name and octave
export interface NoteRepr {
  name: NoteName;
  octave: number;
}

// Hex color codes for Launchpad (00-7F)
export type LaunchpadColor = number;

export const DEFAULT_COLOR = 0x00;

export type Controller = Map<Key, { active: boolean, color: LaunchpadColor }>;

// Interface for a MIDI note mapping
export interface NoteMapping {
  target: Note;
  color: NoteColor;
}

export interface NoteColor {
  rest: LaunchpadColor;
  pressed: LaunchpadColor;
}

// Map of Launchpad keys to their mappings
export type NoteMap = Map<Key, NoteMapping>;

// Interface for a MIDI note mapping
export interface NiceNoteMapping {
  k: number;
  n: string;
  o: number;
  r: LaunchpadColor;
  p: LaunchpadColor;
}

// Map of MIDI notes to their mappings
export type NiceNoteMap = NiceNoteMapping[];

export function niceNoteMapToNoteMap(value: string): NoteMap | string {
  const parsedJson = JSON.parse(value);

  if (!Array.isArray(parsedJson)) {
    return 'JSON must be an array of mappings';
  }

  const newNoteMap: NoteMap = new Map();
  for (const mapping of parsedJson) {
    const noteName = stringToNoteName(mapping.n);
    if (!noteName) {
      return `Invalid note name: ${mapping.n}`;
    }
    newNoteMap.set(mapping.k, {
      target: noteReprToNote({ name: noteName, octave: mapping.o }),
      color: {
        rest: mapping.c,
        pressed: mapping.p
      }
    });
  }
  return newNoteMap;
}

export function noteMapToNiceNoteMapFormat(noteMap: NoteMap): string {
  const maxNameLength = Math.max(...Array.from(noteMap.values()).map(mapping => {
    const noteRepr = noteToNoteRepr(mapping.target);
    return noteRepr.name.length;
  }));

  return `[\n${Array.from(noteMap.entries())
    .map(([sourceNote, mapping]) => {
      const noteRepr = noteToNoteRepr(mapping.target);
      const namePadding = ' '.repeat(maxNameLength - noteRepr.name.length);
      return `  { "k": ${sourceNote}, "n": "${noteRepr.name}"${namePadding}, "o": ${noteRepr.octave}, "c": ${mapping.color.rest}, "p": ${mapping.color.pressed} }`;
    })
    .join(',\n')}\n]`
}



// Helper function to check if a note is a black key
export const isBlackKey = (note: NoteName): boolean => {
  return [
    NoteName.C_SHARP,
    NoteName.D_SHARP,
    NoteName.F_SHARP,
    NoteName.G_SHARP,
    NoteName.A_SHARP,
  ].includes(note);
};

export const stringToNoteName = (noteString: string): NoteName | null => {
  return noteString == 'C'  ? NoteName.C :
         noteString == 'C#' ? NoteName.C_SHARP :
         noteString == 'Db' ? NoteName.C_SHARP :
         noteString == 'D'  ? NoteName.D :
         noteString == 'D#' ? NoteName.D_SHARP :
         noteString == 'Eb' ? NoteName.D_SHARP :
         noteString == 'E'  ? NoteName.E :
         noteString == 'F'  ? NoteName.F :
         noteString == 'F#' ? NoteName.F_SHARP :
         noteString == 'Gb' ? NoteName.F_SHARP :
         noteString == 'G'  ? NoteName.G :
         noteString == 'G#' ? NoteName.G_SHARP :
         noteString == 'Ab' ? NoteName.G_SHARP :
         noteString == 'A'  ? NoteName.A :
         noteString == 'A#' ? NoteName.A_SHARP :
         noteString == 'Bb' ? NoteName.A_SHARP :
         noteString == 'B'  ? NoteName.B : null;
};

// Convert a note string (e.g. "C4", "F#3") to a MIDI note number
export const stringToNoteRepr = (noteString: string): NoteRepr | null => {
  // Match format: note[#b]octave (e.g. C4, F#3, Bb2)
  const match = noteString.match(/^([A-G][#b]?)\s*(\d+)$/);
  if (!match) return null;

  const [, noteNameString, octaveStr] = match;

  const noteName = stringToNoteName(noteNameString);
  if (!noteName) return null;

  const octave = parseInt(octaveStr);
  if (isNaN(octave) || octave < 0 || octave > 9) return null;

  return { name: noteName, octave: octave };
};

export const stringToNote = (noteString: string): Note | null => {
  const noteRepr = stringToNoteRepr(noteString);
  if (!noteRepr) return null;
  return noteReprToNote(noteRepr);
};

export const noteReprToString = (noteRepr: NoteRepr): string => {
  return `${noteRepr.name}${noteRepr.octave}`;
};

export const noteToNoteRepr = (note: Note): NoteRepr => {
  const octave = Math.floor(note / 12) - 1;
  const noteIndex = note % 12;
  const noteName = NoteNameList[noteIndex];
  return { name: noteName, octave: octave };
};

export const noteNameToNote = (noteName: NoteName): Note => {
  return NoteNameList.indexOf(noteName);
};

export const noteReprToNote = (noteRepr: NoteRepr): Note => {
  return (noteRepr.octave + 1) * 12 + noteNameToNote(noteRepr.name);
};

export const noteToString = (note: Note): string => {
  return noteReprToString(noteToNoteRepr(note));
};

export const isBlackNote = (note: Note): boolean => {
  return isBlackKey(noteToNoteRepr(note).name);
};

export const areSameNote = (note1: Note, note2: Note): boolean => {
  return noteToNoteRepr(note1).name === noteToNoteRepr(note2).name;
};

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

export const GRID_LAYOUT: Note[][] = [
  // Row 0 (bottom row)
  [36, 37, 38, 39, 68, 69, 70, 71],
  // Row 1
  [40, 41, 42, 43, 72, 73, 74, 75],
  // Row 2
  [44, 45, 46, 47, 76, 77, 78, 79],
  // Row 3
  [48, 49, 50, 51, 80, 81, 82, 83],
  // Row 4
  [52, 53, 54, 55, 84, 85, 86, 87],
  // Row 5
  [56, 57, 58, 59, 88, 89, 90, 91],
  // Row 6
  [60, 61, 62, 63, 92, 93, 94, 95],
  // Row 7 (top row)
  [64, 65, 66, 67, 96, 97, 98, 99]
] as const;

export const DEFAULT_DELTA_MAP: number[][] = [
  [ 0,  2,  4,  5,  7,  9, 10, 12],
  [ 1,  3,  5,  6,  8, 10, 11, 13], 
  [ 2,  4,  5,  7,  9, 11, 12, 14],
  [ 3,  5,  6,  8, 10, 12, 13, 15],
  [ 4,  6,  7,  9, 11, 13, 14, 16],
  [ 5,  7,  8, 10, 12, 14, 15, 17],
  [ 6,  8,  9, 11, 13, 15, 16, 18],
  [ 7,  9, 10, 12, 14, 16, 17, 19],
]

export const EXTRA_DELTA_MAP: number[][] = [
  [ 0,  2,  4,  5,  7,  9, 10, 12],
  [ 1,  3,  5,  6,  8, 10, 11, 13], 
  
  [12, 14, 15, 17, 19, 21, 22, 24],
  [13, 15, 16, 18, 20, 22, 23, 25],

  [24, 26, 27, 29, 31, 33, 34, 36],
  [25, 27, 28, 30, 32, 34, 35, 37],

  [35, 37, 38, 40, 42, 44, 45, 47],
  [36, 38, 39, 41, 43, 45, 46, 48],

]

// Default note mappings for the entire range (36-99)
export const DEFAULT_MAPPINGS: NoteMap = new Map([
  [36, { "target": 39, "color": { "rest": 78, "pressed": 21 } }],
  [37, { "target": 41, "color": { "rest": 78, "pressed": 21 } }],
  [38, { "target": 43, "color": { "rest": 78, "pressed": 21 } }],
  [39, { "target": 45, "color": { "rest": 78, "pressed": 21 } }],
  [40, { "target": 44, "color": { "rest": 78, "pressed": 21 } }],
  [41, { "target": 46, "color": { "rest": 78, "pressed": 21 } }],
  [42, { "target": 48, "color": { "rest": 78, "pressed": 21 } }],
  [43, { "target": 50, "color": { "rest": 78, "pressed": 21 } }],
  [44, { "target": 49, "color": { "rest": 78, "pressed": 21 } }],
  [45, { "target": 51, "color": { "rest": 78, "pressed": 21 } }],
  [46, { "target": 53, "color": { "rest": 78, "pressed": 21 } }],
  [47, { "target": 55, "color": { "rest": 78, "pressed": 21 } }],
  [48, { "target": 54, "color": { "rest": 78, "pressed": 21 } }],
  [49, { "target": 56, "color": { "rest": 78, "pressed": 21 } }],
  [50, { "target": 58, "color": { "rest": 78, "pressed": 21 } }],
  [51, { "target": 60, "color": { "rest": 78, "pressed": 21 } }],
  [52, { "target": 59, "color": { "rest": 78, "pressed": 21 } }],
  [53, { "target": 61, "color": { "rest": 78, "pressed": 21 } }],
  [54, { "target": 63, "color": { "rest": 78, "pressed": 21 } }],
  [55, { "target": 65, "color": { "rest": 78, "pressed": 21 } }],
  [56, { "target": 64, "color": { "rest": 78, "pressed": 21 } }],
  [57, { "target": 66, "color": { "rest": 78, "pressed": 21 } }],
  [58, { "target": 68, "color": { "rest": 78, "pressed": 21 } }],
  [59, { "target": 70, "color": { "rest": 78, "pressed": 21 } }],
  [60, { "target": 69, "color": { "rest": 78, "pressed": 21 } }],
  [61, { "target": 71, "color": { "rest": 78, "pressed": 21 } }],
  [62, { "target": 73, "color": { "rest": 78, "pressed": 21 } }],
  [63, { "target": 75, "color": { "rest": 78, "pressed": 21 } }],
  [64, { "target": 74, "color": { "rest": 78, "pressed": 21 } }],
  [65, { "target": 76, "color": { "rest": 78, "pressed": 21 } }],
  [66, { "target": 78, "color": { "rest": 78, "pressed": 21 } }],
  [67, { "target": 80, "color": { "rest": 78, "pressed": 21 } }],
  [68, { "target": 47, "color": { "rest": 78, "pressed": 21 } }],
  [69, { "target": 49, "color": { "rest": 78, "pressed": 21 } }],
  [70, { "target": 51, "color": { "rest": 78, "pressed": 21 } }],
  [71, { "target": 53, "color": { "rest": 78, "pressed": 21 } }],
  [72, { "target": 52, "color": { "rest": 78, "pressed": 21 } }],
  [73, { "target": 54, "color": { "rest": 78, "pressed": 21 } }],
  [74, { "target": 56, "color": { "rest": 78, "pressed": 21 } }],
  [75, { "target": 58, "color": { "rest": 78, "pressed": 21 } }],
  [76, { "target": 57, "color": { "rest": 78, "pressed": 21 } }],
  [77, { "target": 59, "color": { "rest": 78, "pressed": 21 } }],
  [78, { "target": 61, "color": { "rest": 78, "pressed": 21 } }],
  [79, { "target": 63, "color": { "rest": 78, "pressed": 21 } }],
  [80, { "target": 62, "color": { "rest": 78, "pressed": 21 } }],
  [81, { "target": 64, "color": { "rest": 78, "pressed": 21 } }],
  [82, { "target": 66, "color": { "rest": 78, "pressed": 21 } }],
  [83, { "target": 68, "color": { "rest": 78, "pressed": 21 } }],
  [84, { "target": 67, "color": { "rest": 78, "pressed": 21 } }],
  [85, { "target": 69, "color": { "rest": 78, "pressed": 21 } }],
  [86, { "target": 71, "color": { "rest": 78, "pressed": 21 } }],
  [87, { "target": 73, "color": { "rest": 78, "pressed": 21 } }],
  [88, { "target": 72, "color": { "rest": 78, "pressed": 21 } }],
  [89, { "target": 74, "color": { "rest": 78, "pressed": 21 } }],
  [90, { "target": 76, "color": { "rest": 78, "pressed": 21 } }],
  [91, { "target": 78, "color": { "rest": 78, "pressed": 21 } }],
  [92, { "target": 77, "color": { "rest": 78, "pressed": 21 } }],
  [93, { "target": 79, "color": { "rest": 78, "pressed": 21 } }],
  [94, { "target": 81, "color": { "rest": 78, "pressed": 21 } }],
  [95, { "target": 83, "color": { "rest": 78, "pressed": 21 } }],
  [96, { "target": 82, "color": { "rest": 78, "pressed": 21 } }],
  [97, { "target": 84, "color": { "rest": 78, "pressed": 21 } }],
  [98, { "target": 86, "color": { "rest": 78, "pressed": 21 } }],
  [99, { "target": 88, "color": { "rest": 78, "pressed": 21 } }]
])