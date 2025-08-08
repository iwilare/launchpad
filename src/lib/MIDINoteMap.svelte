<script lang="ts">
  import { onMount } from 'svelte';
  import type { Note } from '../types/notes';
  import { noteToNoteRepr, isBlackNote } from '../types/notes';
  import type { NoteMapping, LaunchpadColor, NoteMap } from '../types/ui';
  import { niceNoteMap, niceNoteMapToNoteMap, noteMapToNiceNoteMapFormat, GRID_LAYOUT } from '../types/ui';
  import MIDINoteMapRow from './MIDINoteMapRow.svelte';

  export let noteMap: NoteMap;
  export let onUpdateMap: (newNoteMap: NoteMap) => void;

  let showJson = false;
  let jsonValue = '';
  let jsonError = '';


  function renderProgrammingRowsFlat() {
    // Preserve intuitive ordering: 11–19, 21–29, …, 91–99
    return GRID_LAYOUT.flat().map((k) => ({ key: k as Note, mapping: noteMap.get(k as Note) ?? undefined }));
  }

  function handleJsonChange(value: string) {
    const result = niceNoteMap(value);
    if (typeof result === 'string') {
      jsonError = result;
    } else {
      onUpdateMap(result);
    }
  }
  onMount(() => { if (!showJson) { jsonValue = noteMapToNiceNoteMapFormat(noteMap); } });

  $: if (!showJson) { jsonValue = noteMapToNiceNoteMapFormat(noteMap); }
</script>

<div class="panel">
  <div class="note-map-header">
    <h3>MIDI Note Mappings</h3>
    <div>
      <button class="action" on:click={() => showJson = !showJson}>
        {showJson ? 'Show Table View' : 'Show JSON View'}
      </button>
    </div>
  </div>
  <div class="mapping-content">
    {#if showJson}
      <div class="json-editor">
        <textarea
          bind:value={jsonValue}
          on:input={(e) => handleJsonChange((e.target as HTMLTextAreaElement).value)}
          spellCheck={false}
        ></textarea>
        {#if jsonError}
          <div class="json-error">{jsonError}</div>
        {/if}
      </div>
    {:else}
      <div class="note-map-table-container single">
        <table class="note-map-table sticky-header">
          <thead>
            <tr> <th>Code</th> <th>Note</th> <th>Action</th> <th>Rest</th> <th>Pressed</th> </tr>
          </thead>
          <tbody>
            {#each renderProgrammingRowsFlat() as { key, mapping }}
              <MIDINoteMapRow {key} {mapping}
                onChange={(m: NoteMapping | undefined) => {
                  const copy = new Map(noteMap);
                  if (m === undefined) { copy.delete(key); } else { copy.set(key, m); }
                  onUpdateMap(copy);
                }}
              />
            {/each}
          </tbody>
        </table>
      </div>
    {/if}
  </div>
</div>

<style>

  .note-map-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
  }

  .note-map-header h3 {
    margin: 0;
    color: var(--text-color);
  }

  .mapping-content {
    margin-top: 20px;
  }

  .note-map-table-container {
    display: flex;
    justify-content: center;
    max-height: min(70vh, 800px);
    overflow: auto;
  }

  .note-map-table-container.single {
    width: 100%;
  }

  .note-map-table {
    width: 100%;
    border-collapse: separate;
    border-spacing: 0;
    background-color: var(--table-row-bg);
    border-radius: 8px;
    overflow: hidden;
    border: 1px solid var(--border-color);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .note-map-table th {
    font-weight: 500;
    color: var(--text-color);
    background-color: var(--card-bg);
    padding: 6px;
    border-bottom: 2px solid var(--border-color);
  }

  .note-map-table.sticky-header thead th {
    position: sticky;
    top: 0;
    z-index: 1;
  }

  :global(.note-map-table td) {
    padding: 2px 4px;
  }

  :global(.note-map-table tr) {
    height: 30px;
  }

  .json-editor {
    margin-top: 10px;
  }

  .json-editor textarea {
    width: 100%;
    height: 300px;
    padding: 10px;
    font-family: monospace;
    font-size: 14px;
    background-color: var(--json-editor-textarea-bg);
    color: var(--text-color);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    resize: vertical;
  }

  .json-error {
    margin-top: 10px;
    padding: 10px;
    background-color: var(--json-error-bg);
    color: var(--error-color);
    border-radius: 4px;
  }
</style>
