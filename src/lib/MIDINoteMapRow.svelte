<script lang="ts">
  import type { Note } from '../types/notes';
  import { noteToString, isBlackNote } from '../types/notes';
  import type { NoteMap, NoteMapping } from '../types/ui';
  import type { SaxKey } from '../types/saxophone';
  import ColorButton from './ColorButton.svelte';
  import NoteInput from './NoteInput.svelte';

  export let key: Note;
  export let mapping: NoteMapping;
  export let onChange: (mapping: NoteMapping) => void;

  // Helper function to determine if this should use black key styling
  function shouldUseBlackKeyStyling(mapping: NoteMapping): boolean {
    return mapping.type === 'note' && isBlackNote(mapping.target);
  }
</script>

<tr class={shouldUseBlackKeyStyling(mapping) ? 'black-key' : ''}>
  <td>{key}</td>
  <td>
    <div class="type-badge type-{mapping.type}">{mapping.type}</div>
  </td>
  <td>
    <div class="input-container">
      {#if mapping.type === 'note'}
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
        <input
          type="text"
          value={mapping.saxKey}
          on:input={(e) => onChange({ ...mapping, saxKey: e.currentTarget.value as SaxKey })}
          placeholder="Sax key"
        />
      {/if}
    </div>
  </td>
  <td>
    <div class="button-container">
      <ColorButton
        value={mapping.color.rest}
        index={key}
        onChange={(value) => onChange({ ...mapping, color: { ...mapping.color, rest: value } })}
      />
    </div>
  </td>
  <td>
    <div class="button-container">
      <ColorButton
        value={mapping.color.pressed}
        index={key}
        onChange={(value) => onChange({ ...mapping, color: { ...mapping.color, pressed: value } })}
      />
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

  .type-badge {
    display: inline-block;
    padding: 2px 6px;
    border-radius: 3px;
    font-size: 10px;
    font-weight: bold;
    text-transform: uppercase;
    color: white;
  }

  .type-note {
    background-color: #4CAF50;
  }

  .type-pitch {
    background-color: #2196F3;
  }

  .type-timbre {
    background-color: #FF9800;
  }

  .type-sax {
    background-color: #9C27B0;
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
  input[type="text"],
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
  input[type="text"]:focus,
  select:focus {
    outline: none;
    border-color: var(--accent-color);
  }
</style>
