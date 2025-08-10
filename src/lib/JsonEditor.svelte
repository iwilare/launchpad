<script lang="ts">
  import { onMount } from 'svelte';
  import type { NoteMapping, LaunchpadColor, NoteMap, MappingColor, Key, MapData } from '../types/ui';
  import { niceNoteMap, niceNoteMapToNoteMap, niceify } from '../types/ui';

  export let noteMap: NoteMap;
  export let onUpdateMap: (newNoteMap: NoteMap) => void;

  let showJson = false;
  let jsonValue = '';
  let jsonError = '';

  function handleJsonChange(value: string) {
    const result = niceNoteMap(value);
    if (typeof result === 'string') {
      jsonError = result;
    } else {
      onUpdateMap(result);
    }
  }

  onMount(() => { if (!showJson) { jsonValue = niceify(noteMap); } });

  $: if (!showJson) { jsonValue = niceify(noteMap); }
</script>

<div class="panel">
  <h3>MIDI Note Mappings</h3>
  <div class="json-editor">
    <textarea
      bind:value={jsonValue}
      on:input={(e) => handleJsonChange((e.target as HTMLTextAreaElement).value)}
      spellCheck={false}
    ></textarea>
    {#if jsonError}
      <div class="json-error">{jsonError}</div>
    {/if}
  </div>
</div>

<style>
  .json-editor {
    margin-top: 10px;
  }

  .json-editor textarea {
    width: 100%;
    height: 300px;
    padding: 10px;
    font-family: monospace;
    font-size: 14px;
    background-color: var(--json-editor-textarea-bg);
    color: var(--text-color);
    border: 1px solid var(--border-color);
    border-radius: 4px;
    resize: vertical;
  }

  .json-error {
    margin-top: 10px;
    padding: 10px;
    background-color: var(--json-error-bg);
    color: var(--error-color);
    border-radius: 4px;
  }
</style>
