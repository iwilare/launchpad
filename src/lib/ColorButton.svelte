<script lang="ts">
  import { launchpadColorToHex, launchpadColorToTextColorHex, launchpadColorToString } from '../types/colors';
  import FloatingColorPicker from './FloatingColorPicker.svelte';
  import type { LaunchpadColor } from '../types/notes';

  export let value: LaunchpadColor;
  export let index: number;
  export let onChange: (value: LaunchpadColor) => void;

  let showPicker = false;
</script>

<div class="color-button-container">
  <button
    class="color-preview"
    tabindex={index}
    style="background-color: {launchpadColorToHex(value)}; color: {launchpadColorToTextColorHex(value)}"
    on:click={() => showPicker = true}
  >
    {launchpadColorToString(value)}
  </button>
  {#if showPicker}
    <FloatingColorPicker
      {value}
      onChange={(e) => { onChange(e); showPicker = false; }}
      onClose={() => showPicker = false}
    />
  {/if}
</div>

<style>
  .color-button-container {
    display: inline-block;
  }

  .color-preview {
    width: 24px;
    height: 24px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: var(--bg-color);
    font-size: 12px;
  }

</style> 