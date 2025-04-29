<script lang="ts">
  import { launchpadColorToHexString, getTextColor, launchpadColorToString } from '../types/colors';
  import FloatingColorPicker from './FloatingColorPicker.svelte';
  import type { LaunchpadColor } from '../types/notes';

  export let value: LaunchpadColor;
  export let index: number;
  export let onChange: (value: LaunchpadColor) => void;

  let showPicker = false;
  let pickerStyle = {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    zIndex: '1000'
  };
</script>

<div class="color-button-container">
  <div
    class="color-preview"
    role="button"
    tabindex={index}
    style="background-color: {launchpadColorToHexString(value)}; color: {getTextColor(value)}"
    on:click={() => showPicker = true}
  >
    {launchpadColorToString(value)}
  </div>
  {#if showPicker}
    <FloatingColorPicker
      {value}
      on:change={(e) => {
        onChange(e.detail);
        showPicker = false;
      }}
      on:close={() => showPicker = false}
      style={pickerStyle}
    />
  {/if}
</div>

<style>
  .color-button-container {
    display: inline-block;
  }

  .color-preview {
    padding: 8px 12px;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    text-align: center;
    min-width: 100px;
    user-select: none;
    transition: background-color var(--transition-speed), color var(--transition-speed);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
</style> 