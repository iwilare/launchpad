// src/App.tsx
import React, { useEffect, useState, useRef } from 'react';
import './App.css';
import SoundGenerator from './components/SoundGenerator';
import VirtualKeyboard from './components/VirtualKeyboard';

interface MIDIDevice {
  id: string;
  name: string;
  manufacturer: string;
  connection: string;
  type: string;
}

interface MIDILog {
  timestamp: number;
  type: string;
  data: number[];
  description: string;
}

interface NoteState {
  [key: number]: boolean;
}

// Sound settings interface
export interface SoundSettings {
  waveform: OscillatorType;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  volume: number;
}

const App: React.FC = () => {
  const [midiAccess, setMidiAccess] = useState<WebMidi.MIDIAccess | null>(null);
  const [midiError, setMidiError] = useState<string>('');
  const [devices, setDevices] = useState<MIDIDevice[]>([]);
  const [selectedDevice, setSelectedDevice] = useState<string>('');
  const [logs, setLogs] = useState<MIDILog[]>([]);
  const [activeNotes, setActiveNotes] = useState<NoteState>({});

  // Sound settings state
  const [soundSettings, setSoundSettings] = useState<SoundSettings>({
    waveform: 'sine',
    attack: 0.05,
    decay: 0.1,
    sustain: 0.7,
    release: 0.2,
    volume: 0.5
  });

  // For the Web Audio API
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodesRef = useRef<{[key: number]: GainNode}>({});
  const oscillatorsRef = useRef<{[key: number]: OscillatorNode}>({});

  useEffect(() => {
    // Initialize Web Audio API
    audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();

    // Request MIDI access
    if (navigator.requestMIDIAccess) {
      navigator.requestMIDIAccess({ sysex: true })
        .then(onMIDISuccess)
        .catch(err => setMidiError(`MIDI Access Error: ${err.message}`));
    } else {
      setMidiError('Web MIDI API is not supported in your browser.');
    }

    // Cleanup on unmount
    return () => {
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close();
      }
    };
  }, []);

  const onMIDISuccess = (midiAccess: WebMidi.MIDIAccess) => {
    setMidiAccess(midiAccess);
    updateDeviceList(midiAccess);

    // Listen for device connection/disconnection
    midiAccess.addEventListener('statechange', (event) => {
      console.log('MIDI state changed:', event);
      updateDeviceList(midiAccess);
      addToLog({
        timestamp: Date.now(),
        type: 'statechange',
        data: [],
        description: `MIDI connection state changed: ${(event as unknown as { port: WebMidi.MIDIPort }).port.state}`
      });
    });
  };

  const updateDeviceList = (midiAccess: WebMidi.MIDIAccess) => {
    const inputs: MIDIDevice[] = [];
    midiAccess.inputs.forEach(input => {
      inputs.push({
        id: input.id,
        name: input.name || 'Unnamed device',
        manufacturer: input.manufacturer || 'Unknown manufacturer',
        connection: input.connection,
        type: input.type
      });
    });
    setDevices(inputs);
  };

  const connectToDevice = (deviceId: string) => {
    if (!midiAccess) return;

    // Disconnect from any previous device
    midiAccess.inputs.forEach(input => {
      input.onmidimessage = null;
    });

    if (deviceId) {
      const selectedInput = midiAccess.inputs.get(deviceId);
      if (selectedInput) {
        selectedInput.onmidimessage = onMIDIMessage;
        setSelectedDevice(deviceId);
        addToLog({
          timestamp: Date.now(),
          type: 'connection',
          data: [],
          description: `Connected to ${selectedInput.name || 'unnamed device'}`
        });
      }
    } else {
      setSelectedDevice('');
    }
  };

  const onMIDIMessage = (event: WebMidi.MIDIMessageEvent) => {
    const data = Array.from(event.data);

    // Basic MIDI message parsing
    let description = 'Unknown MIDI message';
    const [status, note, velocity] = data;

    // Extract channel (0-15) from status byte
    const channel = status & 0x0F;
    // Extract message type (high 4 bits)
    const messageType = status & 0xF0;

    // Handle note on/off for synthesizer
    if (messageType === 0x90 && velocity > 0) { // Note on
      playNote(note, velocity / 127);
      description = `Note On: ${noteToName(note)} (${note}), Velocity: ${velocity}, Channel: ${channel + 1}`;
    } else if (messageType === 0x80 || (messageType === 0x90 && velocity === 0)) { // Note off
      stopNote(note);
      description = `Note Off: ${noteToName(note)} (${note}), Channel: ${channel + 1}`;
    } else if (messageType === 0xB0) { // Control Change
      description = `Control Change: Controller: ${note}, Value: ${velocity}, Channel: ${channel + 1}`;
    } else if (messageType === 0xC0) { // Program Change
      description = `Program Change: Program: ${note}, Channel: ${channel + 1}`;
    } else if (messageType === 0xE0) { // Pitch Bend
      const bendValue = ((velocity << 7) | note) - 8192;
      description = `Pitch Bend: Value: ${bendValue}, Channel: ${channel + 1}`;
    } else if (messageType === 0xA0) { // Aftertouch
      description = `Aftertouch: Note: ${note}, Pressure: ${velocity}, Channel: ${channel + 1}`;
    } else if (messageType === 0xD0) { // Channel Pressure
      description = `Channel Pressure: Pressure: ${note}, Channel: ${channel + 1}`;
    }

    addToLog({
      timestamp: Date.now(),
      type: 'midi',
      data,
      description
    });
  };

  const addToLog = (log: MIDILog) => {
    setLogs(prevLogs => {
      // Keep only the most recent 100 logs to prevent memory issues
      const newLogs = [log, ...prevLogs];
      return newLogs.slice(0, 100);
    });
  };

  const sendMIDIMessage = (messageType: number, channel: number, data1: number, data2: number) => {
    if (!midiAccess || !selectedDevice) {
      addToLog({
        timestamp: Date.now(),
        type: 'error',
        data: [],
        description: 'No device selected to send MIDI data'
      });
      return false;
    }

    try {
      // Combine message type and channel into status byte
      const statusByte = messageType | (channel & 0x0F);
      const bytes = [statusByte, data1, data2];

      // Send to output port (if available)
      const outputIt = Array.from(midiAccess.outputs.values())
      const output = outputIt.find(o => o.id === selectedDevice);

      if (output) {
        output.send(new Uint8Array(bytes));

        addToLog({
          timestamp: Date.now(),
          type: 'sent',
          data: bytes,
          description: `Sent MIDI message: Type: ${messageType.toString(16).toUpperCase()}, Channel: ${channel + 1}, Data: [${data1}, ${data2}]`
        });
        return true;
      } else {
        addToLog({
          timestamp: Date.now(),
          type: 'error',
          data: bytes,
          description: 'Selected device has no output capability'
        });
        return false;
      }
    } catch (error) {
      addToLog({
        timestamp: Date.now(),
        type: 'error',
        data: [],
        description: `Error sending MIDI data: ${error instanceof Error ? error.message : String(error)}`
      });
      return false;
    }
  };

  // Synthesizer functions with ADSR envelope
  const playNote = (note: number, velocity: number = 0.7) => {
    if (!audioContextRef.current) return;

    // Stop note if it's already playing
    stopNote(note);

    // Create oscillator and gain nodes
    const oscillator = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();

    // Set waveform type from sound settings
    oscillator.type = soundSettings.waveform;

    // Set frequency based on note number (MIDI note to frequency conversion)
    oscillator.frequency.setValueAtTime(
      440 * Math.pow(2, (note - 69) / 12),
      audioContextRef.current.currentTime
    );

    // Initial gain is 0
    gainNode.gain.setValueAtTime(0, audioContextRef.current.currentTime);

    // Apply ADSR envelope
    const now = audioContextRef.current.currentTime;

    // Attack - ramp up from 0 to peak
    gainNode.gain.linearRampToValueAtTime(
      velocity * soundSettings.volume,
      now + soundSettings.attack
    );

    // Decay - ramp down to sustain level
    gainNode.gain.linearRampToValueAtTime(
      velocity * soundSettings.volume * soundSettings.sustain,
      now + soundSettings.attack + soundSettings.decay
    );

    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);
    oscillator.start();

    // Store nodes for later stopping/release
    oscillatorsRef.current[note] = oscillator;
    gainNodesRef.current[note] = gainNode;

    // Update active notes state
    setActiveNotes(prev => ({...prev, [note]: true}));
  };

  const stopNote = (note: number) => {
    const oscillator = oscillatorsRef.current[note];
    const gainNode = gainNodesRef.current[note];

    if (oscillator && gainNode && audioContextRef.current) {
      // Release phase - gradual fade out
      const now = audioContextRef.current.currentTime;
      gainNode.gain.cancelScheduledValues(now);
      gainNode.gain.setValueAtTime(gainNode.gain.value, now);
      gainNode.gain.linearRampToValueAtTime(0, now + soundSettings.release);

      // Stop oscillator after release
      oscillator.stop(now + soundSettings.release);

      // Clean up after release time
      setTimeout(() => {
        delete oscillatorsRef.current[note];
        delete gainNodesRef.current[note];
      }, soundSettings.release * 1000);

      // Update active notes state
      setActiveNotes(prev => {
        const newState = {...prev};
        delete newState[note];
        return newState;
      });
    }
  };

  const clearLogs = () => {
    setLogs([]);
  };

  const noteToName = (noteNumber: number): string => {
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    const octave = Math.floor(noteNumber / 12) - 1;
    const noteName = notes[noteNumber % 12];
    return `${noteName}${octave}`;
  };

  return (
    <div className="app-container">
      <h1>USB MIDI Controller Interface</h1>

      {midiError && <div className="error-message">{midiError}</div>}

      <div className="section">
        <h2>MIDI Devices</h2>
        <div className="device-selector">
          <select
            value={selectedDevice}
            onChange={(e) => connectToDevice(e.target.value)}
          >
            <option value="">-- Select a MIDI device --</option>
            {devices.map(device => (
              <option key={device.id} value={device.id}>
                {device.name} ({device.manufacturer})
              </option>
            ))}
          </select>
          <button onClick={() => updateDeviceList(midiAccess!)}>Refresh Devices</button>
        </div>

        {devices.length === 0 && <p>No MIDI devices detected. Connect a device and click Refresh.</p>}
      </div>

      <div className="section">
        <h2>Sound Generator</h2>
        <SoundGenerator
          settings={soundSettings}
          onSettingsChange={setSoundSettings}
        />
      </div>

      <div className="section">
        <h2>Virtual Keyboard</h2>
        <VirtualKeyboard
          activeNotes={activeNotes}
          playNote={playNote}
          stopNote={stopNote}
        />
        <p className="note">Click keys to test sound or use your MIDI controller</p>
      </div>

      {/* <div className="section">
        <h2>Send Custom MIDI Data</h2>
        <div className="custom-midi">
          <input
            type="text"
            value={customData}
            onChange={(e) => setCustomData(e.target.value)}
            placeholder="Enter hex bytes (e.g., 90 3C 7F)"
          />
          <button onClick={sendCustomMIDIData}>Send</button>
        </div>
        <p className="note">Format: status byte data1 data2 (space separated hex values)</p>
        <p className="note">Example: 90 3C 7F (Note On, C4, velocity 127)</p>
      </div> */}

      <div className="section">
        <h2>MIDI Event Log</h2>
        <button onClick={clearLogs}>Clear Logs</button>
        <div className="log-container">
          {logs.length === 0 ? (
            <p>No MIDI events logged yet.</p>
          ) : (
            <table className="log-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Type</th>
                  <th>Data</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log, index) => (
                  <tr key={index} className={`log-type-${log.type}`}>
                    <td>{new Date(log.timestamp).toLocaleTimeString()}</td>
                    <td>{log.type}</td>
                    <td>{log.data.map(byte => byte.toString(16).padStart(2, '0').toUpperCase()).join(' ')}</td>
                    <td>{log.description}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;
