import type { Note } from "./notes";

export const VOLUME_MULTIPLIER = 0.15;

export const EXPONENTIAL_VALUE = 0.001;

export interface SoundSettings {
    volume: number;
    waveform: OscillatorType;
    attackTime: number; // in milliseconds
    releaseTime: number; // in milliseconds
}

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

export function releaseNoteAudioSynth(ss: SoundState, sc: SoundSettings, note: number) { 
    const n = ss.activeNotes.get(note);
    if (n) {
        if (n.number > 1) {
            ss.activeNotes.set(note, { ...n, number: n.number - 1 });
        } else {
            const currentTime = ss.audioContext!.currentTime;
            n.gainNode.gain.setValueAtTime(Math.max(EXPONENTIAL_VALUE, n.gainNode.gain.value), currentTime);
            n.gainNode.gain.exponentialRampToValueAtTime(EXPONENTIAL_VALUE, currentTime + sc.releaseTime / 1000);
            n.oscillator.stop(currentTime + sc.releaseTime / 1000);
            ss.activeNotes.delete(note);
        }
    }
}

export function stopEverythingAudioSynth(ss: SoundState) {
    ss.activeNotes.forEach((n) => {
        n.oscillator.stop();
    });
    ss.activeNotes.clear();
}

export function pressNoteAudioSynth(ss: SoundState, sc: SoundSettings, note: number, velocity: number = 1.0): null | string {
    const n = ss.activeNotes.get(note);
    if (!n) {
        if (!ss.audioContext) return 'No audio context';

        const oscillator = ss.audioContext.createOscillator();
        const gainNode = ss.audioContext.createGain();

        oscillator.type = sc.waveform;
        oscillator.frequency.setValueAtTime(440 * Math.pow(2, (note - 69) / 12), ss.audioContext.currentTime);
        
        gainNode.gain.setValueAtTime(EXPONENTIAL_VALUE, ss.audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(
            Math.max(EXPONENTIAL_VALUE, velocity * sc.volume * VOLUME_MULTIPLIER), 
            ss.audioContext.currentTime + sc.attackTime / 1000
        );
        oscillator.connect(gainNode);
        gainNode.connect(ss.audioContext.destination);
        oscillator.start();

        ss.activeNotes.set(note, { oscillator, gainNode, number: 1 });
    } else {
        ss.activeNotes.set(note, { ...n, number: n.number + 1 });
    }
    return null;
}
