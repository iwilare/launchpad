<script lang="ts">
  import { launchpadColorToHexString, getTextColor } from '../types/colors';
  import FloatingColorPicker from './FloatingColorPicker.svelte';
  import { stringToNote, type Note, type LaunchpadColor, type NoteMap, noteToString, GRID_LAYOUT } from '../types/notes';

  export let activeNotes: { [key: number]: number } = {};
  export let activeKeys: { [key: number]: boolean } = {};
  export let onKeyPress: (note: number) => void;
  export let onKeyRelease: (note: number) => void;
  export let noteMap: NoteMap;
  export let setNoteMap: (noteMap: NoteMap) => void;
  export let showSameNotePressed: boolean;

  const isActiveNote = (noteState: { [key: number]: number }, note: number) => {
    return noteState[note] && noteState[note] > 0;
  };

  let editingCell: Note | null = null;
  let editValue = '';
  let colorPickerCell: Note | null = null;

  function handleEditSubmit() {
    if (editingCell) {
      const parsedNote = stringToNote(editValue);
      
      if (parsedNote !== null && noteMap[editingCell]) {
        const newNoteMap = {...noteMap};
        newNoteMap[editingCell] = {
          ...newNoteMap[editingCell],
          target: parsedNote
        };
        setNoteMap(newNoteMap);
      }
      editingCell = null;
      editValue = '';
    }
  }

  function handleEditKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      handleEditSubmit();
    } else if (e.key === 'Escape') {
      editingCell = null;
      editValue = '';
    }
  }

  function handleEditStart(src: Note) {
    editingCell = src;
    editValue = noteToString(noteMap[src].target);
  }

  function handleColorChange(colorCode: LaunchpadColor) {
    if (colorPickerCell) {
      const mapping = noteMap[colorPickerCell];
      if (mapping) {
        const newnoteMap = {...noteMap};
        newnoteMap[colorPickerCell] = {
          ...newnoteMap[colorPickerCell],
          ['restColor']: colorCode
        };
        setNoteMap(newnoteMap);
        colorPickerCell = null;
      }
    }
  }

  function getKeyColor(src: Note) {
    return activeKeys[src] || (showSameNotePressed && isActiveNote(activeNotes, noteMap[src].target))
      ? noteMap[src].pressedColor 
      : noteMap[src].restColor;
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
              {#if editingCell === src}
                <input
                  type="text"
                  bind:value={editValue}
                  on:keydown={handleEditKeyDown}
                  on:blur={handleEditSubmit}
                  autofocus
                  on:click|stopPropagation
                />
              {:else}
                <div class="cell-content">
                  <div 
                    class="note-name" 
                    style="color: {getTextColor(getKeyColor(src))}"
                    on:click|preventDefault|stopPropagation={() => handleEditStart(src)}
                  >{noteToString(noteMap[src].target)}</div>
                </div>
              {/if}
            </div>
          {/each}
        </div>
      {/each}
    </div> 
  </div> 
  {#if colorPickerCell}
    <FloatingColorPicker
      value={noteMap[colorPickerCell].restColor}
      onChange={handleColorChange}
      onClose={() => colorPickerCell = null}
      position="center"
    />
  {/if}
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
    background-color: var(--section-bg);
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

  .note-name {
    font-size: 12px;
    color: var(--text-color);
    text-shadow: 0 1px 2px var(--shadow-color);
    font-weight: 500;
  }

  .grid-cell input {
    width: 80%;
    text-align: center;
    background: var(--input-bg);
    border: none;
    border-radius: 4px;
    padding: 4px;
    font-size: 12px;
    box-shadow: 0 1px 3px var(--shadow-color);
    color: var(--text-color);
  }

  [data-theme="dark"] .grid-keyboard {
    background-color: var(--section-bg);
  }

  [data-theme="dark"] .grid-cell input {
    background: var(--input-bg);
    color: var(--text-color);
  }
</style> 