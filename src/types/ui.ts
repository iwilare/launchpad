import { isBlackNote, type LaunchpadColor, type Note, type NoteColor, type NoteMap } from "./notes";

export interface DeviceSettings {
    programmerMode: boolean;
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

export function colorFromSettings(settings: ColorSettings, note: Note): NoteColor {
    return settings.singleColor ? {
        rest: settings.whiteRest,
        pressed: settings.whitePressed,
    } : !isBlackNote(note) ? {
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
        newNoteMap.set(note, { ...mapping, color: colorFromSettings(settings, mapping.target) });
    });
    return newNoteMap;
}