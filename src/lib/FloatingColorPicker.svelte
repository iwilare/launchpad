<script lang="ts">
  import { onMount } from 'svelte';
  import { LaunchpadColors, launchpadColorToHexString, getTextColor } from '../types/colors';
  import type { LaunchpadColor } from '../types/notes';

  export let value: LaunchpadColor;
  export let position: 'center' | 'relative' = 'relative';
  export let style: Record<string, string> = {};
  export let onChange: (color: LaunchpadColor) => void;
  export let onClose: () => void;

  let pickerRef: HTMLDivElement;
  let searchTerm = '';

  function handleClickOutside(event: MouseEvent) {
    if (pickerRef && !pickerRef.contains(event.target as Node)) {
      onClose();
    }
  }

  onMount(() => {
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  });
</script>

<div
  bind:this={pickerRef}
  class="floating-color-picker"
  style="
    position: {position === 'center' ? 'fixed' : 'absolute'};
    {position === 'center' ? 'top: 50%; left: 50%; transform: translate(-50%, -50%);' : ''}
    {Object.entries(style).map(([key, value]) => `${key}: ${value};`).join('')}
  "
>
  <input
    type="text"
    placeholder="Search colors..."
    bind:value={searchTerm}
    class="color-search"
  />
  <div class="color-grid">
    {#each Object.entries(LaunchpadColors) as [codeAsForcedString, hexColor]}
      {#if !searchTerm || codeAsForcedString.toLowerCase().includes(searchTerm.toLowerCase())}
        {@const code = parseInt(codeAsForcedString)}
        {@const hexCode = Number(code).toString(16).padStart(2, '0').toUpperCase()}
        <div
          role="button"
          class="color-option {code === value ? 'selected' : ''}"
          style="background-color: {hexColor}; color: {getTextColor(code)}"
          on:click={() => onChange(code)}
          title="Color {hexCode}"
        >
          {hexCode}
        </div>
      {/if}
    {/each}
  </div>
</div>

<style>
  .floating-color-picker {
    background: var(--color-picker-bg);
    border: 1px solid var(--color-picker-border);
    border-radius: 8px;
    padding: 15px;
    box-shadow: 0 4px 12px var(--color-picker-shadow);
    z-index: 9999;
  }

  .color-search {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    outline: none;
    background-color: var(--input-bg);
    color: var(--text-color);
    margin-bottom: 10px;
    font-size: 14px;
  }

  .color-grid {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 8px;
    margin: 10px 0;
    padding: 5px;
    background: var(--card-bg);
    border-radius: 4px;
  }

  .color-option {
    width: 32px;
    height: 32px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    font-family: monospace;
    color: var(--text-color);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
    transition: transform var(--transition-speed);
  }

  .color-option:hover {
    transform: scale(1.1);
    z-index: 1;
  }

  .color-option.selected {
    border: 2px solid var(--text-color);
    box-shadow: 0 0 0 1px var(--border-color);
  }
  
  .color-grid {
    display: grid;
    grid-template-columns: repeat(8, 1fr);
    gap: 10px;
    margin: 15px 0;
    padding: 10px;
    background: var(--card-bg);
    border-radius: 4px;
  }

  .color-option {
    width: 40px;
    height: 40px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-family: monospace;
    color: #fff;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.8);
    transition: transform 0.1s ease;
  }

  .color-option:hover {
    transform: scale(1.1);
    z-index: 1;
  }

  .color-option.selected {
    border: 2px solid #fff;
    box-shadow: 0 0 0 1px var(--border-color);
  }

  .color-search {
    width: 100%;
    padding: 10px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    outline: none;
    background-color: var(--input-bg);
    color: var(--text-color);
    font-size: 14px;
  }

</style> 