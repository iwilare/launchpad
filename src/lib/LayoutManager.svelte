<script lang="ts">
  import { onMount } from 'svelte';
  import { niceNoteMap, noteMapToNiceNoteMapFormat, type NoteMap } from '../types/ui';

  export let noteMap: NoteMap;
  export let onRestoreMap: (newMap: NoteMap) => void;

  type SavedLayout = { name: string; data: string };
  let layouts: SavedLayout[] = [];
  let newName = '';
  let error: string | null = null;
  let renamingIndex: number | null = null;
  let renameValue = '';

  const STORAGE_KEY = 'savedLayouts'; // sessionStorage key

  function loadLayouts() {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      layouts = raw ? (JSON.parse(raw) as SavedLayout[]) : [];
    } catch (_e) {
      layouts = [];
    }
  }

  function persist() {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(layouts));
  }

  function saveCurrent() {
    error = null;
    const name = newName.trim() || `Layout ${new Date().toLocaleString()}`;
    const data = noteMapToNiceNoteMapFormat(noteMap);
    const idx = layouts.findIndex((l) => l.name === name);
    if (idx >= 0) {
      // overwrite existing
      layouts[idx] = { name, data };
    } else {
      layouts = [...layouts, { name, data }];
    }
    persist();
    newName = '';
  }

  function restore(index: number) {
    error = null;
    const layout = layouts[index];
    if (!layout) return;
    const parsed = niceNoteMap(layout.data);
    if (typeof parsed === 'string') {
      error = parsed;
      return;
    }
    onRestoreMap(parsed);
  }

  function startRename(index: number) {
    renamingIndex = index;
    renameValue = layouts[index]?.name ?? '';
  }

  function applyRename(index: number) {
    const v = renameValue.trim();
    if (!v) return;
    const existingIdx = layouts.findIndex((l, i) => l.name === v && i !== index);
    if (existingIdx >= 0) {
      // overwrite the one being renamed into
      layouts[existingIdx] = { name: v, data: layouts[index].data };
      layouts.splice(index, 1);
      layouts = [...layouts];
    } else {
      layouts[index] = { ...layouts[index], name: v };
      layouts = [...layouts];
    }
    persist();
    renamingIndex = null;
    renameValue = '';
  }

  onMount(() => {
    loadLayouts();
  });
</script>

<div class="layout-manager">
  <div class="save-row">
    <input type="text" placeholder="Layout name" bind:value={newName} />
    <button class="action" on:click={saveCurrent}>Save</button>
  </div>

  {#if error}
    <div class="error">{error}</div>
  {/if}

  <div class="chip-list">
    {#each layouts as l, i}
      {#if renamingIndex === i}
        <div class="chip editing">
          <input class="rename" type="text" bind:value={renameValue} />
          <button class="action" on:click={() => applyRename(i)}>Save</button>
          <button class="secondary" on:click={() => { renamingIndex = null; renameValue = ''; }}>Cancel</button>
        </div>
      {:else}
        <div
          class="chip"
          role="button"
          tabindex="0"
          title="Click to restore"
          on:click={() => restore(i)}
          on:keydown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); restore(i); } }}
        >
          <span class="name">{l.name}</span>
          <button
            type="button"
            class="close"
            title="Delete"
            on:click|stopPropagation={() => {
              if (confirm(`Delete layout \"${l.name}\"?`)) {
                layouts.splice(i, 1);
                layouts = [...layouts];
                persist();
              }
            }}
          >×</button>
        </div>
        <button class="secondary small" on:click={() => startRename(i)} title="Rename">✎</button>
      {/if}
    {/each}
    {#if layouts.length === 0}
      <div class="empty">No saved layouts.</div>
    {/if}
  </div>
</div>

<style>
  .layout-manager { display: flex; flex-direction: column; gap: 10px; }
  .save-row { display: flex; gap: 8px; align-items: center; }
  .chip-list { display: flex; gap: 8px; flex-wrap: wrap; }
  .chip { display: inline-flex; align-items: center; gap: 6px; padding: 4px 8px; border-radius: 999px; border: 1px solid var(--border-color); background: var(--card-bg); color: var(--text-color); cursor: pointer; }
  .chip { border: 1px solid var(--border-color); background: var(--card-bg); }
  .chip, .chip * { font: inherit; }
  .chip button { background: transparent; border: none; color: inherit; cursor: pointer; }
  .chip .name { font-weight: 500; }
  .chip .close { margin-left: 6px; opacity: 0.8; }
  .chip .close:hover { opacity: 1; }
  .small { padding: 2px 6px; }
  .editing { display: inline-flex; gap: 6px; align-items: center; padding: 4px 8px; border-radius: 6px; border: 1px solid var(--border-color); background: var(--card-bg); }
  .rename { padding: 2px 6px; border: 1px solid var(--border-color); border-radius: 4px; background: var(--input-bg); color: var(--text-color); }
  input[type="text"] { padding: 4px 8px; border: 1px solid var(--border-color); background: var(--input-bg); color: var(--text-color); border-radius: 4px; }
  .action { padding: 4px 8px; }
  .secondary { padding: 4px 8px; opacity: 0.8; }
  .empty { color: var(--text-color); opacity: 0.7; font-size: 0.9em; }
  .error { color: #ff6b6b; font-size: 0.9em; }
</style>
