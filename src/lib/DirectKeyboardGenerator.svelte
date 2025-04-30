<script lang="ts">
  import type { Note, LaunchpadColor, NoteMap } from '../types/notes';
  import { isBlackNote, DEFAULT_BASE_NOTE, LOWEST_CONTROLLER_NOTE, GRID_LAYOUT } from '../types/notes';
  import NoteInput from './NoteInput.svelte';
  import { writable } from 'svelte/store';

  export let onUpdateMapping: (newNoteMap: NoteMap) => void;
  export let colorSettings: {
    whiteRest: LaunchpadColor;
    whitePressed: LaunchpadColor;
    blackRest: LaunchpadColor;
    blackPressed: LaunchpadColor;
  };

  let baseNote = writable<Note>(DEFAULT_BASE_NOTE);

  function generateLinearLayout() {
    const noteMap: NoteMap = {};
    
    // Iterate through the gridLayout structure
    GRID_LAYOUT.forEach((row, _) => {
      row.forEach((source, _) => {
        // Calculate the new note number based on position and steps
        const target = (source + $baseNote - LOWEST_CONTROLLER_NOTE) as Note;
                
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
        <NoteInput id="start-note" data={$baseNote} onChange={(value: Note) => baseNote.set(value)} />
        <div class="note-stepper">
          <button 
            on:click={() => {
              if ($baseNote < 127) {
                baseNote.set(($baseNote + 1) as Note);
              }
            }}
            disabled={$baseNote >= 127}
          >▲</button>
          <button 
            on:click={() => {
              if ($baseNote > 0) {
                baseNote.set(($baseNote - 1) as Note);
              }
            }}
            disabled={$baseNote <= 0}
          >▼</button>
        </div>
      </div>
    </div>
  </div>
  <button
    on:click={generateLinearLayout}
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