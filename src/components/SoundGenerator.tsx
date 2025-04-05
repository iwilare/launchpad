// src/components/SoundGenerator.tsx
import React from 'react';
import { SoundSettings } from '../App';

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

      <div className="envelope-controls">
        <h3>Envelope</h3>
        <div className="control-row">
          <div className="control-group">
            <label htmlFor="attack">Attack</label>
            <input
              type="range"
              id="attack"
              name="attack"
              min="0.01"
              max="2"
              step="0.01"
              value={settings.attack}
              onChange={handleChange}
            />
            <span className="value-display">{settings.attack.toFixed(2)}s</span>
          </div>

          <div className="control-group">
            <label htmlFor="decay">Decay</label>
            <input
              type="range"
              id="decay"
              name="decay"
              min="0.01"
              max="2"
              step="0.01"
              value={settings.decay}
              onChange={handleChange}
            />
            <span className="value-display">{settings.decay.toFixed(2)}s</span>
          </div>
        </div>

        <div className="control-row">
          <div className="control-group">
            <label htmlFor="sustain">Sustain</label>
            <input
              type="range"
              id="sustain"
              name="sustain"
              min="0"
              max="1"
              step="0.01"
              value={settings.sustain}
              onChange={handleChange}
            />
            <span className="value-display">{Math.round(settings.sustain * 100)}%</span>
          </div>

          <div className="control-group">
            <label htmlFor="release">Release</label>
            <input
              type="range"
              id="release"
              name="release"
              min="0.01"
              max="5"
              step="0.01"
              value={settings.release}
              onChange={handleChange}
            />
            <span className="value-display">{settings.release.toFixed(2)}s</span>
          </div>
        </div>

        <div className="envelope-visualization">
          <svg viewBox="0 0 300 100" className="envelope-svg">
            <polyline
              points={`
                0,100
                ${settings.attack * 50},0
                ${settings.attack * 50 + settings.decay * 50},${(1 - settings.sustain) * 100}
                ${settings.attack * 50 + settings.decay * 50 + 50},${(1 - settings.sustain) * 100}
                ${settings.attack * 50 + settings.decay * 50 + 50 + settings.release * 50},100
              `}
              fill="none"
              stroke="#4CAF50"
              strokeWidth="2"
            />
            <text x="0" y="98" className="envelope-label">A</text>
            <text x={settings.attack * 50} y="98" className="envelope-label">D</text>
            <text x={settings.attack * 50 + settings.decay * 50 + 20} y="98" className="envelope-label">S</text>
            <text x={settings.attack * 50 + settings.decay * 50 + 50} y="98" className="envelope-label">R</text>
          </svg>
        </div>
      </div>
    </div>
  );
};

export default SoundGenerator;
