<script lang="ts">
  import { writable } from "svelte/store";
  import type { Note } from "../types/notes";
  import { stringToNote, noteToString, decreaseNote, increaseNote, canBeIncreased, canBeDecreased } from "../types/notes";

  export let id: string;
  export let data: Note;
  export let onChange: (value: Note) => void;
  export let className = "";
  export let asButton = false;
  export let style = "";

  let value = noteToString(data);
  let isValid = true;
  let isEditing = false;

  $: {
    if (!isEditing) {
      value = noteToString(data);
      isValid = true;
    }
  }

  function handleChange(e: Event) {
    value = (e.target as HTMLInputElement).value;
    const parsedNote = stringToNote(value);
    if (parsedNote !== null) {
      onChange(parsedNote);
      isValid = true;
    } else {
      isValid = false;
    }
  }

  function handleEditStart() {
    if (asButton) {
      isEditing = true;
    }
  }

  function handleEditSubmit() {
    if (asButton) {
      const parsedNote = stringToNote(value);
      if (parsedNote !== null) {
        onChange(parsedNote);
        isValid = true;
      }
      isEditing = false;
    }
  }

  function handleEditKeyDown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      handleEditSubmit();
    } else if (e.key === 'Escape') {
      isEditing = false;
      value = noteToString(data);
    } else if (e.key === "ArrowUp") {
      increase();
    } else if (e.key === "ArrowDown") {
      decrease();
    } else {
      return; // Don't prevent default for other keys
    }
    e.preventDefault();
    e.stopPropagation();
  }

  function increase() {
    const newNote = increaseNote(data);
    if (newNote !== null) {
      onChange(newNote);
    } 
  }
  function decrease() {
    const newNote = decreaseNote(data);
    if (newNote !== null) {
      onChange(newNote);
    } 
  }
</script>

{#if asButton && !isEditing}
  <button 
    class="note-button {className}"
    style={style}
    on:click|preventDefault|stopPropagation={handleEditStart}
  >{noteToString(data)}</button>
{:else}
  <div class="note-stepper">
    <input
      type="text"
      {id}
      class="note-input {!isValid ? 'invalid-input' : ''} {className}"
      style={style}
      bind:value
      on:input={handleChange}
      on:keydown={handleEditKeyDown}
      on:blur={handleEditSubmit}
      maxLength={4}
      placeholder="C4"
      title="Enter note name (e.g., C4, C#3)"
    />
    {#if !asButton}
      <div class="steppers">
        <button on:click={increase} disabled={!canBeIncreased(data)}>▲</button>
        <button on:click={decrease} disabled={!canBeDecreased(data)}>▼</button>
      </div>
    {/if}
  </div>
{/if}

<style>
  .note-input {
    width: 32px;
    height: 18px;
    padding: 4px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background-color: var(--input-bg);
    color: var(--text-color);
    font-family: monospace;
    font-size: 14px;
    text-align: right;
  }

  .note-button {
    font-size: 12px;
    color: var(--text-color);
    text-shadow: 0 1px 2px var(--shadow-color);
    font-weight: 500;
    background: none;
    border: none;
    padding: 0;
    margin: 0;
    cursor: pointer;
  }

  .note-input.invalid-input {
    border-color: #ff6b6b;
    background-color: rgba(255, 107, 107, 0.1);
  }

  .note-stepper {
    display: flex;
    flex-direction: row;
  }

  .steppers {
    display: flex;
    flex-direction: column;
    margin-left: 3px;
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
</style>
