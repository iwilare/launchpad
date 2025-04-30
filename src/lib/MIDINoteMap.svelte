<script lang="ts">
  import { onMount } from 'svelte';
  import type { NoteMapping, LaunchpadColor, NoteMap, Note } from '../types/notes';
  import { noteToNoteRepr, isBlackNote } from '../types/notes';
  import { launchpadColorToHexString } from '../types/colors';
  import { noteToString, stringToNote, stringToNoteName, noteReprToNote } from '../types/notes';
  import ColorButton from './ColorButton.svelte';
  import MIDINoteMapRow from './MIDINoteMapRow.svelte';

  export let noteMap: NoteMap;
  export let onUpdateMap: (newNoteMap: NoteMap) => void;

  let showJson = false;
  let jsonValue = '';
  let jsonError = '';

  function updateJsonValue(mappings: NoteMap) {
    // First pass to find the longest note name
    const maxNameLength = Math.max(...Object.values(mappings).map(mapping => {
      const noteRepr = noteToNoteRepr(mapping.target);
      return noteRepr.name.length;
    }));

    const formattedJson = Object.entries(mappings)
      .map(([sourceNote, mapping]) => {
        const noteRepr = noteToNoteRepr(mapping.target);
        const namePadding = ' '.repeat(maxNameLength - noteRepr.name.length);
        return `  { "k": ${sourceNote}, "n": "${noteRepr.name}"${namePadding}, "o": ${noteRepr.octave}, "c": ${mapping.color.rest}, "p": ${mapping.color.pressed} }`;
      })
      .join(',\n');
    jsonValue = '[\n' + formattedJson + '\n]';
  }

  onMount(() => {
    if (!showJson) {
      updateJsonValue(noteMap);
    }
  });

  $: if (!showJson) {
    updateJsonValue(noteMap);
  }

  function handleJsonChange(value: string) {
    jsonValue = value;
    try {
      const parsedJson = JSON.parse(value);
      if (!Array.isArray(parsedJson)) {
        jsonError = 'JSON must be an array of mappings';
        return;
      }

      const isValid = parsedJson.every(mapping => 
        typeof mapping?.k === 'number' && 
        typeof mapping?.n === 'string' && 
        typeof mapping?.o === 'number' && 
        typeof mapping?.r === 'number' && 
        typeof mapping?.p === 'number'
      );

      if (!isValid) {
        jsonError = 'Each mapping must have: k (number), n (string), o (number), c (number), p (number)';
        return;
      }

      const newNoteMap: NoteMap = {};
      for (const mapping of parsedJson) {
        const noteName = stringToNoteName(mapping.n);
        if (!noteName) {
          jsonError = `Invalid note name: ${mapping.n}`;
          return;
        }
        
        newNoteMap[mapping.k] = {
          target: noteReprToNote({ name: noteName, octave: mapping.o }),
          color: {
            rest: mapping.c,
            pressed: mapping.p
          }
        };
      }
      
      jsonError = '';
      onUpdateMap(newNoteMap);
    } catch (e) {
      if (value.trim()) {
        jsonError = 'Invalid JSON format';
      } else {
        jsonError = '';
      }
    }
  }

  function renderTable(mappings: NoteMap, startIndex: number, howMany: number) {
    const entries = [];
    for (let i = startIndex; i < startIndex + howMany; i++) {
      const key = i as Note;
      if (mappings[key]) {
        entries.push({
          key,
          mapping: mappings[key]
        });
      }
    }
    return entries;
  }
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
            {#each renderTable(noteMap, 36, 21) as { key, mapping }}
              <MIDINoteMapRow {key} {mapping} onChange={(mapping: NoteMapping) => onUpdateMap({ ...noteMap, [key]: mapping })}/>
            {/each}
          </tbody>
        </table>
        <table class="note-map-table">
          <thead>
            <tr> <th>Code</th> <th>Note</th> <th>Rest</th> <th>Pressed</th> </tr>
          </thead>
          <tbody>
            {#each renderTable(noteMap, 57, 21) as { key, mapping }}
              <MIDINoteMapRow {key} {mapping} onChange={(mapping: NoteMapping) => onUpdateMap({ ...noteMap, [key]: mapping })}/>
            {/each}
          </tbody>
        </table>
        <table class="note-map-table">
          <thead>
            <tr> <th>Code</th> <th>Note</th> <th>Rest</th> <th>Pressed</th> </tr>
          </thead>
          <tbody>
            {#each renderTable(noteMap, 78, 22) as { key, mapping }}
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