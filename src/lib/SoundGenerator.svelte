<script lang="ts">
    import type { SoundSettings } from "../types/ui";

  export let settings: SoundSettings;
  export let onSettingsChange: (settings: SoundSettings) => void;
</script>

<div class="sound-generator">
  <div class="control-row">
    <div class="sound-control-group">
      <label for="waveform">Waveform</label>
      <select
        id="waveform"
        name="waveform"
        value={settings.waveform}
        on:change={(e) => { onSettingsChange({ ...settings, waveform: (e.target as HTMLSelectElement).value as OscillatorType }); }}
      >
        <option value="sine">Sine</option>
        <option value="square">Square</option>
        <option value="sawtooth">Sawtooth</option>
        <option value="triangle">Triangle</option>
      </select>
    </div>
    <div class="sound-control-group">
      <label for="volume">Volume</label>
      <input
        type="range"
        id="volume"
        name="volume"
        min="0"
        max="1"
        step="0.01"
        value={settings.volume}
        on:input={(e) => { onSettingsChange({ ...settings, volume: parseFloat((e.target as HTMLInputElement).value) }); }}
      />
      <span class="value-display">{Math.round(settings.volume * 100)}%</span>
    </div>
  </div>
</div>

<style>
  .sound-generator {
    background: var(--section-bg);
    padding: 20px;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    box-shadow: 0 2px 4px var(--shadow-color);
  }

  .control-row {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
  }

  .sound-control-group {
    flex: 1;
    align-items: center;
    justify-content: center;
    min-width: 200px;
  }

  .sound-control-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: bold;
    color: var(--text-color);
  }

  .sound-control-group select {
    width: 100%;
    padding: 10px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background-color: var(--select-bg);
    color: var(--text-color);
    font-size: 14px;
  }

  .sound-control-group input[type="range"] {
    width: 100%;
    margin-bottom: 5px;
  }

  .value-display {
    display: inline-block;
    min-width: 40px;
    text-align: right;
    font-size: 14px;
    color: var(--launchpad-layout-tooltip);
  }
</style>