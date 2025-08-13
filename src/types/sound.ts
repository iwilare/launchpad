import type { Note } from "./notes";

export const VOLUME_MULTIPLIER = 0.15;

export const EXPONENTIAL_VALUE = 0.001;

export interface SoundSettings {
    volume: number;          // 0..1 master volume
    waveform: OscillatorType;
    attackTime: number;      // in milliseconds
    releaseTime: number;     // in milliseconds
}

export type SoundState = {
    audioContext: AudioContext | null;
    // 14-bit pitch bend value [0..16383]; 8192 center. Applies globally for built-in synth
    // Range mapping assumes ±2 semitones span (can be tuned later if needed)
    pitchBend: number;
    activeNotes: Map<Note, {
        oscillator: OscillatorNode,
        gainNode: GainNode,
        number: number;
        velocityNorm: number; // 0..1 original velocity used for scaling with volume changes
    }>;
}

export function emptySoundState(): SoundState {
    return { audioContext: null, pitchBend: 8192, activeNotes: new Map() }
}

export function initializeSoundState(): SoundState {
        return { ...emptySoundState(), audioContext: new window.AudioContext() };
}

// Update currently active note gains to reflect new master volume
export function updateActiveNoteVolumes(ss: SoundState, sc: SoundSettings) {
    if (!ss.audioContext) return;
    const now = ss.audioContext.currentTime;
    ss.activeNotes.forEach(n => {
        const target = Math.max(EXPONENTIAL_VALUE, n.velocityNorm * sc.volume * VOLUME_MULTIPLIER);
        n.gainNode.gain.cancelScheduledValues(now);
        n.gainNode.gain.setTargetAtTime(target, now, 0.01);
    });
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
        try { n.oscillator.stop(); } catch {}
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
    const bendSemis = (ss.pitchBend - 8192) / 8192 * 2; // ±2 semitones
    const baseFreq = 440 * Math.pow(2, (note - 69) / 12);
    const bentFreq = baseFreq * Math.pow(2, bendSemis / 12);
    oscillator.frequency.setValueAtTime(bentFreq, ss.audioContext.currentTime);

    const velNorm = velocity > 1 ? Math.min(1, velocity / 127) : Math.max(0, velocity);
    const target = Math.max(EXPONENTIAL_VALUE, velNorm * sc.volume * VOLUME_MULTIPLIER);

    gainNode.gain.setValueAtTime(EXPONENTIAL_VALUE, ss.audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(target, ss.audioContext.currentTime + sc.attackTime / 1000);
    oscillator.connect(gainNode);
    gainNode.connect(ss.audioContext.destination);
        oscillator.start();

    ss.activeNotes.set(note, { oscillator, gainNode, number: 1, velocityNorm: velNorm });
    } else {
    ss.activeNotes.set(note, { ...n, number: n.number + 1 });
    }
    return null;
}

// Update current pitch bend value and retune active oscillators
export function setPitchBendSynth(ss: SoundState, bend14: number) {
    const v = Math.max(0, Math.min(16383, Math.floor(bend14)));
    ss.pitchBend = v;
    if (!ss.audioContext) return;
    const now = ss.audioContext.currentTime;
    const bendSemis = (ss.pitchBend - 8192) / 8192 * 2; // ±2 semitones
    ss.activeNotes.forEach((n, note) => {
        const baseFreq = 440 * Math.pow(2, (note - 69) / 12);
        const bentFreq = baseFreq * Math.pow(2, bendSemis / 12);
        try {
            n.oscillator.frequency.cancelScheduledValues(now);
        } catch {}
        n.oscillator.frequency.setTargetAtTime(bentFreq, now, 0.01);
    });
}
