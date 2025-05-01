<script lang="ts">
  import { onMount } from 'svelte';
  import type { NoteMapping, LaunchpadColor, NoteMap, Note } from '../types/notes';
  import { noteToNoteRepr, isBlackNote, niceNoteMapToNoteMap, noteMapToNiceNoteMapFormat } from '../types/notes';
  import MIDINoteMapRow from './MIDINoteMapRow.svelte';

  export let noteMap: NoteMap;
  export let onUpdateMap: (newNoteMap: NoteMap) => void;

  let showJson = false;
  let jsonValue = '';
  let jsonError = '';


  function renderTable(startIndex: number, howMany: number) {
    const entries = [];
    for (let i = startIndex; i < startIndex + howMany; i++) {
      const key = i as Note;
      const mapping = noteMap.get(key);
      if (mapping) { entries.push({ key, mapping }); }
    }
    return entries;
  }

  function handleJsonChange(value: string) {
    const result = niceNoteMapToNoteMap(value);
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
      <div class="note-map-table-container">
        <table class="note-map-table">
          <thead>
            <tr> <th>Code</th> <th>Note</th> <th>Rest</th> <th>Pressed</th> </tr>
          </thead>
          <tbody>
            {#each renderTable(36, 21) as { key, mapping }}
              <MIDINoteMapRow {key} {mapping} onChange={(mapping: NoteMapping) => onUpdateMap({ ...noteMap, [key]: mapping })}/>
            {/each}
          </tbody>
        </table>
        <table class="note-map-table">
          <thead>
            <tr> <th>Code</th> <th>Note</th> <th>Rest</th> <th>Pressed</th> </tr>
          </thead>
          <tbody>
            {#each renderTable(57, 21) as { key, mapping }}
              <MIDINoteMapRow {key} {mapping} onChange={(mapping: NoteMapping) => onUpdateMap({ ...noteMap, [key]: mapping })}/>
            {/each}
          </tbody>
        </table>
        <table class="note-map-table">
          <thead>
            <tr> <th>Code</th> <th>Note</th> <th>Rest</th> <th>Pressed</th> </tr>
          </thead>
          <tbody>
            {#each renderTable(78, 22) as { key, mapping }}
              <MIDINoteMapRow {key} {mapping} onChange={(mapping: NoteMapping) => onUpdateMap({ ...noteMap, [key]: mapping })}/>
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
    flex-direction: row;
    gap: 20px;
    justify-content: center;
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