import { areSameNote, isBlackNote, noteToNoteRepr, type LaunchpadColor, type Note, type NoteColor, type NoteMap } from "./notes";

export interface SoundSettings {
    enabled: boolean;
    volume: number;
    waveform: OscillatorType;
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

export type NoteState = Map<Note, number> // number of times the note is being pressed

export const increaseNoteMut = (noteState: NoteState, note: number) => {
    noteState.set(note, (noteState.get(note) || 0) + 1);
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
    const newNoteMap: NoteMap = new Map();
    noteMap.forEach((mapping, note) => {
        newNoteMap.set(note, { ...mapping, color: colorFromSettings(settings, mapping.target) });
    });
    return newNoteMap;
}