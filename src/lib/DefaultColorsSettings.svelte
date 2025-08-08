<script context="module" lang="ts">
  import type { LaunchpadColor, NoteMap } from '../types/ui';
  import { isBlackNote } from '../types/notes';
  import { colorFromSettings, type ColorSettings } from '../types/ui';
</script>

<script lang="ts">
  import ColorButton from './ColorButton.svelte';

  export let colorSettings: ColorSettings;
  export let onColorSettingsChange: (settings: ColorSettings) => void;
</script>

<div class="color-settings">
  <div class="panel">
    <div class="table-container">
      <table class="color-settings-table">
        <thead>
          <tr>
            <th></th>
            <th>White</th>
            <th>Black</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Rest</td>
            <td>
              <ColorButton
                index={0}
                value={colorSettings.whiteRest}
                onChange={(v: LaunchpadColor) => { onColorSettingsChange({ ...colorSettings, whiteRest: v }); }}
              />
            </td>
            <td>
              <ColorButton
                index={2}
                value={colorSettings.blackRest}
                onChange={(v: LaunchpadColor) => { onColorSettingsChange({ ...colorSettings, blackRest: v }); }}
              />
            </td>
          </tr>
          <tr>
            <td>Pressed</td>
            <td>
              <ColorButton
                index={1}
                value={colorSettings.whitePressed}
                onChange={(v: LaunchpadColor) => { onColorSettingsChange({ ...colorSettings, whitePressed: v }); }}
              />
            </td>
            <td>
              <ColorButton
                index={3}
                value={colorSettings.blackPressed}
                onChange={(v: LaunchpadColor) => { onColorSettingsChange({ ...colorSettings, blackPressed: v }); }}
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="single-color-toggle">
      <label for="single-color">
        <input type="checkbox" id="single-color" checked={colorSettings.singleColor}
               on:change={() => onColorSettingsChange({ ...colorSettings, singleColor: !colorSettings.singleColor })} />
        Single Color
      </label>
    </div>
  </div>
</div>

<style>
  .color-settings {
    display: flex;
    justify-content: center;
    width: 100%;
  }

  .panel {
    background: var(--section-bg);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 15px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 15px;
    width: 100%;
  }

  .table-container {
    width: 100%;
    max-width: 300px;
    margin: 0 auto;
  }

  .color-settings-table {
    width: 100%;
    border-collapse: collapse;
  }

  .color-settings-table th,
  .color-settings-table td {
    padding: 8px;
    text-align: center;
    border-bottom: 1px solid var(--border-color);
  }

  .color-settings-table th {
    font-weight: 500;
    color: var(--text-color);
  }

  .color-settings-table td:first-child {
    text-align: right;
    padding-right: 15px;
  }

  .single-color-toggle {
    margin-top: 5px;
  }

  .single-color-toggle label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
  }
</style>
