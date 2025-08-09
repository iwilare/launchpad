<script lang="ts">
  import type { Note } from '../types/notes';
  import { isBlackNote } from '../types/notes';
  import type { NoteMapping, MappingColor } from '../types/ui';
  import { SAX_KEYS, DEFAULT_SAX_KEY, type SaxKey } from '../types/saxophone';
  import ColorButton from './ColorButton.svelte';
  import NoteInput from './NoteInput.svelte';

  // Row props
  export let key: Note; // launchpad key code
  export let value: { mapping: NoteMapping; color: MappingColor } | undefined;
  export let onChange: (value: { mapping: NoteMapping; color: MappingColor } | undefined) => void;

  // Derive mapping for ergonomic access
  $: mapping = value?.mapping;

  const DEFAULT_COLOR: MappingColor = { rest: 0x00, pressed: 0x25 };

  function handleTypeChange(newType: 'note' | 'pitch' | 'timbre' | 'sax' | 'none') {
    if (newType === 'none') { onChange(undefined); return; }
    const currentColor = value ? value.color : DEFAULT_COLOR;
    if (mapping && mapping.type === newType) return;
    let newMapping: NoteMapping;
    switch (newType) {
      case 'note': {
        const target = mapping && mapping.type === 'note' ? mapping.target : (60 as Note);
        newMapping = { type: 'note', target };
        break;
      }
      case 'pitch':
        newMapping = { type: 'pitch', bend: 0 }; break;
      case 'timbre':
        newMapping = { type: 'timbre', waveform: 'sine' }; break;
      case 'sax':
        newMapping = { type: 'sax', key: DEFAULT_SAX_KEY }; break;
    }
    onChange({ mapping: newMapping!, color: currentColor });
  }
</script>

<tr class={mapping !== undefined && mapping.type === 'note' && isBlackNote(mapping.target) ? 'black-key' : ''}>
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
    <div class="input-container">
      {#if !mapping}
        <span style="opacity: 0.7; font-size: 12px;">—</span>
      {:else if mapping.type === 'note'}
        <NoteInput
          id={key.toString()}
          data={mapping.target}
          onChange={(newTarget) => onChange(value && { mapping: { ...mapping, target: newTarget }, color: value.color })}
        />
      {:else if mapping.type === 'pitch'}
        <input
          type="number"
          value={mapping.bend}
          on:input={(e) => onChange(value && { mapping: { ...mapping, bend: parseFloat(e.currentTarget.value) }, color: value.color })}
          min="-1"
          max="1"
          step="0.1"
        />
      {:else if mapping.type === 'timbre'}
        <select
          value={mapping.waveform}
          on:change={(e) => onChange(value && { mapping: { ...mapping, waveform: e.currentTarget.value as OscillatorType }, color: value.color })}
        >
          <option value="sine">Sine</option>
          <option value="square">Square</option>
          <option value="sawtooth">Sawtooth</option>
          <option value="triangle">Triangle</option>
        </select>
      {:else if mapping.type === 'sax'}
        <select
          value={mapping.key}
          on:change={(e) => onChange(value && { mapping: { ...mapping, key: e.currentTarget.value as SaxKey }, color: value.color })}
        >
          {#each SAX_KEYS as k}
            <option value={k}>{k}</option>
          {/each}
        </select>
      {/if}
    </div>
  </td>
  <td>
    <div class="button-container">
    {#if value}
        <ColorButton
      value={value.color.rest}
          index={key}
      onChange={(c) => onChange(value && { mapping: value.mapping, color: { ...value.color, rest: c } })}
        />
      {/if}
    </div>
  </td>
  <td>
    <div class="button-container">
    {#if value}
        <ColorButton
      value={value.color.pressed}
          index={key}
      onChange={(c) => onChange(value && { mapping: value.mapping, color: { ...value.color, pressed: c } })}
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
