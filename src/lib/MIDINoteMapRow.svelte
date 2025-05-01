<script lang="ts">
  import type { Note, NoteMap, NoteMapping } from '../types/notes';
  import { noteToString, isBlackNote } from '../types/notes';
  import ColorButton from './ColorButton.svelte';
  import NoteInput from './NoteInput.svelte';

  export let key: Note;
  export let mapping: NoteMapping;
  export let onChange: (mapping: NoteMapping) => void;
</script>

<tr class={isBlackNote(mapping.target) ? 'black-key' : ''}>
  <td>{key}</td>
  <td>
    <div class="input-container">
      <NoteInput
        id={key.toString()}
        data={mapping.target}
        onChange={(value) => onChange({ ...mapping, target: value })}
      />
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
    padding: 3px 20px 3px 20px;
  }

  .input-container,
  .button-container {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    height: 100%;
  }
</style> 