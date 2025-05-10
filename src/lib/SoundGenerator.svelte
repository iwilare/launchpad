<script lang="ts">
  import type { SoundSettings } from "../types/sound";

  export let settings: SoundSettings;
  export let onSettingsChange: (settings: SoundSettings) => void;

  // Handle input changes with validation
  function handleTimeChange(value: string, property: 'attackTime' | 'releaseTime') {
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 0) {
      onSettingsChange({ ...settings, [property]: numValue });
    }
  }
</script>

<div class="sound-generator">
  <div class="control-grid">
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
    <!-- advanced controls -->
  </div>
  <details class="advanced-controls">
    <summary>Advanced controls</summary>
    <div class="control-grid">
      <div class="sound-control-group">
        <label for="attack">Attack Time (ms)</label>
          <input
          type="number"
          id="attack"
          name="attack"
          min="0"
          max="2000"
          step="1"
          value={settings.attackTime}
          on:input={(e) => handleTimeChange((e.target as HTMLInputElement).value, 'attackTime')}
        />
      </div>
      <div class="sound-control-group">
        <label for="release">Release Time (ms)</label>
        <input
          type="number"
          id="release"
          name="release"
          min="0"
          max="2000"
          step="1"
          value={settings.releaseTime}
          on:input={(e) => handleTimeChange((e.target as HTMLInputElement).value, 'releaseTime')}
        />
      </div>
    </div>
  </details>
</div>

<style>
  .sound-generator {
    background: var(--section-bg);
    padding: 20px;
    border-radius: 8px;
    border: 1px solid var(--border-color);
    box-shadow: 0 2px 4px var(--shadow-color);
  }

  .control-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 20px;
  }

  .sound-control-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .value-display {
    font-size: 14px;
    color: var(--launchpad-layout-tooltip);
  }
</style>