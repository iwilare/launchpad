import type { Note } from "./notes";
import type { SoundSettings } from "./ui";

export type SoundState = {
  audioContext: AudioContext | null;
  activeNotes: Map<Note, {
    oscillator: OscillatorNode, 
    gainNode: GainNode, 
    number: number; // number of times the note is supposed to be playing
  }>
}

export function emptySoundState(): SoundState {
  return { audioContext: null, activeNotes: new Map() }
}

export function initializeSoundState(): SoundState {
    return { ...emptySoundState(), audioContext: new window.AudioContext() }
}

export function releaseAudioNote(ss: SoundState, note: number) { 
    const n = ss.activeNotes.get(note);
    if (n) {
        if (n.number > 1) {
            ss.activeNotes.set(note, { ...n, number: n.number - 1 });
        } else {
            n.oscillator.stop();
            ss.activeNotes.delete(note);
        }
    }
}

export function stopEverythingAudio(ss: SoundState) {
    ss.activeNotes.forEach((n) => {
        n.oscillator.stop();
    });
    ss.activeNotes.clear();
}

export function pressAudioNote(ss: SoundState, sc: SoundSettings, note: number, velocity: number = 1.0): null | string {
    const n = ss.activeNotes.get(note);
    if (!n) {
        if (!sc.enabled) return null;
        if (!ss.audioContext) return 'No audio context';

        const oscillator = ss.audioContext.createOscillator();
        const gainNode = ss.audioContext.createGain();

        oscillator.type = sc.waveform;

        oscillator.frequency.setValueAtTime(440 * Math.pow(2, (note - 69) / 12), ss.audioContext.currentTime);

        gainNode.gain.setValueAtTime(velocity * sc.volume * 0.3, ss.audioContext.currentTime);

        oscillator.connect(gainNode);
        gainNode.connect(ss.audioContext.destination);

        oscillator.start();

        ss.activeNotes.set(note, { oscillator, gainNode, number: 1 });
    } else {
        ss.activeNotes.set(note, { ...n, number: n.number + 1 });
    }
    return null;
}
