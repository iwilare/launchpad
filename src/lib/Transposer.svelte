<script lang="ts">
  import NoteInput from "./NoteInput.svelte";
  import type { Note } from "../types/notes";
  import type { TransposerSettings } from "../types/ui";

  export let settings: TransposerSettings;
  export let onTransposerChange: (settings: TransposerSettings) => void;

  const CENTER_NOTE: Note = 60; // C4
  const CENTER_BEND = 8192;
  const FULL_MIN = 0;
  const FULL_MAX = 16383;
  const FINE_RANGE = 1024; // ±1024 around center

  function setTransposeNote(n: Note) {
    onTransposerChange({ ...settings, transposeNote: n });
  }

  function setPitchBend14(value: number) {
    // Clamp to MIDI 14-bit range [0..16383]
    const v = Math.max(FULL_MIN, Math.min(FULL_MAX, Math.floor(value)));
    onTransposerChange({ ...settings, pitchBend: v });
  }

  // Elastic auto-return to center when not interacting
  let bendReturnRAF: number | null = null;
  let lastTs: number | null = null;
  function stopBendReturn() {
    if (bendReturnRAF !== null) {
      cancelAnimationFrame(bendReturnRAF);
      bendReturnRAF = null;
    }
    lastTs = null;
  }
  function startBendReturn() {
  if (!elasticEnabled) return;
  stopBendReturn();
    const step = (ts: number) => {
      if (lastTs === null) lastTs = ts;
      const dt = (ts - lastTs) / 1000; // seconds
      lastTs = ts;
      const current = settings.pitchBend;
      const target = CENTER_BEND;
      const diff = target - current;
      if (Math.abs(diff) <= 2) {
        setPitchBend14(target);
        stopBendReturn();
        return;
      }
      // Exponential ease towards center
      const speed = 10; // higher = faster return
      const factor = 1 - Math.exp(-speed * dt);
      const next = current + diff * factor;
      setPitchBend14(next);
      bendReturnRAF = requestAnimationFrame(step);
    };
    bendReturnRAF = requestAnimationFrame(step);
  }

  function resetPitch() { stopBendReturn(); setPitchBend14(CENTER_BEND); }
  function resetTranspose() { setTransposeNote(CENTER_NOTE); }

  function bendSemitones(): number {
    return (settings.pitchBend - CENTER_BEND) / 8192 * 2;
  }
  function formatSigned(v: number, digits: number = 2): string {
    const s = v.toFixed(digits);
    return (v > 0 ? "+" : v < 0 ? "" : "") + s; // toFixed includes minus automatically
  }

  let elasticEnabled = true;

  function octaveDown() {
    setTransposeNote(Math.max(0, settings.transposeNote - 12));
  }
  function octaveUp() {
    setTransposeNote(Math.min(127, settings.transposeNote + 12));
  }
</script>

<div class="transposer">
  <div class="column">
  <div class="group">
      <label class="label" for="pitch-bend">Pitch bend (coarse)</label>
      <input id="pitch-bend" class="bend" type="range" min={FULL_MIN} max={FULL_MAX} step="1" value={settings.pitchBend}
             on:input={(e) => setPitchBend14(parseInt((e.target as HTMLInputElement).value))}
             on:touchstart|preventDefault|stopPropagation={stopBendReturn}
             on:touchend|preventDefault|stopPropagation={startBendReturn}
             on:pointerdown={stopBendReturn}
             on:pointerup={startBendReturn}
      />
      <span class="value-display">{formatSigned(bendSemitones())} st</span>
      <label class="label" for="pitch-bend-fine">Pitch bend (fine)</label>
      <input id="pitch-bend-fine" class="bend" type="range" min={Math.max(FULL_MIN, CENTER_BEND - FINE_RANGE)} max={Math.min(FULL_MAX, CENTER_BEND + FINE_RANGE)} step="1" value={settings.pitchBend}
             on:input={(e) => setPitchBend14(parseInt((e.target as HTMLInputElement).value))}
             on:touchstart|preventDefault|stopPropagation={stopBendReturn}
             on:touchend|preventDefault|stopPropagation={startBendReturn}
             on:pointerdown={stopBendReturn}
             on:pointerup={startBendReturn}
      />
      <label class="inline"><input type="checkbox" bind:checked={elasticEnabled} /> Elastic return</label>
    </div>
    <div class="group">
      <label class="label" for="transpose-note">Transpose</label>
      <div class="transpose-compact">
        <div class="transpose-input">
          <NoteInput id="transpose-note" className="transpose-note" data={settings.transposeNote} onChange={setTransposeNote} />
          <span class="offset">{settings.transposeNote - CENTER_NOTE >= 0 ? '+' : ''}{settings.transposeNote - CENTER_NOTE}</span>
        </div>
        <div class="octave-controls">
          <button type="button" class="btn" on:click={octaveDown} title="-1 octave">-12</button>
          <button type="button" class="btn" on:click={octaveUp} title="+1 octave">+12</button>
          <button type="button" class="btn" on:click={resetTranspose} title="Reset transpose to C4">Reset</button>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  .transposer { background:var(--section-bg); border:1px solid var(--border-color); border-radius:8px; padding:12px; }
  .column { display:flex; flex-direction:column; gap:16px; }
  .group { display:flex; flex-direction:column; gap:6px; min-width:240px; }
  .label { font-size:0.8rem; }
  .transpose-compact { display:flex; flex-direction:row; align-items:center; justify-content:space-between; gap:8px; }
  .transpose-input { display:flex; align-items:center; gap:6px; }
  .offset { font-size:0.85rem; opacity:.8; min-width:32px; text-align:right; }
  .bend { width:100%; }
  /* Make transpose text a bit larger */
  :global(.transpose-note) { font-size:16px; }
  .value-display { font-size: 14px; color: var(--launchpad-layout-tooltip); }
  .octave-controls { display:flex; gap:6px; }
  .inline { display:flex; align-items:center; gap:6px; font-size:0.8rem; }
</style>
