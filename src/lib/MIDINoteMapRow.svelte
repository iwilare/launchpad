<script lang="ts">
  import type { Note } from '../types/notes';
  import { noteToString, isBlackNote } from '../types/notes';
  import type { NoteMapping } from '../types/ui';
  import type { SaxKey } from '../types/saxophone';
  import { allMainKeys } from '../types/saxophone';
  import ColorButton from './ColorButton.svelte';
  import NoteInput from './NoteInput.svelte';

  export let key: Note;
  export let mapping: NoteMapping | undefined;
  export let onChange: (mapping: NoteMapping | undefined) => void;

  // Helper function to determine if this should use black key styling
  function shouldUseBlackKeyStyling(mapping?: NoteMapping): boolean {
    return !!mapping && mapping.type === 'note' && isBlackNote(mapping.target);
  }

  function handleTypeChange(newType: 'note' | 'pitch' | 'timbre' | 'sax' | 'none') {
    if (newType === 'none') { onChange(undefined); return; }
    const commonColor = mapping ? mapping.color : { rest: 0x00, pressed: 0x25 };
    if (mapping && newType === mapping.type) return;
    if (newType === 'note') {
      const target = (mapping && mapping.type === 'note' ? mapping.target : 60) as Note;
      onChange({ type: 'note', target, color: commonColor });
    } else if (newType === 'pitch') {
      onChange({ type: 'pitch', bend: 0, color: commonColor });
    } else if (newType === 'timbre') {
      onChange({ type: 'timbre', waveform: 'sine', color: commonColor });
    } else if (newType === 'sax') {
      const def: SaxKey = allMainKeys[0];
      onChange({ type: 'sax', saxKey: def, color: commonColor });
    }
  }
</script>

<tr class={shouldUseBlackKeyStyling(mapping) ? 'black-key' : ''}>
  <td>{key}</td>
  <td>
    <select
      class="type-select"
      value={mapping ? mapping.type : 'none'}
      on:change={(e) => handleTypeChange(e.currentTarget.value as any)}
    >
      <option value="none">none</option>
      <option value="note">note</option>
      <option value="pitch">pitch</option>
      <option value="timbre">timbre</option>
      <option value="sax">sax</option>
    </select>
  </td>
  <td>
    <div class="input-container">
      {#if !mapping}
        <span style="opacity: 0.7; font-size: 12px;">—</span>
      {:else if mapping.type === 'note'}
        <NoteInput
          id={key.toString()}
          data={mapping.target}
          onChange={(value) => onChange({ ...mapping, target: value })}
        />
      {:else if mapping.type === 'pitch'}
        <input
          type="number"
          value={mapping.bend}
          on:input={(e) => onChange({ ...mapping, bend: parseFloat(e.currentTarget.value) })}
          min="-1"
          max="1"
          step="0.1"
        />
      {:else if mapping.type === 'timbre'}
        <select
          value={mapping.waveform}
          on:change={(e) => onChange({ ...mapping, waveform: e.currentTarget.value as OscillatorType })}
        >
          <option value="sine">Sine</option>
          <option value="square">Square</option>
          <option value="sawtooth">Sawtooth</option>
          <option value="triangle">Triangle</option>
        </select>
      {:else if mapping.type === 'sax'}
        <select
          value={mapping.saxKey}
          on:change={(e) => onChange({ ...mapping, saxKey: e.currentTarget.value as SaxKey })}
        >
          {#each allMainKeys as k}
            <option value={k}>{k}</option>
          {/each}
        </select>
      {/if}
    </div>
  </td>
  <td>
    <div class="button-container">
      {#if mapping}
        <ColorButton
          value={mapping.color.rest}
          index={key}
          onChange={(value) => onChange({ ...mapping, color: { ...mapping.color, rest: value } })}
        />
      {/if}
    </div>
  </td>
  <td>
    <div class="button-container">
      {#if mapping}
        <ColorButton
          value={mapping.color.pressed}
          index={key}
          onChange={(value) => onChange({ ...mapping, color: { ...mapping.color, pressed: value } })}
        />
      {/if}
    </div>
  </td>
</tr>

<style>
  tr.black-key {
    background-color: var(--black-key-bg);
  }

  td {
    text-align: center;
    vertical-align: middle;
    border-bottom: 1px solid var(--border-color);
  }

  td:nth-child(2) {
    padding: 3px 10px;
  }

  td:nth-child(3) {
    padding: 3px 20px 3px 20px;
  }

  .type-select {
    padding: 4px 8px;
    border: 1px solid var(--border-color);
    border-radius: 12px;
    background-color: var(--input-bg);
    color: var(--text-color);
    font-size: 12px;
    text-transform: lowercase;
  }

  .input-container,
  .button-container {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
  }

  input[type="number"],
  select {
    padding: 4px 8px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background-color: var(--input-bg);
    color: var(--text-color);
    font-size: 12px;
    width: 100px;
  }

  input[type="number"]:focus,
  select:focus {
    outline: none;
    border-color: var(--accent-color);
  }
</style>
