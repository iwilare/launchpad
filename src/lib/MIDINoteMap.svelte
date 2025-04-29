<script lang="ts">
  import { writable } from 'svelte/store';
  import type { Note, LaunchpadColor, NoteMap, NoteMapping } from '../types/notes';
  import { noteToNoteRepr, isBlackNote, noteToString, stringToNote, stringToNoteName, noteReprToNote } from '../types/notes';
  import ColorButton from './ColorButton.svelte';

  export let noteMap: NoteMap;
  export let onUpdateMapping: (newNoteMap: NoteMap) => void;

  let showJson = writable(false);
  let jsonValue = writable('');
  let jsonError = writable('');
  let invalidInputs: {[key: Note]: boolean} = {};

  function handleColorChange(note: Note, color: LaunchpadColor) {
    const updatedMapping = { ...noteMap[note], restColor: color };
    const newNoteMap: NoteMap = { ...noteMap, [note]: updatedMapping };
    onUpdateMapping(newNoteMap);
  }

  function handleNoteChange(note: Note, newNote: Note) {
    const updatedMapping = { ...noteMap[note], note: newNote };
    const newNoteMap: NoteMap = { ...noteMap, [note]: updatedMapping };
    onUpdateMapping(newNoteMap);
  }

  function handleNoteNameChange(note: Note, noteName: string) {
    const parsedNote = stringToNote(noteName);
    invalidInputs = {
      ...invalidInputs,
      [note]: noteName !== '' && !parsedNote
    };
    
    if (parsedNote) {
      const updatedMapping = { ...noteMap[note], key: parsedNote };
      const newNoteMap: NoteMap = { ...noteMap, [note]: updatedMapping };
      onUpdateMapping(newNoteMap);
    }
  }

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
        return `  { "k": ${sourceNote}, "n": "${noteRepr.name}"${namePadding}, "o": ${noteRepr.octave}, "c": ${mapping.restColor}, "p": ${mapping.pressedColor} }`;
      })
      .join(',\n');
    jsonValue.set('[\n' + formattedJson + '\n]');
  }

  $: if (!$showJson) {
    updateJsonValue(noteMap);
  }

  function handleJsonChange(value: string) {
    jsonValue.set(value);
    try {
      const parsedJson = JSON.parse(value);
      if (!Array.isArray(parsedJson)) {
        jsonError.set('JSON must be an array of mappings');
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
        jsonError.set('Each mapping must have: k (number), n (string), o (number), c (number), p (number)');
        return;
      }

      const newNoteMap: NoteMap = {};
      for (const mapping of parsedJson) {
        const noteName = stringToNoteName(mapping.n);
        if (!noteName) {
          jsonError.set(`Invalid note name: ${mapping.n}`);
          return;
        }
        
        newNoteMap[mapping.k] = {
          target: noteReprToNote({ name: noteName, octave: mapping.o }),
          restColor: mapping.c,
          pressedColor: mapping.p
        };
      }
      
      jsonError.set('');
      onUpdateMapping(newNoteMap);
    } catch (e) {
      if (value.trim()) {
        jsonError.set('Invalid JSON format');
      } else {
        jsonError.set('');
      }
    }
  }
</script>

<div class="midi-note-map">
  <div class="note-map-header">
    <h3>MIDI Note Mappings</h3>
    <div>
      <button 
        class="toggle-json-button"
        on:click={() => showJson.set(!$showJson)}
      >
        {$showJson ? 'Show Table View' : 'Show JSON View'}
      </button>
    </div>
  </div>
  <div class="mapping-content">
    {#if $showJson}
      <div class="json-editor">
        <textarea
          value={$jsonValue}
          on:input={(e: Event) => handleJsonChange((e.target as HTMLTextAreaElement).value)}
          spellCheck={false}
        />
        {#if $jsonError}
          <div class="json-error">{$jsonError}</div>
        {/if}
      </div>
    {:else}
      <div class="note-map-table-container">
        {#each Array.from({length: 21}, (_, i) => i + 36) as key}
          <table class="note-map-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Note</th>
                <th>Rest</th>
                <th>Pressed</th>
              </tr>
            </thead>
            <tbody>
              <tr class={isBlackNote(noteMap[key].target) ? 'black-key' : ''}>
                <td>{key}</td>
                <td>
                  <input
                    type="text"
                    value={noteToString(noteMap[key].target)}
                    on:input={(e: Event) => handleNoteNameChange(key, (e.target as HTMLInputElement).value)}
                    maxLength={4}
                    placeholder="C4"
                    title="Enter note name (e.g., C4, C#3)"
                  />
                </td>
                <td>
                  <ColorButton
                    value={noteMap[key].restColor}
                    index={key}
                    onChange={(color: LaunchpadColor) => handleColorChange(key, color)}
                  />
                </td>
                <td>
                  <ColorButton
                    value={noteMap[key].pressedColor}
                    index={key}
                    onChange={(color: LaunchpadColor) => handleColorChange(key, color)}
                  />
                </td>
              </tr>
            </tbody>
          </table>
        {/each}
      </div>
    {/if}
  </div>
</div>

<style>
  .midi-note-map {
    margin-bottom: 20px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    padding: 15px;
    background-color: var(--section-bg);
    position: relative;
    z-index: 1;
  }

  .note-map-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
  }

  .note-map-table-container {
    display: flex;
    justify-content: space-around;
    width: 100%;
  }

  .note-map-table {
    min-width: 250px;
    border-collapse: collapse;
    font-size: 14px;
  }

  .note-map-table td {
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 0px;
    padding-top: 0px;
    text-align: left;
    margin-right: 10px;
  }

  .note-map-table th {
    padding-bottom: 8px;
    text-align: left;
    border-bottom: 1px solid var(--border-color);
  }

  .note-map-table th {
    background-color: var(--card-bg);
    font-weight: bold;
    color: var(--text-color);
  }

  .note-map-table tr.black-key {
    background-color: rgba(0, 0, 0, 0.05);
  }

  .note-map-table input[type="number"] {
    width: 40px;
    padding: 4px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background-color: var(--input-bg);
    color: var(--text-color);
    font-family: monospace;
    font-size: 14px;
    text-align: right;
  }

  .note-map-table input[type="text"] {
    width: 40px;
    padding: 4px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background-color: var(--input-bg);
    color: var(--text-color);
    font-family: monospace;
    font-size: 14px;
    text-align: right;
  }

  .note-map-table input[type="text"].invalid-input {
    border-color: #ff6b6b;
    background-color: rgba(255, 107, 107, 0.1);
  }

  .mapping-content {
    width: 100%;
  }

  .json-editor {
    width: 100%;
    min-height: 300px;
    font-family: monospace;
    padding: 10px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    resize: vertical;
    background-color: var(--input-bg);
    color: var(--text-color);
  }

  .json-editor textarea {
    width: 100%;
    min-height: 300px;
    font-family: monospace;
    border: none;
    background-color: transparent;
    color: var(--text-color);
    resize: vertical;
  }

  .json-error {
    color: var(--error-color);
    margin-top: 10px;
    padding: 8px;
    background-color: rgba(255, 0, 0, 0.1);
    border-radius: 4px;
  }
</style> 