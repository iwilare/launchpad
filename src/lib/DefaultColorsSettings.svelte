<script context="module" lang="ts">
  import type { LaunchpadColor } from '../types/notes';

  export interface ColorSettings {
    whiteRest: LaunchpadColor;
    whitePressed: LaunchpadColor;
    blackRest: LaunchpadColor;
    blackPressed: LaunchpadColor;
  }
</script>

<script lang="ts">
  import ColorButton from './ColorButton.svelte';

  export let colorSettings: ColorSettings;
  export let onColorSettingsChange: (settings: ColorSettings) => void;
  export let onPropagateColors: () => void;
</script>

<div class="color-settings">
  <table class="color-settings-table">
    <tbody>
      <tr>
        <td>
          <label for="white-rest">White Key Rest:</label>
          <ColorButton
            index={0}
            value={colorSettings.whiteRest}
            onChange={(value) => onColorSettingsChange({ 
              ...colorSettings,
              whiteRest: value
            })}
          />
        </td>
        <td>
          <label for="white-pressed">White Key Pressed:</label>
          <ColorButton
            index={1}
            value={colorSettings.whitePressed}
            onChange={(value) => onColorSettingsChange({ 
              ...colorSettings,
              whitePressed: value
            })}
          />
        </td>
      </tr>
      <tr>
        <td>
          <label for="black-rest">Black Key Rest:</label>
          <ColorButton
            index={2}
            value={colorSettings.blackRest}
            onChange={(value) => onColorSettingsChange({
              ...colorSettings,
              blackRest: value
            })}
          />
        </td>
        <td>
          <label for="black-pressed">Black Key Pressed:</label>
          <ColorButton
            index={3}
            value={colorSettings.blackPressed}
            onChange={(value) => onColorSettingsChange({
              ...colorSettings,
              blackPressed: value
            })}
          />
        </td>
      </tr>
    </tbody>
  </table>
  <button on:click={onPropagateColors}>Apply Colors</button>
</div>

<style>
  .color-settings {
    background-color: var(--color-settings-bg);
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1rem;
  }

  .color-settings-table label {
    font-weight: bold;
  }

  .color-settings-table td {
    padding: 0.5rem;
  }

  .color-settings-table tr {
    border-bottom: 1px solid var(--border-color);
  }

  button {
    background-color: var(--button-bg);
    color: var(--button-text);
    border: none;
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
    border-radius: 4px;
    cursor: pointer;
    font-size: 16px;
    transition: background-color var(--transition-speed);
  }

  button:hover {
    background-color: var(--button-hover);
  }
</style>