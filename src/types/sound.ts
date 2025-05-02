import type { Note } from "./notes";
import type { SoundSettings } from "./ui";

// Audio envelope constants (in seconds)
export const ENVELOPE = {
    ATTACK_TIME: 0.01,  // 10ms attack time
    RELEASE_TIME: 0.1,  // 100ms release time for smoother fade
    MAX_VOLUME: 0.3     // Maximum volume multiplier
} as const; 

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

export function releaseNoteAudioSynth(ss: SoundState, note: number) { 
    const n = ss.activeNotes.get(note);
    if (n) {
        if (n.number > 1) {
            ss.activeNotes.set(note, { ...n, number: n.number - 1 });
        } else {
            const currentTime = ss.audioContext!.currentTime;
            // Release phase: exponential ramp down to 0
            n.gainNode.gain.setTargetAtTime(0, currentTime, ENVELOPE.RELEASE_TIME / 3);
            // Stop oscillator after release is complete
            n.oscillator.stop(currentTime + ENVELOPE.RELEASE_TIME);
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

        // Set initial gain to 0
        gainNode.gain.setValueAtTime(0, ss.audioContext.currentTime);
        // Attack phase: exponential ramp up to target volume
        gainNode.gain.setTargetAtTime(
            velocity * sc.volume * ENVELOPE.MAX_VOLUME,
            ss.audioContext.currentTime,
            ENVELOPE.ATTACK_TIME / 3
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
