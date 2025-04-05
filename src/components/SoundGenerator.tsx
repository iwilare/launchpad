
import React from 'react';
import { SoundSettings } from '../types';

interface SoundGeneratorProps {
  settings: SoundSettings;
  onSettingsChange: (settings: SoundSettings) => void;
}

const SoundGenerator: React.FC<SoundGeneratorProps> = ({ settings, onSettingsChange }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;

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
  };

  return (
    <div className="sound-generator">
      <div className="control-row">
        <div className="control-group">
          <label htmlFor="waveform">Waveform</label>
          <select
            id="waveform"
            name="waveform"
            value={settings.waveform}
            onChange={handleChange}
          >
            <option value="sine">Sine</option>
            <option value="square">Square</option>
            <option value="sawtooth">Sawtooth</option>
            <option value="triangle">Triangle</option>
          </select>
        </div>

        <div className="control-group">
          <label htmlFor="volume">Volume</label>
          <input
            type="range"
            id="volume"
            name="volume"
            min="0"
            max="1"
            step="0.01"
            value={settings.volume}
            onChange={handleChange}
          />
          <span className="value-display">{Math.round(settings.volume * 100)}%</span>
        </div>
      </div>
    </div>
  );
};

export default SoundGenerator;
