<script lang="ts">
  import { writable } from 'svelte/store';
  import type { Note, LaunchpadColor, NoteMap, NoteColor } from '../types/notes';
  import { isBlackNote, GRID_LAYOUT, DEFAULT_DELTA_MAP, EXTRA_DELTA_MAP } from '../types/notes';
  import NoteInput from './NoteInput.svelte';

  export let onUpdateMapping: (newNoteMap: NoteMap) => void;
  export let getNoteColor: (note: Note) => NoteColor;

  let startNote = writable<Note>(39); // D#2
  let horizontalStep = writable<number>(2); // Wicky-Hayden
  let verticalStep = writable<number>(5);

  function generateIsomorphicLayout() {
    const noteMap: NoteMap = new Map();
    
    GRID_LAYOUT.forEach((row, rowIndex) => {
      row.forEach((source, colIndex) => {
        const target = ($startNote + 
          (colIndex * $horizontalStep) + // Horizontal movement
          (rowIndex * $verticalStep)     // Vertical movement
        ) as Note;
        noteMap.set(source, { target: target, color: getNoteColor(target) });
      });
    });

    onUpdateMapping(noteMap);
  }

  function generateFromDeltaMap(deltaMap: number[][]) {
    const noteMap: NoteMap = new Map();
    GRID_LAYOUT.forEach((row, rowIndex) => {
      row.forEach((source, colIndex) => {
        const target = ($startNote + deltaMap[rowIndex][colIndex]) as Note;
        noteMap.set(source, { target: target, color: getNoteColor(target) });
      });
    });
    onUpdateMapping(noteMap);
  }
</script>

<div class="panel">
  <div style="display: flex; align-items: center; gap: 20px; justify-content: space-around;">
    <div class="panel-element">
      <label for="start-note">Start Note:</label>
      <NoteInput 
        id="start-note" 
        data={$startNote} 
        onChange={(v: Note) => {
          $startNote = v
          generateIsomorphicLayout()
        }} />
    </div>
    <div class="panel-element">
      <label for="horizontal-step">Horizontal Step:</label>
      <input
        id="horizontal-step"
        type="number"
        bind:value={$horizontalStep}
        min={-12}
        max={12}
        on:input={generateIsomorphicLayout}
      />
    </div>
    <div class="panel-element">
      <label for="vertical-step">Vertical Step:</label>
      <input
        id="vertical-step"
        type="number"
        bind:value={$verticalStep}
        min={-12}
        max={12}
        on:input={generateIsomorphicLayout}
      />
    </div>
    <div class="panel-element">
    <button on:click={generateIsomorphicLayout} class="action">
      Generate Layout
      </button>
    </div>
  </div>
  <details>
    <summary class="advanced-label">Advanced controls</summary>
    <div class="panel-element">
      <button on:click={() => { generateFromDeltaMap(DEFAULT_DELTA_MAP) }} class="action">
        All diatonics
      </button>
      <button on:click={() => { generateFromDeltaMap(EXTRA_DELTA_MAP) }} class="action">
        Two-layer diatonics
      </button>
    </div>
  </details>
</div>

<style>

  .panel-element {
    display: flex;
    vertical-align: middle;
    gap: 8px;
  }

  .advanced-label {
    margin-top: 5px;
  }
</style> 