<script context="module" lang="ts">
  import type { LaunchpadColor, NoteMap } from '../types/notes';
  import { isBlackNote } from '../types/notes';
  import { colorFromSettings, type ColorSettings } from '../types/ui';
</script>

<script lang="ts">
  import ColorButton from './ColorButton.svelte';

  export let colorSettings: ColorSettings;
  export let onColorSettingsChange: (settings: ColorSettings) => void;
</script>

<div class="color-settings">
  <div style="display: flex; gap: 20px; width: 100%;">
    <div class="panel" style="flex: 1; display: flex; flex-direction: column; gap: 15px;">
      <div class="table-container">
        <div class="spacer"></div>
        <table class="color-settings-table">
          <tbody>
            <tr>
              <th></th>
              <th></th>
            </tr>
            <tr>
              <td>Rest</td>
              <td>
                <ColorButton
                  index={4}
                  value={colorSettings.uniformRest}
                  onChange={(v: LaunchpadColor) => { onColorSettingsChange({ ...colorSettings, uniformRest: v }); }}
                />
              </td>
            </tr>
            <tr>
              <td>Pressed</td>
              <td>
                <ColorButton
                  index={5}
                  value={colorSettings.uniformPressed}
                  onChange={(v: LaunchpadColor) => { onColorSettingsChange({ ...colorSettings, uniformPressed: v }); }}
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="button-group">
        <label for="radio-uniform">
          <input type="radio" name="color-scheme" checked={colorSettings.isUniform} id="radio-uniform"
                 on:change={() => onColorSettingsChange({ ...colorSettings, isUniform: true })} />
          Uniform Colors
        </label>
      </div>
    </div>

    <div class="panel" style="flex: 1; display: flex; flex-direction: column; gap: 15px;">
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
      <div class="button-group">
        <label for="radio-differentiated">
          <input type="radio" name="color-scheme" id="radio-differentiated"
                 checked={!colorSettings.isUniform} 
                 on:change={() => { onColorSettingsChange({ ...colorSettings, isUniform: false }) }}
          />
          Differentiated Colors
        </label>
      </div>
    </div>
  </div>
</div>

<style>
  .color-settings {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 20px;
    width: 100%;
  }

  .table-container {
    flex: 1;
    display: flex;
    flex-direction: column;
  }

  .spacer {
    flex: 1;
  }

  .color-settings-table {
    width: 100%;
    border-collapse: collapse;
  }

  .color-settings-table th,
  .color-settings-table td {
    padding: 4px 8px;
    text-align: left;
    border-bottom: 1px solid var(--border-color);
  }

  .color-settings-table th {
    font-weight: 500;
    color: var(--text-color);
    padding-top: 0px;
  }

  .color-settings-table td:first-child {
    min-width: 60px;
  }
</style>