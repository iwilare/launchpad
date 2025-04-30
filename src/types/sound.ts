import type { Note } from "./notes";
import type { NoteState, SoundSettings } from "./ui";

export type SoundState = {
  audioContext: AudioContext | null;
  oscillators: { [key: Note]: OscillatorNode };
  gainNodes: { [key: Note]: GainNode };
  activeNotes: NoteState; // number of times the note is supposed to be playing
}

export function emptySoundState(): SoundState {
  return {
        audioContext: null,
        oscillators: {},
        gainNodes: {},
        activeNotes: {},
    }
}

export function initializeSoundState(): SoundState {
    return { 
        ...emptySoundState(), 
        audioContext: new (window.AudioContext || (window as any).webkitAudioContext)() 
    }
}

export function stopAudioNote(ss: SoundState, note: number) { 
    if (ss.activeNotes[note]) {
        if (ss.activeNotes[note] > 0) {
            ss.activeNotes[note]--;
        } else {
            if (ss.oscillators[note]) {
                ss.oscillators[note].stop();
                delete ss.oscillators[note];
            }
            if (ss.gainNodes[note]) {
                delete ss.gainNodes[note];
            }
            delete ss.activeNotes[note];
        }
    }
}

export function stopEverything(ss: SoundState) {
    Object.keys(ss.oscillators).forEach((note) => {
      stopAudioNote(ss, parseInt(note));
    });
    Object.keys(ss.gainNodes).forEach((note) => {
      stopAudioNote(ss, parseInt(note));
    });
    ss.activeNotes = {};
}

export function playAudioNoteWithSynth(ss: SoundState, sc: SoundSettings, note: number, velocity: number = 1.0): null | string {
    if (ss.activeNotes) {
        ss.activeNotes[note]++;
        return null;
    } else {
        if (!sc.enabled) return null;
        if (!ss.audioContext) return 'No audio context';
        stopAudioNote(ss, note);

        const oscillator = ss.audioContext.createOscillator();
        const gainNode = ss.audioContext.createGain();

        oscillator.type = sc.waveform;

        oscillator.frequency.setValueAtTime(440 * Math.pow(2, (note - 69) / 12), ss.audioContext.currentTime);

        gainNode.gain.setValueAtTime(velocity * sc.volume * 0.3, ss.audioContext.currentTime);

        oscillator.connect(gainNode);
        gainNode.connect(ss.audioContext.destination);

        oscillator.start();

        ss.oscillators[note] = oscillator;
        ss.gainNodes[note] = gainNode;
        return null;
    }
}
