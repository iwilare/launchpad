<script lang="ts">
  import { launchpadColorToHexString, getTextColor } from '../types/colors';
  import FloatingColorPicker from './FloatingColorPicker.svelte';
  import { type Note, type LaunchpadColor, type NoteMap, GRID_LAYOUT } from '../types/notes';
  import { shouldLightUp, type NoteState, type KeyState, type ShowSameNote } from '../types/ui';
  import NoteInput from './NoteInput.svelte';
  
  export let activeNotes: NoteState = {};
  export let activeKeys: KeyState = {};
  export let onKeyPress: (note: number) => void;
  export let onKeyRelease: (note: number) => void;
  export let noteMap: NoteMap;
  export let setNoteMap: (noteMap: NoteMap) => void;
  export let showSameNotePressed: ShowSameNote;

  const isActiveNote = (noteState: NoteState, note: number) => {
    return noteState[note] && noteState[note] > 0;
  };

  let colorPickerCell: Note | null = null;

  function handleNoteChange(src: Note, newNote: Note) {
    if (noteMap[src]) {
      const newNoteMap = {...noteMap};
      newNoteMap[src] = {
        ...newNoteMap[src],
        target: newNote
      };
      setNoteMap(newNoteMap);
    }
  }

  function getKeyColor(src: Note): LaunchpadColor {
    return shouldLightUp(noteMap[src].target, activeNotes, showSameNotePressed)
      ? noteMap[src].color.pressed 
      : noteMap[src].color.rest;
  }
</script>

<div class="grid-keyboard-container">
  <div class="grid-keyboard">
    <div class="grid-container">
      {#each GRID_LAYOUT.toReversed() as row}
        <div class="grid-row">
          {#each row as src}
            <div
              class="grid-cell {activeKeys[src] ? 'active' : ''}"
              style="background-color: {launchpadColorToHexString(getKeyColor(src))}"
              role="button"
              tabindex="0"
              on:mousedown={(e) => {
                if (!e.defaultPrevented) {
                  onKeyPress(src);
                }
              }}
              on:mouseup={() => onKeyRelease(src)}
              on:mouseleave={() => activeKeys[src] && onKeyRelease(src)}
              on:contextmenu|preventDefault={(e) => {
                e.stopPropagation();
                colorPickerCell = src;
              }}
            >
              <div class="cell-content">
                <NoteInput
                  id={`note-${src}`}
                  data={noteMap[src].target}
                  onChange={(newNote) => handleNoteChange(src, newNote)}
                  asButton={true}
                  className="note-name"
                  style="color: {getTextColor(getKeyColor(src))}"
                />
              </div>
            </div>
          {/each}
        </div>
      {/each}
    </div> 
  </div> 
</div>

<style>
  .grid-keyboard-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    width: 100%;
    margin: 20px 0;
  }

  .grid-keyboard {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 24px;
    background-color: var(--grid-bg);
    border: 1px solid var(--border-color);
    border-radius: 12px;
    max-width: 600px;
    margin: 0 auto;
    box-shadow: 0 4px 12px var(--shadow-color);
  }

  .grid-container {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .grid-row {
    display: flex;
    gap: 8px;
    justify-content: center;
  }

  .grid-cell {
    width: 56px;
    height: 56px;
    border: none;
    border-radius: 8px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.15s ease;
    position: relative;
    user-select: none;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  }

  .grid-cell:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
  }

  .grid-cell.active {
    transform: translateY(2px);
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
  }

  .cell-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 4px;
  }
</style> 