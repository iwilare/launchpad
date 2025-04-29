<script lang="ts">
  import type { Note } from '../types/notes';
  import { stringToNote, noteToString } from '../types/notes';

  export let id: string;
  export let data: Note;
  export let onChange: (value: Note) => void;
  export let className = '';

  let value = noteToString(data);
  let isValid = true;

  function handleChange(e: Event) {
    const inputValue = (e.target as HTMLInputElement).value;
    value = inputValue;
    const parsedNote = stringToNote(inputValue);
    isValid = inputValue === '' || parsedNote !== null;
    
    if (parsedNote !== null) {
      onChange(parsedNote);
    }
  }
</script>

<input
  type="text"
  {id}
  class="note-input {!isValid ? 'invalid-input' : ''} {className}"
  {value}
  on:input={handleChange}
  maxLength={4}
  placeholder="C4"
  title="Enter note name (e.g., C4, C#3)"
/>

<style>
  .note-input {
    width: 40px;
    padding: 4px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background-color: var(--input-bg);
    color: var(--text-color);
    font-family: monospace;
    font-size: 14px;
    text-align: right;
  }

  .note-input.invalid-input {
    border-color: #ff6b6b;
    background-color: rgba(255, 107, 107, 0.1);
  }
</style> 