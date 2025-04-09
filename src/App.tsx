// src/App.tsx
import React, { useEffect, useState, useRef } from 'react';
import './App.css';
import MIDINoteMap from './components/MIDINoteMap';
import SoundGenerator from './components/SoundGenerator';
import DefaultColorsSettings from './components/DefaultColorsSettings';
import ThemeToggle from './components/ThemeToggle';
import GridKeyboard from './components/GridKeyboard';
import IsomorphicKeyboardGenerator from './components/IsomorphicKeyboardGenerator';
import { addNote, isActiveNote, isLastNote, KeyState, MIDIDevice, NoteState, removeNote, SoundSettings } from './types';
import { Note, LaunchpadColor, NoteMap, noteToString, isBlackNote, DEFAULT_MAPPINGS } from './types/notes';
import DirectKeyboardGenerator from './components/DirectKeyboardGenerator';

interface ColorSettings {
  whiteRest: LaunchpadColor;
  whitePressed: LaunchpadColor;
  blackRest: LaunchpadColor;  
  blackPressed: LaunchpadColor;
}

const App: React.FC = () => {
  const [midiAccess, setMidiAccess] = useState<WebMidi.MIDIAccess | null>(null);
  const [inputDevices, setInputDevices] = useState<MIDIDevice[]>([]);
  const [outputDevices, setOutputDevices] = useState<MIDIDevice[]>([]);
  const [selectedInputDevice, setSelectedInputDevice] = useState<string>('');
  const [selectedOutputDevice, setSelectedOutputDevice] = useState<string>('');
  const [activeNotes, setActiveNotes] = useState<NoteState>({});
  const [activeKeys, setActiveKeys] = useState<KeyState>({});
  const [showSameNotePressed, setshowSameNotePressed] = useState<boolean>(true);
  const [noteMap, setNoteMapWithoutSync] = useState<NoteMap>(() => {
    // Try to load noteMap from sessionStorage
    const savedNoteMap = sessionStorage.getItem('noteMap');
    return savedNoteMap ? JSON.parse(savedNoteMap) : DEFAULT_MAPPINGS;
  });
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [soundSettings, setSoundSettings] = useState<SoundSettings>({
    volume: 0.20,
    waveform: 'square'
  });
  const audioContextRef = useRef<AudioContext | null>(null);
  const gainNodesRef = useRef<{[key: Note]: GainNode}>({});
  const oscillatorsRef = useRef<{[key: Note]: OscillatorNode}>({});
  const [colorSettings, setColorSettings] = useState<ColorSettings>({
    whiteRest: 0x4E,
    whitePressed: 0x15,
    blackRest: 0x5F,
    blackPressed: 0x15
  });

  // Handle theme change
  const handleThemeChange = (newTheme: 'light' | 'dark') => {
    setTheme(newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
    document.body.setAttribute('data-theme', newTheme);
    // Save theme preference to localStorage
    localStorage.setItem('theme', newTheme);
  };

  // Initialize theme on component mount
  useEffect(() => {
    // Check if theme is saved in localStorage
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    
    if (savedTheme) {
      // Use saved theme if available
      setTheme(savedTheme);
      document.documentElement.setAttribute('data-theme', savedTheme);
      document.body.setAttribute('data-theme', savedTheme);
    } else {
      // Otherwise use time-based theme
      const isDark = new Date().getHours() >= 18 || new Date().getHours() < 6;
      const initialTheme = isDark ? 'dark' : 'light';
      setTheme(initialTheme);
      document.documentElement.setAttribute('data-theme', initialTheme);
      document.body.setAttribute('data-theme', initialTheme);
    }
  }, []);

  // Initialize MIDI access and devices
  useEffect(() => {
    let isMounted = true;

    const initializeMIDI = async () => {
    try {
      // Initialize Web Audio API
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();

      // Request MIDI access
      if (navigator.requestMIDIAccess) {
        const midiAccess = await navigator.requestMIDIAccess({ sysex: true });
        if (!isMounted) return;
        
        // Get all devices
        const inputs: MIDIDevice[] = [];
        const outputs: MIDIDevice[] = [];

        setMidiAccess(midiAccess);

        midiAccess.inputs.forEach(input => {
          inputs.push(createMIDIDevice(input));
        });

        midiAccess.outputs.forEach(output => {
          outputs.push(createMIDIDevice(output));
        });

        // Update device lists in reverse order to pick the correct device
        setInputDevices([...inputs].reverse());
        setOutputDevices([...outputs].reverse());

        // Connect to first available devices
        if (inputs.length > 0) {
          const firstInput = inputs[inputs.length - 1]; // Get the last device
          const selectedInput = midiAccess.inputs.get(firstInput.id);
          if (selectedInput) {
            selectedInput.onmidimessage = onMIDIMessage;
            setSelectedInputDevice(firstInput.id);
          }
        }

        if (outputs.length > 0) {
          const firstOutput = outputs[outputs.length - 1]; // Get the last device
          setSelectedOutputDevice(firstOutput.id);
          // Initialize keys after connecting
          synchronizeKeyboardColors();
        }

        // Listen for device changes
        midiAccess.addEventListener('statechange', () => {
          if (isMounted) {
            updateDeviceList(midiAccess);
          } else {
            console.error("MIDI access not mounted");
          }
        });
      }
    } catch (err) {
      if (isMounted) {
        console.error('MIDI initialization error:', err);
      }
    }
    };

    initializeMIDI();

    return () => {
      isMounted = false;
      if (audioContextRef.current?.state !== 'closed') {
        audioContextRef.current?.close();
      }
    };
  }, []);

  const updateDeviceList = (midiAccess: WebMidi.MIDIAccess) => {
    const inputs: MIDIDevice[] = [];
    const outputs: MIDIDevice[] = [];

    midiAccess.inputs.forEach(input => {
      inputs.push(createMIDIDevice(input));
    });

    midiAccess.outputs.forEach(output => {
      outputs.push(createMIDIDevice(output));
    });

    // Update device lists in reverse order
    setInputDevices([...inputs].reverse());
    setOutputDevices([...outputs].reverse());
  };

  const sendMIDIPacket = React.useCallback((message: number[]): string | null => {
    if (!midiAccess) return 'No midi access';

    if(!selectedOutputDevice) return 'No device name';

    const output = midiAccess.outputs.get(selectedOutputDevice);
    if (!output) return 'No selected output device';

    try {
      output.send(new Uint8Array(message));
      return null;
    } catch (error) {
      return 'Try error';
    }
  }, [midiAccess, selectedOutputDevice]);

  const stopAudioNote = React.useCallback((note: number) => {
    const oscillator = oscillatorsRef.current[note];
    const gainNode = gainNodesRef.current[note];

    if (oscillator && gainNode && audioContextRef.current) {
      oscillator.stop();
      delete oscillatorsRef.current[note];
      delete gainNodesRef.current[note];
    }
  }, []);

  const playAudioNote = React.useCallback((note: number, velocity: number = 1.0) => {
    if (!audioContextRef.current) return;
    stopAudioNote(note);
    const oscillator = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();

    oscillator.type = soundSettings.waveform;

    oscillator.frequency.setValueAtTime(
      440 * Math.pow(2, (note - 69) / 12),
      audioContextRef.current.currentTime
    );

    // TODO: Arbitrary multiplier to make the note quieter
    gainNode.gain.setValueAtTime(velocity * soundSettings.volume * 0.30, audioContextRef.current.currentTime);

    // Connect nodes
    oscillator.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);

    // Start the oscillator
    oscillator.start();

    // Store references
    oscillatorsRef.current[note] = oscillator;
    gainNodesRef.current[note] = gainNode;
  }, [soundSettings, stopAudioNote]);

  const sendColorPacketSingle = React.useCallback((key: Note, color: number) => {
    if (!midiAccess) return;
    const out = sendMIDIPacket([0x90, key, color]);
    if(out !== null) {
      console.error("Failed to send MIDI packet: ", out);
    }
  }, [midiAccess]);

  const sendColorPacketAllNotes = React.useCallback((key: Note, color: number) => {
    if (!midiAccess) return;
    Object.entries(noteMap).forEach(([otherKeyAsForcedString, mapping]) => {
      const otherKey = parseInt(otherKeyAsForcedString);
      if (mapping.target === noteMap[key].target) {
        const out = sendMIDIPacket([0x90, otherKey, color]);
        if (out !== null) {
          console.error("Failed to send MIDI packet: ", out);
        }
      }
    });
  }, [noteMap, midiAccess]);

  // Function to handle note press/release
  const controllerPlayNote = React.useCallback((key: Note, velocity: number = 1.0) => {
    if (showSameNotePressed) {
      if (!isActiveNote(activeNotes, noteMap[key].target)) {
        playAudioNote(noteMap[key].target, velocity);
        sendColorPacketAllNotes(key, noteMap[key].pressedColor);
      }
    } else {
      if (!isActiveNote(activeNotes, noteMap[key].target)) {
        playAudioNote(noteMap[key].target, velocity);
      }
      sendColorPacketSingle(key, noteMap[key].pressedColor);
    }
    setActiveKeys(p => ({ ...p, [key]: true }));
    setActiveNotes(p => addNote(p, noteMap[key].target));
  }, [noteMap, activeKeys, activeNotes, showSameNotePressed, playAudioNote, sendMIDIPacket]);
  
  const controllerStopNote = React.useCallback((key: Note) => {
    if (showSameNotePressed) {
      if (isLastNote(activeNotes, noteMap[key].target)) {
        stopAudioNote(noteMap[key].target);
        sendColorPacketAllNotes(key, noteMap[key].restColor);
      }
    } else {
      if (isLastNote(activeNotes, noteMap[key].target)) {
        stopAudioNote(noteMap[key].target);
      }
      sendColorPacketSingle(key, noteMap[key].restColor);
    }
    setActiveKeys(p => ({ ...p, [key]: false }));
    setActiveNotes(p => removeNote(p, noteMap[key].target));
  }, [noteMap, activeKeys, activeNotes, showSameNotePressed, stopAudioNote, sendMIDIPacket]);

  const onMIDIMessage = React.useCallback((event: WebMidi.MIDIMessageEvent) => {
    const [status, note, velocity] = Array.from(event.data);
    
    let description = 'Unknown MIDI message';

    // Extract channel (0-15) from status byte
    const channel = status & 0x0F;
    // Extract message type (high 4 bits)
    const messageType = status & 0xF0;

    // Handle note on/off for synthesizer
    if (messageType === 0x90 && velocity > 0) { // Note on
      controllerPlayNote(note, velocity / 127);
      description = `Note On:  ${noteToString(note)} (${note}), Velocity: ${velocity}, Channel: ${channel + 1}`;
    } else if (messageType === 0x80 || (messageType === 0x90 && velocity === 0)) { // Note off
      controllerStopNote(note);
      description = `Note Off: ${noteToString(note)} (${note}), Velocity: ${velocity}, Channel: ${channel + 1}`;
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
    } else {
      // Log unrecognized message types
      console.log('Unrecognized MIDI message type:', `0x${messageType.toString(16).toUpperCase()}`);
    }

    console.log(description);
  }, [controllerPlayNote, controllerStopNote]);

  // Function to synchronize keyboard colors with MIDI note map
  const sendAllKeyboardColors = (map: NoteMap) => {
    Object.entries(map).forEach(([note, mapping]) => {
      sendMIDIPacket([0x90, parseInt(note), mapping.restColor]);
    });
  };

  const setNoteMap = (newNoteMap: NoteMap) => {
    setNoteMapWithoutSync(newNoteMap);
    sendAllKeyboardColors(newNoteMap);
    // Save to sessionStorage
    sessionStorage.setItem('noteMap', JSON.stringify(newNoteMap));
  };

  const synchronizeKeyboardColors = () => {
    sendAllKeyboardColors(noteMap);
  };

  // Update the propagateDefaultColors function to use colorSettings
  const propagateDefaultColors = React.useCallback(() => {
    const newNoteMap = { ...noteMap };
    
    Object.keys(newNoteMap).forEach(noteStr => {
      const note = parseInt(noteStr);
      const isBlack = isBlackNote(note);
      
      newNoteMap[note] = {
        ...newNoteMap[note],
        restColor: isBlack ? colorSettings.blackRest : colorSettings.whiteRest,
        pressedColor: isBlack ? colorSettings.blackPressed : colorSettings.whitePressed
      };
    });
    
    setNoteMap(newNoteMap);
  }, [noteMap, colorSettings]);

  // Fix the MIDI device creation
  const createMIDIDevice = (device: WebMidi.MIDIInput | WebMidi.MIDIOutput): MIDIDevice => {
    const state = device.state === 'connected' ? 'connected' : 'disconnected';
    const type = device.type === 'input' ? 'input' : 'output';
    return {
      id: device.id,
      name: device.name || 'Unknown Device',
      manufacturer: device.manufacturer || 'Unknown',
      state,
      connection: device.connection,
      type
    };
  };

  const connectToInputDevice = React.useCallback((deviceId: string) => {
    if (!midiAccess) return;
    
    // Disconnect from any previous device
    midiAccess.inputs.forEach(input => {
      input.onmidimessage = null;
    });

    const selectedInput = midiAccess.inputs.get(deviceId);
    if (selectedInput) {
      selectedInput.onmidimessage = onMIDIMessage;
      setSelectedInputDevice(deviceId);
    }
  }, [midiAccess, onMIDIMessage]);

  // Add an effect to reconnect when noteMap changes
  useEffect(() => {
    if (selectedInputDevice) {
      connectToInputDevice(selectedInputDevice);
    }
  }, [selectedInputDevice, connectToInputDevice, noteMap]);

  const connectToOutputDevice = (deviceId: string) => {
    if (!midiAccess) return;
    
    setSelectedOutputDevice(deviceId);
    const selectedOutput = midiAccess.outputs.get(deviceId);
    if (selectedOutput) {
      synchronizeKeyboardColors();
    }
  };

  return (
    <div className="App" data-theme={theme}>
      <header className="App-header">
        <h1>MIDI Controller</h1>
        <ThemeToggle onThemeChange={handleThemeChange} />
      </header>
      <div className="section">
        <h3>MIDI Devices</h3>
        <div className="device-selector">
          <div className="device-group">
            <label>Input Device:</label>
            <select
              value={selectedInputDevice}
              onChange={(e) => connectToInputDevice(e.target.value)}
            >
              <option value="">-- Select an input device --</option>
              {inputDevices.map(device => (
                <option key={device.id} value={device.id}>
                  {device.name} ({device.manufacturer})
                </option>
              ))}
            </select>
          </div>
          <div className="device-group">
            <label>Output Device:</label>
            <select
              value={selectedOutputDevice}
              onChange={(e) => connectToOutputDevice(e.target.value)}
            >
              <option value="">-- Select an output device --</option>
              {outputDevices.map(device => (
                <option key={device.id} value={device.id}>
                  {device.name} ({device.manufacturer})
                </option>
              ))}
            </select>
          </div>
          <div className="device-controls">
            <button onClick={() => updateDeviceList(midiAccess!)}>Refresh Devices</button>
          </div>
        </div>

        {inputDevices.length === 0 && outputDevices.length === 0 && (
          <p>No MIDI devices detected. Connect a device and click Refresh.</p>
        )}
      </div>

      <div className="section">
        <h3>Sound Generator</h3>
        <SoundGenerator
          settings={soundSettings}
          onSettingsChange={setSoundSettings}
        />
      </div>

      <div className="section">
        <h3>Isomorphic Keyboard Layout</h3>
        <IsomorphicKeyboardGenerator 
          onUpdateMapping={setNoteMap}
          colorSettings={colorSettings}
        />
      </div>

      <div className="section">
        <h3>Launchpad Layout</h3>
        <GridKeyboard
          onKeyPress={(k) => controllerPlayNote(k)}
          onKeyRelease={controllerStopNote}
          setNoteMap={setNoteMap}
          activeNotes={activeNotes}
          activeKeys={activeKeys}
          noteMap={noteMap}
          showSameNotePressed={showSameNotePressed}
        />
        <p className="note">Click note label to edit, click pad edges to play, right-click to open color picker</p>
      </div>

      <div className="section">
        <div className="color-settings-container">
          <h3>Default Colors</h3>
          <DefaultColorsSettings
            colorSettings={colorSettings}
            onColorSettingsChange={setColorSettings}
            onPropagateColors={propagateDefaultColors}
          />
        </div>
      </div>
      
      <div className="section">
        <div className="mapping-container">
          <h3>Settings</h3>
          <div className="color-controls">
            <label>
              <input type="checkbox" checked={showSameNotePressed} 
                     onChange={() => setshowSameNotePressed(!showSameNotePressed)} />
              Show same note pressed
            </label>
            </div>
          <div className="color-controls">
            <button onClick={synchronizeKeyboardColors}> Sync Keyboard </button>
          </div>
        </div>
      </div>

      <div className="section">
        <div className="mapping-container">
          <MIDINoteMap
            noteMap={noteMap}
            onUpdateMapping={setNoteMap}
          />
          <div className="color-controls">
            <button onClick={() => setNoteMap(DEFAULT_MAPPINGS)}> Reset Keyboard Layout </button>
          </div>
        </div>
      </div>
      
      <div className="section">
        <h3>Direct Keyboard Layout</h3>
        <DirectKeyboardGenerator 
          onUpdateMapping={setNoteMap}
          colorSettings={colorSettings}
        />
      </div>
    </div>
  );
};

export default App;
