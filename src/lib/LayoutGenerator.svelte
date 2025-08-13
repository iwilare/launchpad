<script lang="ts">
import { writable } from "svelte/store";
import { GRID_LAYOUT, generateFromDeltaMap, DEFAULT_DELTA_MAP, EXTRA_DELTA_MAP, generateSaxophoneLayoutMap } from "../types/layouts";
import type { Note } from "../types/notes";
import type { NoteMap, NoteMapping, MappingColor } from "../types/ui";
import NoteInput from "./NoteInput.svelte";
    import { SvelteMap } from "svelte/reactivity";

export let onUpdateMapping: (newNoteMap: NoteMap) => void;
export let getNoteColor: (note: NoteMapping) => MappingColor;

let startNote = writable<Note>(36); // C2
let horizontalStep = writable<number>(2); // Wicky-Hayden
let verticalStep = writable<number>(5);

function generateIsomorphicLayout() {
  const noteMap: NoteMap = new SvelteMap();

  GRID_LAYOUT.forEach((row, rowIndex) => {
    row.forEach((source, colIndex) => {
      const target = ($startNote + 3 + // offset to make sure that we hit first C4 in the center
        (colIndex * $horizontalStep) + // Horizontal movement
        (rowIndex * $verticalStep)     // Vertical movement
      ) as Note;
      const mapping: NoteMapping = { type: 'note', target: target }
      noteMap.set(source, { mapping, color: getNoteColor(mapping) });
    });
  });

  onUpdateMapping(noteMap);
}

</script>

<div class="panel layout-generator">
  <div class="row">
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
  <button on:click={generateIsomorphicLayout} class="btn">
      Generate Layout
      </button>
    </div>
  </div>
  <details>
  <summary class="advanced-label">Advanced controls</summary>
  <div class="panel-element">
  <button on:click={() => { onUpdateMapping(generateFromDeltaMap(DEFAULT_DELTA_MAP, $startNote, getNoteColor)) }} class="btn">
      All diatonics
    </button>
  <button on:click={() => { onUpdateMapping(generateFromDeltaMap(EXTRA_DELTA_MAP, $startNote, getNoteColor)) }} class="btn">
      Two-layer diatonics
    </button>
  <button on:click={() => { onUpdateMapping(generateSaxophoneLayoutMap(getNoteColor)) }} class="btn">
      Sax layout
    </button>
  </div>
</details>
</div>

<style>
  .layout-generator { padding:.75rem .85rem; }
  .row { display:flex; flex-wrap:wrap; gap:14px; align-items:flex-end; }
  .row-spacer { flex:1 1 auto; }
  .panel-element { display:flex; gap:6px; align-items:center; }
  .panel-element input { width:70px; }
  .btn { white-space:nowrap; }
  details { margin-top:.5rem; }
  .advanced-label { margin-top:5px; }
</style>
