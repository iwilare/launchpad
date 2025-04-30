<script lang="ts">
  interface SoundSettings {
    volume: number;
    waveform: OscillatorType;
  }

  export let settings: SoundSettings;
  export let onSettingsChange: (settings: SoundSettings) => void;

  function handleChange(e: Event) {
    const target = e.target as HTMLInputElement | HTMLSelectElement;
    const { name, value } = target;

    // Handle numeric values
    if (name !== 'waveform') {
      const numValue = parseFloat(value);
      onSettingsChange({
        ...settings,
        [name]: numValue
      });
    } else {
      // Handle waveform selection
      onSettingsChange({
        ...settings,
        waveform: value as OscillatorType
      });
    }
  }
</script>

<div class="sound-generator">
  <div class="control-row">
    <div class="sound-control-group">
      <label for="waveform">Waveform</label>
      <select
        id="waveform"
        name="waveform"
        value={settings.waveform}
        on:change={handleChange}
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
        on:input={handleChange}
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
    margin-bottom: 15px;
  }

  .sound-control-group {
    flex: 1;
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