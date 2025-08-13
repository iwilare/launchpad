<script lang="ts">
  import { launchpadColorToHex, launchpadColorToTextColorHex } from '../types/colors';
  import { DEFAULT_COLOR, GRID_LAYOUT } from '../types/layouts';
  import { noteToString, type Note } from '../types/notes';
  import type { Controller, NoteMap, NoteMapping, MappingColor } from '../types/ui';
  import NoteInput from './NoteInput.svelte';
  import { SvelteMap } from 'svelte/reactivity';

  export let controller: Controller;
  export let noteMap: NoteMap;

  export let onKeyPress: (note: number) => void;
  export let onKeyRelease: (note: number) => void;

  // Editing and play mode live inside this component
  let playMode: boolean = true;
  export let onUpdateMapping: (newNoteMap: NoteMap) => void;

  let editingKey: Note | null = null;
  let copyOnClick: boolean = false;
  let copyTemplate: { mapping: NoteMapping; color: MappingColor } | null = null;

  let colorPickerCell: Note | null = null;

  function applyEditToKey(key: Note, mapping: NoteMapping, color: MappingColor) {
    const newMap: NoteMap = new SvelteMap(noteMap);
    newMap.set(key, { mapping, color });
    onUpdateMapping(newMap);
    if (copyOnClick) {
      copyTemplate = { mapping, color };
    } else {
      copyTemplate = null;
    }
  }

  $: if (playMode) { editingKey = null; }
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
              style="background-color: {launchpadColorToHex(controller.get(src)?.color ?? DEFAULT_COLOR)};
                     color: {launchpadColorToTextColorHex(controller.get(src)?.color ?? DEFAULT_COLOR)}"
              role="button"
              tabindex={isTopRight ? -1 : 0}
              aria-disabled={isTopRight}
              on:mouseenter|preventDefault={(e) => { if (playMode && !isTopRight && e.buttons === 1) { onKeyPress(src); } }}
              on:mousedown|preventDefault={(e) => { if (!isTopRight) { if (playMode) { if (e.buttons === 1) onKeyPress(src); } else {
                // Edit mode behavior: copy or open editor
                if (copyOnClick && copyTemplate) {
                  applyEditToKey(src, copyTemplate.mapping, copyTemplate.color);
                } else {
                  editingKey = src;
                }
              } } }}
              on:mouseup={() => { if (playMode && !isTopRight) { onKeyRelease(src); } }}
              on:mouseleave={() => { if (playMode && !isTopRight) onKeyRelease(src) }}
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
                  {:else if mapping.mapping.type === 'note'}
                    <span class="mapping-label" title="Note">{noteToString(mapping.mapping.target)}</span>
                  {:else if mapping.mapping.type === 'pitch'}
                    <span class="mapping-label" title="Pitch bend mapping">Bend {mapping.mapping.bend}</span>
                  {:else if mapping.mapping.type === 'timbre'}
                    <span class="mapping-label" title="Timbre mapping">{mapping.mapping.waveform}</span>
                  {:else if mapping.mapping.type === 'sax'}
                    <span class="mapping-label" title="Sax key mapping">🎷 {mapping.mapping.key}</span>
                  {/if}
                </div>
              {/if}
            </div>
          {/each}
        </div>
        {/key}
      {/each}
    </div>

    <div class="grid-controls">
      <label class="inline">
        <input type="checkbox" bind:checked={playMode} /> Play mode
      </label>
    </div>

    {#if !playMode && editingKey !== null}
      { @const current = noteMap.get(editingKey) }
      <div class="grid-editor" role="region" aria-label="Grid key editor">
        {#if current}
          <div class="editor-row">
            <label for="edit-type">Type:</label>
            <select id="edit-type" value={current.mapping.type}
              on:change={(e) => {
                const t = (e.target as HTMLSelectElement).value;
                let mapping: NoteMapping = current.mapping;
                if (t === 'note') mapping = { type: 'note', target: 60 } as NoteMapping;
                else if (t === 'pitch') mapping = { type: 'pitch', bend: 8192 } as NoteMapping;
                else if (t === 'timbre') mapping = { type: 'timbre', waveform: 'sine' } as NoteMapping;
                else if (t === 'sax') mapping = { type: 'sax', key: 'Play' } as NoteMapping;
                applyEditToKey(editingKey!, mapping, current.color);
              }}>
              <option value="note">Note</option>
              <option value="pitch">Pitch</option>
              <option value="timbre">Timbre</option>
              <option value="sax">Sax</option>
            </select>
          </div>

          {#if current.mapping.type === 'note'}
            <div class="editor-row">
              <label for="edit-note">Note:</label>
              <NoteInput id="edit-note" data={current.mapping.target}
                onChange={(v: number) => applyEditToKey(editingKey!, { ...current!.mapping, target: v } as NoteMapping, current!.color)} />
            </div>
          {/if}

          {#if current.mapping.type === 'timbre'}
            <div class="editor-row">
              <label for="edit-waveform">Waveform:</label>
              <select id="edit-waveform" value={current.mapping.waveform}
                on:change={(e) => applyEditToKey(editingKey!, { ...current!.mapping, waveform: (e.target as HTMLSelectElement).value as OscillatorType } as NoteMapping, current!.color)}>
                <option value="sine">sine</option>
                <option value="square">square</option>
                <option value="sawtooth">sawtooth</option>
                <option value="triangle">triangle</option>
              </select>
            </div>
          {/if}

          <div class="editor-row">
            <label for="edit-rest">Rest color:</label>
            <input id="edit-rest" type="number" min="0" max="127" value={current.color.rest}
              on:input={(e) => applyEditToKey(editingKey!, current!.mapping, { ...current!.color, rest: parseInt((e.target as HTMLInputElement).value) })} />
          </div>
          <div class="editor-row">
            <label for="edit-pressed">Pressed color:</label>
            <input id="edit-pressed" type="number" min="0" max="127" value={current.color.pressed}
              on:input={(e) => applyEditToKey(editingKey!, current!.mapping, { ...current!.color, pressed: parseInt((e.target as HTMLInputElement).value) })} />
          </div>
          <div class="editor-actions">
            <label class="inline"><input type="checkbox" bind:checked={copyOnClick}
              on:change={() => { if (copyOnClick && current) copyTemplate = { mapping: current.mapping, color: current.color }; }} /> Copy key settings on click</label>
            <button class="btn" on:click={() => { editingKey = null; }}>Close</button>
          </div>
        {:else}
          <div class="editor-row">Unmapped key</div>
          <div class="editor-actions">
            <button class="btn" on:click={() => { editingKey = null; }}>Close</button>
          </div>
        {/if}
      </div>
    {/if}
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
  .grid-keyboard-container { overflow-x:auto; }

  .grid-controls { display:flex; justify-content:center; }

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

  .mapping-label { font-size:0.7rem; font-weight:500; max-width:52px; text-overflow:ellipsis; white-space:nowrap; overflow:hidden; pointer-events:none; }

  /* Fixed-size pads; container scrolls if viewport is narrower */

  .mapping-label.unmapped {
    opacity: 0.4;
  }

  /* Mobile: make grid fill viewport width (minus padding) and keep square cells */
  /* (reverted) */

  .grid-editor { margin: 10px auto 0; padding: .6rem .7rem; border: 1px solid var(--border-color); border-radius: 8px; background: var(--card-bg); display:flex; flex-direction:column; gap:.5rem; max-width: 600px; }
  .editor-row { display:flex; align-items:center; gap:.5rem; }
  .editor-actions { display:flex; align-items:center; justify-content:space-between; gap:.6rem; }
</style>
