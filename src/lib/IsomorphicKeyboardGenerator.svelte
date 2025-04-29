<script lang="ts">
  import { writable } from 'svelte/store';
  import type { Note, LaunchpadColor, NoteMap } from '../types/notes';
  import { isBlackNote, DEFAULT_BASE_NOTE, GRID_LAYOUT } from '../types/notes';
  import NoteInput from './NoteInput.svelte';

  export let onUpdateMapping: (newNoteMap: NoteMap) => void;
  export let colorSettings: {
    whiteRest: LaunchpadColor;
    whitePressed: LaunchpadColor;
    blackRest: LaunchpadColor;
    blackPressed: LaunchpadColor;
  };

  let startNote = writable<Note>(DEFAULT_BASE_NOTE);
  let horizontalStep = writable<number>(4);
  let verticalStep = writable<number>(3);

  function generateIsomorphicLayout(currentStartNote: Note) {
    const noteMap: NoteMap = {};
    
    // Iterate through the gridLayout structure
    GRID_LAYOUT.forEach((row, rowIndex) => {
      row.forEach((source, colIndex) => {
        // Calculate the new note number based on position and steps
        const target = (currentStartNote + 
          (colIndex * $horizontalStep) + // Horizontal movement
          (rowIndex * $verticalStep)     // Vertical movement
        ) as Note;
                
        // Convert to Note object for determining black/white key
        const isBlackKeyNote = isBlackNote(target);
        
        // Create the note mapping with colors from settings
        noteMap[source] = {
          target: target,
          restColor: isBlackKeyNote ? colorSettings.blackRest : colorSettings.whiteRest,
          pressedColor: isBlackKeyNote ? colorSettings.blackPressed : colorSettings.whitePressed
        };
      });
    });
    
    // Update the parent component with the new mapping
    onUpdateMapping(noteMap);
  }
</script>

<div class="isomorphic-keyboard-generator">
  <div class="controls-grid">
    <div class="control-group">
      <label for="start-note">Start Note:</label>
      <div class="note-input-container">
        <NoteInput id="start-note" data={$startNote} onChange={(value: Note) => startNote.set(value)} />
        <div class="note-stepper">
          <button 
            on:click={() => {
              if ($startNote < 127) {
                startNote.set(($startNote + 1) as Note);
                generateIsomorphicLayout($startNote + 1);
              }
            }}
            disabled={$startNote >= 127}
          >▲</button>
          <button 
            on:click={() => {
              if ($startNote > 0) {
                startNote.set(($startNote - 1) as Note);
                generateIsomorphicLayout($startNote - 1);
              }
            }}
            disabled={$startNote <= 0}
          >▼</button>
        </div>
      </div>
    </div>
    <div class="control-group">
      <label for="horizontal-step">Horizontal Step:</label>
      <input
        id="horizontal-step"
        type="number"
        bind:value={$horizontalStep}
        min={-12}
        max={12}
      />
    </div>
    <div class="control-group">
      <label for="vertical-step">Vertical Step:</label>
      <input
        id="vertical-step"
        type="number"
        bind:value={$verticalStep}
        min={-12}
        max={12}
      />
    </div>
  </div>
  <button
    on:click={() => generateIsomorphicLayout($startNote)}
    class="generate-button"
  >
    Generate Layout
  </button>
</div>

<style>
  .isomorphic-keyboard-generator {
    padding: 15px;
    background: var(--sound-generator-bg);
    border: 1px solid var(--border-color);
    border-radius: 8px;
  }

  .isomorphic-keyboard-generator .controls-grid {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 15px;
    justify-content: space-around;
  }

  .isomorphic-keyboard-generator .control-group {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .isomorphic-keyboard-generator input[type="number"],
  .isomorphic-keyboard-generator .note-input {
    width: 40px;
    padding: 4px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background: var(--input-bg);
    color: var(--text-color);
    font-family: monospace;
    font-size: 14px;
    text-align: right;
  }

  [data-theme="dark"] .isomorphic-keyboard-generator input[type="number"],
  [data-theme="dark"] .isomorphic-keyboard-generator .note-input {
    background: var(--input-bg);
    color: var(--text-color);
  }

  .note-input-container {
    display: flex;
    align-items: center;
  }

  .note-stepper {
    display: flex;
    flex-direction: column;
    margin-left: 2px;
  }

  .note-stepper button {
    padding: 0;
    width: 16px;
    height: 14px;
    font-size: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--button-bg);
    border: none;
    cursor: pointer;
    color: white;
  }

  .note-stepper button:first-child {
    border-radius: 2px 2px 0 0;
  }

  .note-stepper button:last-child {
    border-radius: 0 0 2px 2px;
  }

  .note-stepper button:hover {
    background: var(--button-hover);
  }

  button {
    background-color: var(--button-bg);
    color: var(--button-text);
    border: none;
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
    transition: background-color var(--transition-speed);
  }

  button:hover {
    background-color: var(--button-hover);
  }

  button:disabled {
    background-color: #ccc;
    cursor: not-allowed;
  }
</style> 