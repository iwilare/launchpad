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

export const DEFAULT_BASE_NOTE = 42;

export const LOWEST_CONTROLLER_NOTE = 36;

export const NoteNameList = Object.values(NoteName);

// MIDI note type (36-99 for our keyboard range)
export type Note = number;

// Note representation with name and octave
export interface NoteRepr {
  name: NoteName;
  octave: number;
}

// Hex color codes for Launchpad (00-7F)
export type LaunchpadColor = number;

// Interface for a MIDI note mapping
export interface NoteMapping {
  target: Note;
  restColor: LaunchpadColor;
  pressedColor: LaunchpadColor;
}

// Map of MIDI notes to their mappings
export type NoteMap = {
  [key: Note]: NoteMapping;
};

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

// Default note mappings for the entire range (36-99)
export const DEFAULT_MAPPINGS: NoteMap = {
  36: { target: 36, restColor: 0x4E, pressedColor: 0x15 },
  37: { target: 37, restColor: 0x5F, pressedColor: 0x15 },
  38: { target: 38, restColor: 0x4E, pressedColor: 0x15 },
  39: { target: 39, restColor: 0x5F, pressedColor: 0x15 },
  40: { target: 40, restColor: 0x4E, pressedColor: 0x15 },
  41: { target: 41, restColor: 0x4E, pressedColor: 0x15 },
  42: { target: 42, restColor: 0x5F, pressedColor: 0x15 },
  43: { target: 43, restColor: 0x4E, pressedColor: 0x15 },
  44: { target: 44, restColor: 0x5F, pressedColor: 0x15 },
  45: { target: 45, restColor: 0x4E, pressedColor: 0x15 },
  46: { target: 46, restColor: 0x5F, pressedColor: 0x15 },
  47: { target: 47, restColor: 0x4E, pressedColor: 0x15 },
  48: { target: 48, restColor: 0x4E, pressedColor: 0x15 },
  49: { target: 49, restColor: 0x5F, pressedColor: 0x15 },
  50: { target: 50, restColor: 0x4E, pressedColor: 0x15 },
  51: { target: 51, restColor: 0x5F, pressedColor: 0x15 },
  52: { target: 52, restColor: 0x4E, pressedColor: 0x15 },
  53: { target: 53, restColor: 0x4E, pressedColor: 0x15 },
  54: { target: 54, restColor: 0x5F, pressedColor: 0x15 },
  55: { target: 55, restColor: 0x4E, pressedColor: 0x15 },
  56: { target: 56, restColor: 0x5F, pressedColor: 0x15 },
  57: { target: 57, restColor: 0x4E, pressedColor: 0x15 },
  58: { target: 58, restColor: 0x5F, pressedColor: 0x15 },
  59: { target: 59, restColor: 0x4E, pressedColor: 0x15 },
  60: { target: 60, restColor: 0x4E, pressedColor: 0x15 },
  61: { target: 61, restColor: 0x5F, pressedColor: 0x15 },
  62: { target: 62, restColor: 0x4E, pressedColor: 0x15 },
  63: { target: 63, restColor: 0x5F, pressedColor: 0x15 },
  64: { target: 64, restColor: 0x4E, pressedColor: 0x15 },
  65: { target: 65, restColor: 0x4E, pressedColor: 0x15 },
  66: { target: 66, restColor: 0x5F, pressedColor: 0x15 },
  67: { target: 67, restColor: 0x4E, pressedColor: 0x15 },
  68: { target: 68, restColor: 0x5F, pressedColor: 0x15 },
  69: { target: 69, restColor: 0x4E, pressedColor: 0x15 },
  70: { target: 70, restColor: 0x5F, pressedColor: 0x15 },
  71: { target: 71, restColor: 0x4E, pressedColor: 0x15 },
  72: { target: 72, restColor: 0x4E, pressedColor: 0x15 },
  73: { target: 73, restColor: 0x5F, pressedColor: 0x15 },
  74: { target: 74, restColor: 0x4E, pressedColor: 0x15 },
  75: { target: 75, restColor: 0x5F, pressedColor: 0x15 },
  76: { target: 76, restColor: 0x4E, pressedColor: 0x15 },
  77: { target: 77, restColor: 0x4E, pressedColor: 0x15 },
  78: { target: 78, restColor: 0x5F, pressedColor: 0x15 },
  79: { target: 79, restColor: 0x4E, pressedColor: 0x15 },
  80: { target: 80, restColor: 0x5F, pressedColor: 0x15 },
  81: { target: 81, restColor: 0x4E, pressedColor: 0x15 },
  82: { target: 82, restColor: 0x5F, pressedColor: 0x15 },
  83: { target: 83, restColor: 0x4E, pressedColor: 0x15 },
  84: { target: 84, restColor: 0x4E, pressedColor: 0x15 },
  85: { target: 85, restColor: 0x5F, pressedColor: 0x15 },
  86: { target: 86, restColor: 0x4E, pressedColor: 0x15 },
  87: { target: 87, restColor: 0x5F, pressedColor: 0x15 },
  88: { target: 88, restColor: 0x4E, pressedColor: 0x15 },
  89: { target: 89, restColor: 0x4E, pressedColor: 0x15 },
  90: { target: 90, restColor: 0x5F, pressedColor: 0x15 },
  91: { target: 91, restColor: 0x4E, pressedColor: 0x15 },
  92: { target: 92, restColor: 0x5F, pressedColor: 0x15 },
  93: { target: 93, restColor: 0x4E, pressedColor: 0x15 },
  94: { target: 94, restColor: 0x5F, pressedColor: 0x15 },
  95: { target: 95, restColor: 0x4E, pressedColor: 0x15 },
  96: { target: 96, restColor: 0x4E, pressedColor: 0x15 },
  97: { target: 97, restColor: 0x5F, pressedColor: 0x15 },
  98: { target: 98, restColor: 0x4E, pressedColor: 0x15 },
  99: { target: 99, restColor: 0x5F, pressedColor: 0x15 }
}; 