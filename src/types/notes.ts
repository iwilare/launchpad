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
