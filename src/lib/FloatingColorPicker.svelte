<script lang="ts">
  import { onMount } from "svelte";
  import { LaunchpadColors, launchpadColorToTextColorHex, getHexCode, getHue, isGray } from "../types/colors";
  import type { LaunchpadColor } from "../types/notes";

  export let value: LaunchpadColor;
  export let onChange: (color: LaunchpadColor) => void;
  export let onClose: () => void;

  let pickerRef: HTMLDivElement;
  let searchTerm = "";

  function handleClickOutside(event: MouseEvent) {
    if (pickerRef && !pickerRef.contains(event.target as Node)) {
      onClose();
    }
  }

  onMount(() => {
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  });

  // Prepare sorted color entries
  let sortedColors: { code: number; hexColor: string; hexCode: string; hue: number | null; gray: boolean }[] = [];
  $: {
    sortedColors = Object.entries(LaunchpadColors)
      .map(([codeAsForcedString, hexColor]) => {
        const code = parseInt(codeAsForcedString);
        const hexCode = getHexCode(code);
        const hue = getHue(hexColor);
        const gray = isGray(hexColor);
        return { code, hexColor, hexCode, hue, gray };
      })
      .sort((a, b) => {
        // Grays first, then by hue
        if (a.gray && !b.gray) return -1;
        if (!a.gray && b.gray) return 1;
        if (a.gray && b.gray) return a.code - b.code;
        // Both colored: sort by hue
        return (a.hue ?? 0) - (b.hue ?? 0);
      });
  }
</script>

<div bind:this={pickerRef} class="floating-color-picker">
  <div class="inner"> 
      <input
      type="text"
      placeholder="Search colors..."
      bind:value={searchTerm}
      class="color-search"
    />
    <div class="color-grid">
      {#each sortedColors as {code, hexColor, hexCode} }
        {#if !searchTerm || hexCode.toLowerCase().includes(searchTerm.toLowerCase())}
          <button
            class="color-option {code === value ? 'selected' : ''}"
            style="background-color: {hexColor}; color: {launchpadColorToTextColorHex(code)}"
            on:click={() => onChange(code)}
            title="Color {hexCode}"
          >
            {hexCode}
          </button>
        {/if}
      {/each}
    </div>
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
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }

  .color-search {
    width: 100%;
    box-sizing: border-box;
    padding: 15px 12px;
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
    background: var(--card-bg);
    border-radius: 4px;
  }

  .inner {
    padding: 5px;
  }

  .color-option:hover {
    transform: scale(1.1);
    z-index: 1;
  }

  .color-option.selected {
    border: 2px solid var(--text-color);
    box-shadow: 0 0 0 1px var(--border-color);
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
</style>
