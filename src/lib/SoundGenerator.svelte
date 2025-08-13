<script lang="ts">
	import type { SoundSettings } from "../types/sound";

	export let settings: SoundSettings;
	export let onSettingsChange: (settings: SoundSettings) => void;

	function setWaveform(w: OscillatorType) {
		onSettingsChange({ ...settings, waveform: w });
	}
	function setVolume(v: number) {
		onSettingsChange({ ...settings, volume: v });
	}
	function setTime(kind: 'attackTime' | 'releaseTime', v: number) {
		if (isNaN(v) || v < 0) return;
		onSettingsChange({ ...settings, [kind]: v });
	}
</script>

<div class="sound-generator">
	<div class="control-grid">
		<div class="sound-control-group">
			<label for="waveform">Waveform</label>
			<select id="waveform" name="waveform" value={settings.waveform}
							on:change={(e) => setWaveform((e.target as HTMLSelectElement).value as OscillatorType)}>
				<option value="sine">Sine</option>
				<option value="square">Square</option>
				<option value="sawtooth">Sawtooth</option>
				<option value="triangle">Triangle</option>
			</select>
		</div>
		<div class="sound-control-group">
			<label for="volume">Volume</label>
			<input id="volume" type="range" min="0" max="1" step="0.01" value={settings.volume}
						 on:input={(e) => setVolume(parseFloat((e.target as HTMLInputElement).value))} />
			<span class="value-display">{Math.round(settings.volume * 100)}%</span>
		</div>
	</div>
	<details class="advanced-controls">
		<summary>Advanced controls</summary>
		<div class="control-grid">
			<div class="sound-control-group">
				<label for="attack">Attack Time (ms)</label>
				<input id="attack" type="number" min="0" max="2000" step="1" value={settings.attackTime}
							 on:input={(e) => setTime('attackTime', parseInt((e.target as HTMLInputElement).value))} />
			</div>
			<div class="sound-control-group">
				<label for="release">Release Time (ms)</label>
				<input id="release" type="number" min="0" max="2000" step="1" value={settings.releaseTime}
							 on:input={(e) => setTime('releaseTime', parseInt((e.target as HTMLInputElement).value))} />
			</div>
		</div>
	</details>
</div>

<style>
	.sound-generator { background: var(--section-bg); padding: 20px; border-radius: 8px; border: 1px solid var(--border-color); box-shadow: 0 2px 4px var(--shadow-color); }
	.control-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; }
	.sound-control-group { display: flex; flex-direction: column; gap: 8px; }
	.value-display { font-size: 14px; color: var(--launchpad-layout-tooltip); }
</style>
