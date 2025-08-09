<script lang="ts">
  import { onMount } from 'svelte';
  import type { Note } from '../types/notes';
  import { noteToNoteRepr, isBlackNote } from '../types/notes';
  import type { NoteMapping, LaunchpadColor, NoteMap, MappingColor, Key, MapData } from '../types/ui';
  import { niceNoteMap, niceNoteMapToNoteMap, noteMapToNiceNoteMapFormat } from '../types/ui';
  import MIDINoteMapRow from './MIDINoteMapRow.svelte';

  export let noteMap: NoteMap;
  export let onUpdateMap: (newNoteMap: NoteMap) => void;

  let showJson = false;
  let jsonValue = '';
  let jsonError = '';

  function renderTable(startIndex: number, howMany: number): { key: Key, value: MapData }[] {
    const entries = [];
    for (let i = startIndex; i < startIndex + howMany; i++) {
      const key = i as Key;
      const m = noteMap.get(key);
      if (m) { entries.push({ key, value: m }); }
    }
    return entries;
  }

  function handleJsonChange(value: string) {
    const result = niceNoteMap(value);
    if (typeof result === 'string') {
      jsonError = result;
    } else {
      onUpdateMap(result);
    }
  }
  function onChangeRow(key: Key, d: MapData | undefined) {
    if (d === undefined) {
      const newMap = new Map(noteMap);
      newMap.delete(key);
      onUpdateMap(newMap);
    } else {
      onUpdateMap({ ...noteMap, [key]: d });
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
        <table class="note-map-table">
          <thead>
            <tr> <th>Code</th> <th>Note</th> <th>Rest</th> <th>Pressed</th> </tr>
          </thead>
          <tbody>
            {#each renderTable(11, 33) as { key, value }}
              <MIDINoteMapRow {key} {value} onChange={m => onChangeRow(key, m)}/>
            {/each}
          </tbody>
        </table>
        <table class="note-map-table">
          <thead>
            <tr> <th>Code</th> <th>Note</th> <th>Rest</th> <th>Pressed</th> </tr>
          </thead>
          <tbody>
            {#each renderTable(44, 33) as { key, value }}
              <MIDINoteMapRow {key} {value} onChange={m => onChangeRow(key, m)}/>
            {/each}
          </tbody>
        </table>
        <table class="note-map-table">
          <thead>
            <tr> <th>Code</th> <th>Note</th> <th>Rest</th> <th>Pressed</th> </tr>
          </thead>
          <tbody>
            {#each renderTable(77, 33) as { key, value }}
              <MIDINoteMapRow {key} {value} onChange={m => onChangeRow(key, m)}/>
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
