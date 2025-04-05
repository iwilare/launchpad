import { Note } from './types/notes';

export interface SoundSettings {
  volume: number;
  waveform: OscillatorType;
}

export interface NoteMapping {
  note: number;
  key: Note;
  restColor: string;
  pressedColor: string;
}

export interface ColorSettings {
  [key: string]: string;
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
  [key: number]: boolean;
}

export interface KeyState {
  [key: Note]: boolean;
}
