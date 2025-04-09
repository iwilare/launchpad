import { Note } from './types/notes';

export interface SoundSettings {
  volume: number;
  waveform: OscillatorType;
}

export interface MIDIDevice {
  id: string;
  name: string;
  manufacturer: string;
  state: 'connected' | 'disconnected';
  connection: 'closed' | 'open' | 'pending';
  type: 'input' | 'output';
}

export interface NoteState {
  [key: number]: number; // number of times the note is being pressed
}

export const addNote = (noteState: NoteState, note: number) => {
  return { ...noteState, [note]: (noteState[note] || 0) + 1 };
}

export const removeNote = (noteState: NoteState, note: number) => {
  return noteState[note] ? { ...noteState, [note]: Math.max(0, noteState[note] - 1) } 
                         : noteState
}

export const isActiveNote = (noteState: NoteState, note: number) => {
  return noteState[note] && noteState[note] > 0;
}

export const isLastNote = (noteState: NoteState, note: number) => {
  return noteState[note] && noteState[note] == 1;
}

export interface KeyState {
  [key: Note]: boolean;
}
