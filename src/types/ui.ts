import { isBlackNote, noteToNoteRepr, type LaunchpadColor, type Note, type NoteColor, type NoteMap } from "./notes";

export interface SoundSettings {
    volume: number;
    waveform: OscillatorType;
}

export interface MIDIDevice {
    id: string;
    name: string;
    manufacturer: string;
    state: "connected" | "disconnected";
    connection: "closed" | "open" | "pending";
    type: "input" | "output";
}

export interface ColorSettings {
    isUniform: boolean;
    whiteRest: LaunchpadColor;
    whitePressed: LaunchpadColor;
    blackRest: LaunchpadColor;
    blackPressed: LaunchpadColor;
    uniformRest: LaunchpadColor;
    uniformPressed: LaunchpadColor;
}

export type ShowSameNote = "no" | "yes" | "octave";

export interface NoteState {
    [key: number]: number; // number of times the note is being pressed
}

export const addNote = (noteState: NoteState, note: number) => {
    return { ...noteState, [note]: (noteState[note] || 0) + 1 };
};

export const removeNote = (noteState: NoteState, note: number) => {
    return noteState[note]
        ? { ...noteState, [note]: Math.max(0, noteState[note] - 1) }
        : noteState;
};

export const isActiveNote = (noteState: NoteState, note: number) => {
    return noteState[note] && noteState[note] > 0;
};

export const isLastNote = (noteState: NoteState, note: number) => {
    return noteState[note] && noteState[note] == 1;
};

export interface KeyState {
    [key: Note]: boolean;
}

export function colorFromSettings(settings: ColorSettings, note: Note): NoteColor {
    return settings.isUniform ? {
        rest: settings.uniformRest,
        pressed: settings.uniformPressed,
    } : isBlackNote(note) ? {
        rest: settings.blackRest,
        pressed: settings.blackPressed,
    } : {
        rest: settings.whiteRest,
        pressed: settings.whitePressed,
    }
}

export function applyColorsToMap(settings: ColorSettings, noteMap: NoteMap): NoteMap {
    const newNoteMap: NoteMap = {};
    for (const [noteStr, mapping] of Object.entries(noteMap)) {
        const target = mapping.target;
        const note = parseInt(noteStr);
        const color = colorFromSettings(settings, target);
        newNoteMap[note] = { ...mapping, color: color };
    }
    return newNoteMap;
}

export function shouldLightUp(note: Note, activeNotes: NoteState, showSameNote: ShowSameNote) {
    return activeNotes[note]
        || (Object.entries(activeNotes)
            .filter(([_, number]) => number > 0)
            .some(([note2Str, _]) => {
                const note2 = parseInt(note2Str);
                return showSameNote === 'yes' ? note == note2 :
                    showSameNote === 'octave' ?
                        noteToNoteRepr(note).name === noteToNoteRepr(note2).name : false;
            }));
}