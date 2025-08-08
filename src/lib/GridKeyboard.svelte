<script lang="ts">
  import { launchpadColorToHex, launchpadColorToTextColorHex as getColorHex, launchpadColorToTextColorHex } from '../types/colors';
  import { type Note } from '../types/notes';
  import { type NoteMap, GRID_LAYOUT, DEFAULT_COLOR as DEFAULT_LAUNCHPAD_COLOR, type Controller } from '../types/ui';
  import NoteInput from './NoteInput.svelte';

  export let controller: Controller;
  export let noteMap: NoteMap;

  export let onKeyPress: (note: number) => void;
  export let onKeyRelease: (note: number) => void;
  export let setNoteMap: (noteMap: NoteMap) => void;

  let colorPickerCell: Note | null = null;

  function handleNoteChange(src: Note, newNote: Note) {
    const mapping = noteMap.get(src);
    if (mapping) {
      const newNoteMap = new Map(noteMap);
      if ('target' in mapping) {
        newNoteMap.set(src, { ...mapping, target: newNote });
      } else {
        newNoteMap.set(src, { type: 'note', target: newNote, color: mapping.color });
      }
      setNoteMap(newNoteMap);
    }
  }
</script>

<div class="grid-keyboard-container">
  <div class="grid-keyboard">
    <div class="grid-container">
      {#each GRID_LAYOUT.toReversed() as row, revRowIndex}
        {#key revRowIndex}
        { @const originalRowIndex = GRID_LAYOUT.length - 1 - revRowIndex }
        <div class="grid-row">
          {#each row as src, colIndex}
            { @const isTopRow = originalRowIndex === GRID_LAYOUT.length - 1 }
            { @const isRightCol = colIndex === row.length - 1 }
            { @const isTopRight = isTopRow && isRightCol }
            <div
              class="grid-cell {controller.get(src)?.active ?? false ? 'active' : ''} {isTopRow || isRightCol ? 'special' : ''} {isTopRight ? 'disabled' : ''}"
              style="background-color: {launchpadColorToHex(controller.get(src)?.color ?? DEFAULT_LAUNCHPAD_COLOR)}"
              role="button"
              tabindex={isTopRight ? -1 : 0}
              aria-disabled={isTopRight}
              on:mouseenter|preventDefault={(e) => { if (!isTopRight && e.buttons === 1) { onKeyPress(src); } }}
              on:mousedown|preventDefault={(e) => { if (!isTopRight && e.buttons === 1) { onKeyPress(src); } }}
              on:mouseup={() => { if (!isTopRight) onKeyRelease(src) }}
              on:mouseleave={() => { if (!isTopRight) onKeyRelease(src) }}
              on:contextmenu|preventDefault={(e) => {
                if (isTopRight) return;
                e.stopPropagation();
                colorPickerCell = src;
              }}
            >
              {#if true}
                { @const mapping = noteMap.get(src) }
                <div class="cell-content">
                  {#if !mapping}
                    <span class="mapping-label unmapped" title="Unmapped">—</span>
                  {:else if mapping.type === 'note'}
                    <NoteInput
                      id={`note-${src}`}
                      data={mapping.target}
                      onChange={(newNote) => handleNoteChange(src, newNote)}
                      asButton={true}
                      className="note-name"
                      style="color: {launchpadColorToTextColorHex(controller.get(src)?.color ?? DEFAULT_LAUNCHPAD_COLOR)}"
                    />
                  {:else if mapping.type === 'pitch'}
                    <span class="mapping-label" title="Pitch bend mapping">Bend {mapping.bend}</span>
                  {:else if mapping.type === 'timbre'}
                    <span class="mapping-label" title="Timbre mapping">{mapping.waveform}</span>
                  {:else if mapping.type === 'sax'}
                    <span class="mapping-label" title="Sax key mapping">🎷 {mapping.saxKey}</span>
                  {/if}
                </div>
              {/if}
            </div>
          {/each}
        </div>
        {/key}
      {/each}
    </div>
    <!-- {#if colorPickerCell}
      <div class="color-picker-cell">
        <div class="color-picker-cell-content">
          <div class="color-picker-cell-color">
            <FloatingColorPicker
              on:colorChange={(color) => {
                const mapping = noteMap.get(colorPickerCell);
                if (mapping) {
                  const newNoteMap = new Map(noteMap);
                  newNoteMap.set(colorPickerCell, { ...mapping, color: { ...mapping.color, rest: color } });
                  setNoteMap(newNoteMap);
                }
              }}
            />
          </div>
        </div>
      </div>
    {/if} -->
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

  .grid-cell.special {
    outline: 2px dashed var(--border-color);
  }

  .grid-cell.disabled {
    pointer-events: none;
    opacity: 0.5;
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

  .mapping-label {
    font-size: 11px;
    font-weight: 500;
    color: var(--text-color);
    max-width: 52px;
    text-overflow: ellipsis;
    white-space: nowrap;
    overflow: hidden;
    pointer-events: none;
  }

  .mapping-label.unmapped {
    opacity: 0.4;
  }
</style>
