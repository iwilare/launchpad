import { SvelteMap } from "svelte/reactivity";
import { DEFAULT_COLOR, DEFAULT_WHITE_REST, DEFAULT_WHITE_PRESSED, DEFAULT_BLACK_REST, DEFAULT_BLACK_PRESSED, DEFAULT_SAX_REST, DEFAULT_SAX_PRESSED, DEFAULT_SAX_SIDE_REST, DEFAULT_SAX_SIDE_PRESSED, DEFAULT_ANTI_COLOR, GRID_LAYOUT } from "./layouts";
import { NoteNameList, type Note, type NoteRepr, NoteName, isBlackNote, stringToNoteName, noteReprToNote, noteToNoteRepr } from "./notes";
import { isSideSaxNote, type SaxKey, type saxPressedKeysToNote } from "./saxophone";

// The Launchpad key numbers
export type Key = number;

// Hex color codes for Launchpad (00-7F)
export type LaunchpadColor = number;

export type Controller = Map<Key, { active: boolean, color: LaunchpadColor }>;

export const emptyController: () => Controller = () => new SvelteMap(
  GRID_LAYOUT.flatMap(r => r.map(k => [k, { active: false, color: DEFAULT_COLOR }])));

export type MappingColor = { rest: LaunchpadColor; pressed: LaunchpadColor };

export type TransposerSettings = {
  // The base note to transpose relative to (e.g., C4=60). Effective offset = transposeNote - 60
  transposeNote: Note;
  // 14-bit pitch bend value [0..16383], where 8192 is center
  pitchBend: number;
};

export const DEFAULT_TRANSPOSER: TransposerSettings = {
  transposeNote: 60, // C4
  pitchBend: 8192,
};

// Extended mapping types for different actions
export type NoteMapping =
  | { type: 'note'; target: Note; }
  | { type: 'pitch'; bend: number; }
  | { type: 'timbre'; waveform: OscillatorType; }
  | { type: 'sax'; key: SaxKey; };

export type MapData = { mapping: NoteMapping, color: MappingColor };

export const DEFAULT_MAPPING_COLOR = { rest: DEFAULT_COLOR, pressed: DEFAULT_COLOR };

// Map of Launchpad keys to their mappings
export type NoteMap = Map<Key, MapData>;

// Interface for a MIDI note mapping
export type NiceNoteMapping =
  | { k: number; type: 'note'; n: string; o: number; r?: LaunchpadColor; p?: LaunchpadColor }
  | { k: number; type: 'pitch'; b: number; r?: LaunchpadColor; p?: LaunchpadColor }
  | { k: number; type: 'timbre'; w: string; r?: LaunchpadColor; p?: LaunchpadColor }
  | { k: number; type: 'sax'; s: string; r?: LaunchpadColor; p?: LaunchpadColor };

// Map of MIDI notes to their mappings
export type NiceNoteMap = NiceNoteMapping[];

export function niceNoteMapParse(value: string): NiceNoteMap | string {
  let parsed: unknown;
  try { parsed = JSON.parse(value); } catch { return 'Invalid JSON'; }
  if (!Array.isArray(parsed)) return 'Invalid JSON: expected array';
  const out: NiceNoteMap = [];
  for (const raw of parsed) {
    if (raw === null || typeof raw !== 'object') return 'Invalid entry: expected object';
    const e: any = raw;
    if (typeof e.k !== 'number') return 'Missing k';
    const type = e.type;
    const base = { k: e.k } as any;
    if (e.r !== undefined) { if (typeof e.r !== 'number') return 'Invalid r'; base.r = e.r; }
    if (e.p !== undefined) { if (typeof e.p !== 'number') return 'Invalid p'; base.p = e.p; }
    switch (type) {
      case 'note':
        if (typeof e.n !== 'string' || typeof e.o !== 'number') return 'Invalid note mapping';
        out.push({ ...base, type: 'note', n: e.n, o: e.o }); break;
      case 'pitch':
        if (typeof e.b !== 'number') return 'Invalid pitch mapping';
        out.push({ ...base, type: 'pitch', b: e.b }); break;
      case 'timbre':
        if (typeof e.w !== 'string') return 'Invalid timbre mapping';
        out.push({ ...base, type: 'timbre', w: e.w }); break;
      case 'sax':
        if (typeof e.s !== 'string') return 'Invalid sax mapping';
        out.push({ ...base, type: 'sax', s: e.s }); break;
      default:
        return `Unknown type ${type}`;
    }
  }
  return out;
}

export function niceNoteMapToNoteMap(m: NiceNoteMap): NoteMap | string {
  const newMap: NoteMap = new SvelteMap();
  for (const mm of m) {
    const rest = mm.r ?? DEFAULT_COLOR;
    const pressed = mm.p ?? DEFAULT_COLOR;
    switch (mm.type) {
      case 'note': {
        const nn = stringToNoteName(mm.n);
        if (!nn) return `Invalid note name ${mm.n}`;
        newMap.set(mm.k, { mapping: { type: 'note', target: noteReprToNote({ name: nn, octave: mm.o }) }, color: { rest, pressed } });
        break;
      }
      case 'pitch':
        newMap.set(mm.k, { mapping: { type: 'pitch', bend: mm.b }, color: { rest, pressed } });
        break;
      case 'timbre':
        newMap.set(mm.k, { mapping: { type: 'timbre', waveform: mm.w as OscillatorType }, color: { rest, pressed } });
        break;
      case 'sax':
        newMap.set(mm.k, { mapping: { type: 'sax', key: mm.s as SaxKey }, color: { rest, pressed } });
        break;
    }
  }
  return newMap;
}

export function niceNoteMap(value: string): NoteMap | string {
  const parsed = niceNoteMapParse(value);
  if (typeof parsed === 'string') {
    return parsed;
  }
  return niceNoteMapToNoteMap(parsed);
}

export function niceify(noteMap: NoteMap): string {
  const lines: string[] = [];
  noteMap.forEach(({ mapping, color }, k) => {
    if (mapping.type === 'note') {
      const repr = noteToNoteRepr(mapping.target);
      lines.push(`  {"k":${k},"type":"note","n":"${repr.name}","o":${repr.octave},"r":${color.rest},"p":${color.pressed}}`);
    } else if (mapping.type === 'pitch') {
      lines.push(`  {"k":${k},"type":"pitch","b":${mapping.bend},"r":${color.rest},"p":${color.pressed}}`);
    } else if (mapping.type === 'timbre') {
      lines.push(`  {"k":${k},"type":"timbre","w":"${mapping.waveform}","r":${color.rest},"p":${color.pressed}}`);
    } else if (mapping.type === 'sax') {
      lines.push(`  {"k":${k},"type":"sax","s":"${mapping.key}","r":${color.rest},"p":${color.pressed}}`);
    }
  });
  return '[\n' + lines.join(',\n') + '\n]';
}

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

export const increaseNoteMut = <K>(noteState: Map<K, number>, note: K) => {
    noteState.set(note, (noteState.get(note) ?? 0) + 1);
};

export const decreaseNoteMut = <K>(noteState: Map<K, number>, note: K) => {
    const v = noteState.get(note);
    if (v === undefined)
        return;
    else if (v == 1)
        noteState.delete(note);
    else
        noteState.set(note, v - 1);
};

export const isActiveNote = <K>(noteState: Map<K, number>, note: K) => {
    const v = noteState.get(note);
    return v !== undefined && v > 0;
};

export const isLastNote = <K>(noteState: Map<K, number>, note: K) => {
    const v = noteState.get(note);
    return v !== undefined && v == 1;
};

export const forEachNotePressed = <K>(noteState: Map<K, number>, callback: (note: K) => void) => {
    noteState.forEach((value, key) => {
        for (let i = 0; i < value; i++) {
            callback(key);
        }
    });
};

export function colorFromSettings(settings: ColorSettings, m: NoteMapping): MappingColor {
  return settings.singleColor
       ? { rest: settings.whiteRest, pressed: settings.whitePressed }
       : (m.type == 'note' ? isBlackNote(m.target) : m.type == 'sax' ? isSideSaxNote(m.key) : false)
         ? { rest: settings.blackRest, pressed: settings.blackPressed }
         : { rest: settings.whiteRest, pressed: settings.whitePressed };
}
