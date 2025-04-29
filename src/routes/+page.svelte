<script lang="ts">
  import { onMount } from 'svelte';
  import MIDINoteMap from '$lib/MIDINoteMap.svelte';
  import SoundGenerator from '$lib/SoundGenerator.svelte';
  import DefaultColorsSettings from '$lib/DefaultColorsSettings.svelte';
  import ThemeToggle from '$lib/ThemeToggle.svelte';
  import GridKeyboard from '$lib/GridKeyboard.svelte';
  import IsomorphicKeyboardGenerator from '$lib/IsomorphicKeyboardGenerator.svelte';
  import DirectKeyboardGenerator from '$lib/DirectKeyboardGenerator.svelte';
  import { type Note, type LaunchpadColor, type NoteMap, noteToString, isBlackNote, DEFAULT_MAPPINGS } from '../types/notes';

interface SoundSettings {
  volume: number;
  waveform: OscillatorType;
}

interface MIDIDevice {
  id: string;
  name: string;
  manufacturer: string;
  state: 'connected' | 'disconnected';
  connection: 'closed' | 'open' | 'pending';
  type: 'input' | 'output';
}

interface NoteState {
  [key: number]: number; // number of times the note is being pressed
}

const addNote = (noteState: NoteState, note: number) => {
  return { ...noteState, [note]: (noteState[note] || 0) + 1 };
}

const removeNote = (noteState: NoteState, note: number) => {
  return noteState[note] ? { ...noteState, [note]: Math.max(0, noteState[note] - 1) } 
                         : noteState
}

const isActiveNote = (noteState: NoteState, note: number) => {
  return noteState[note] && noteState[note] > 0;
}

const isLastNote = (noteState: NoteState, note: number) => {
  return noteState[note] && noteState[note] == 1;
}

interface KeyState {
  [key: Note]: boolean;
}


  interface ColorSettings {
    whiteRest: LaunchpadColor;
    whitePressed: LaunchpadColor;
    blackRest: LaunchpadColor;  
    blackPressed: LaunchpadColor;
  }

  let midiAccess: WebMidi.MIDIAccess | null = null;
  let inputDevices: MIDIDevice[] = [];
  let outputDevices: MIDIDevice[] = [];
  let selectedInputDevice = '';
  let selectedOutputDevice = '';
  let activeNotes: NoteState = {};
  let activeKeys: KeyState = {};
  let showSameNotePressed = true;
  let noteMap: NoteMap = (() => {
    const savedNoteMap = sessionStorage.getItem('noteMap');
    return savedNoteMap ? JSON.parse(savedNoteMap) : DEFAULT_MAPPINGS;
  })();
  let theme: 'light' | 'dark' = 'dark';
  let soundSettings: SoundSettings = {
    volume: 0.20,
    waveform: 'square'
  };
  let audioContext: AudioContext | null = null;
  let gainNodes: {[key: Note]: GainNode} = {};
  let oscillators: {[key: Note]: OscillatorNode} = {};
  let colorSettings: ColorSettings = {
    whiteRest: 0x4E,
    whitePressed: 0x15,
    blackRest: 0x5F,
    blackPressed: 0x15
  };

  function handleThemeChange(newTheme: 'light' | 'dark') {
    theme = newTheme;
    document.documentElement.setAttribute('data-theme', newTheme);
    document.body.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
  }

  onMount(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    
    if (savedTheme) {
      theme = savedTheme;
      document.documentElement.setAttribute('data-theme', savedTheme);
      document.body.setAttribute('data-theme', savedTheme);
    } else {
      const isDark = new Date().getHours() >= 18 || new Date().getHours() < 6;
      const initialTheme = isDark ? 'dark' : 'light';
      theme = initialTheme;
      document.documentElement.setAttribute('data-theme', initialTheme);
      document.body.setAttribute('data-theme', initialTheme);
    }

    initializeMIDI();

    return () => {
      if (audioContext?.state !== 'closed') {
        audioContext?.close();
      }
    };
  });

  async function initializeMIDI() {
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();

      if (navigator.requestMIDIAccess) {
        const midiAccess = await navigator.requestMIDIAccess({ sysex: true });
        
        const inputs: MIDIDevice[] = [];
        const outputs: MIDIDevice[] = [];

        midiAccess.inputs.forEach(input => {
          inputs.push(createMIDIDevice(input));
        });

        midiAccess.outputs.forEach(output => {
          outputs.push(createMIDIDevice(output));
        });

        inputDevices = [...inputs].reverse();
        outputDevices = [...outputs].reverse();

        if (inputs.length > 0) {
          const firstInput = inputs[inputs.length - 1];
          const selectedInput = midiAccess.inputs.get(firstInput.id);
          if (selectedInput) {
            selectedInput.onmidimessage = onMIDIMessage;
            selectedInputDevice = firstInput.id;
          }
        }

        if (outputs.length > 0) {
          const firstOutput = outputs[outputs.length - 1];
          selectedOutputDevice = firstOutput.id;
          synchronizeKeyboardColors();
        }

        midiAccess.addEventListener('statechange', () => {
          updateDeviceList(midiAccess);
        });
      }
    } catch (err) {
      console.error('MIDI initialization error:', err);
    }
  }

  function updateDeviceList(midiAccess: WebMidi.MIDIAccess) {
    const inputs: MIDIDevice[] = [];
    const outputs: MIDIDevice[] = [];

    midiAccess.inputs.forEach(input => {
      inputs.push(createMIDIDevice(input));
    });

    midiAccess.outputs.forEach(output => {
      outputs.push(createMIDIDevice(output));
    });

    inputDevices = [...inputs].reverse();
    outputDevices = [...outputs].reverse();
  }

  function sendMIDIPacket(message: number[]): string | null {
    if (!midiAccess) return 'No midi access';
    if (!selectedOutputDevice) return 'No device name';

    const output = midiAccess.outputs.get(selectedOutputDevice);
    if (!output) return 'No selected output device';

    try {
      output.send(new Uint8Array(message));
      return null;
    } catch (error) {
      return 'Try error';
    }
  }

  function stopAudioNote(note: number) {
    const oscillator = oscillators[note];
    const gainNode = gainNodes[note];

    if (oscillator && gainNode && audioContext) {
      oscillator.stop();
      delete oscillators[note];
      delete gainNodes[note];
    }
  }

  function playAudioNote(note: number, velocity: number = 1.0) {
    if (!audioContext) return;
    stopAudioNote(note);
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.type = soundSettings.waveform;

    oscillator.frequency.setValueAtTime(
      440 * Math.pow(2, (note - 69) / 12),
      audioContext.currentTime
    );

    gainNode.gain.setValueAtTime(velocity * soundSettings.volume * 0.30, audioContext.currentTime);

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.start();

    oscillators[note] = oscillator;
    gainNodes[note] = gainNode;
  }

  function sendColorPacketSingle(key: Note, color: number) {
    if (!midiAccess) return;
    const out = sendMIDIPacket([0x90, key, color]);
    if (out !== null) {
      console.error("Failed to send MIDI packet: ", out);
    }
  }

  function sendColorPacketAllNotes(key: Note, color: number) {
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
  }

  function controllerPlayNote(key: Note, velocity: number = 1.0) {
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
    activeKeys = { ...activeKeys, [key]: true };
    activeNotes = addNote(activeNotes, noteMap[key].target);
  }

  function controllerStopNote(key: Note) {
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
    activeKeys = { ...activeKeys, [key]: false };
    activeNotes = removeNote(activeNotes, noteMap[key].target);
  }

  function onMIDIMessage(event: WebMidi.MIDIMessageEvent) {
    const [status, note, velocity] = Array.from(event.data);
    
    let description = 'Unknown MIDI message';

    const channel = status & 0x0F;
    const messageType = status & 0xF0;

    if (messageType === 0x90 && velocity > 0) {
      controllerPlayNote(note, velocity / 127);
      description = `Note On:  ${noteToString(note)} (${note}), Velocity: ${velocity}, Channel: ${channel + 1}`;
    } else if (messageType === 0x80 || (messageType === 0x90 && velocity === 0)) {
      controllerStopNote(note);
      description = `Note Off: ${noteToString(note)} (${note}), Velocity: ${velocity}, Channel: ${channel + 1}`;
    } else if (messageType === 0xB0) {
      description = `Control Change: Controller: ${note}, Value: ${velocity}, Channel: ${channel + 1}`;
    } else if (messageType === 0xC0) {
      description = `Program Change: Program: ${note}, Channel: ${channel + 1}`;
    } else if (messageType === 0xE0) {
      const bendValue = ((velocity << 7) | note) - 8192;
      description = `Pitch Bend: Value: ${bendValue}, Channel: ${channel + 1}`;
    } else if (messageType === 0xA0) {
      description = `Aftertouch: Note: ${note}, Pressure: ${velocity}, Channel: ${channel + 1}`;
    } else if (messageType === 0xD0) {
      description = `Channel Pressure: Pressure: ${note}, Channel: ${channel + 1}`;
    } else {
      console.log('Unrecognized MIDI message type:', `0x${messageType.toString(16).toUpperCase()}`);
    }

    console.log(description);
  }

  function sendAllKeyboardColors(map: NoteMap) {
    Object.entries(map).forEach(([note, mapping]) => {
      sendMIDIPacket([0x90, parseInt(note), mapping.restColor]);
    });
  }

  function setNoteMap(newNoteMap: NoteMap) {
    noteMap = newNoteMap;
    sendAllKeyboardColors(newNoteMap);
    sessionStorage.setItem('noteMap', JSON.stringify(newNoteMap));
  }

  function synchronizeKeyboardColors() {
    sendAllKeyboardColors(noteMap);
  }

  function propagateDefaultColors() {
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
  }

  function createMIDIDevice(device: WebMidi.MIDIInput | WebMidi.MIDIOutput): MIDIDevice {
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
  }

  function connectToInputDevice(deviceId: string) {
    if (!midiAccess) return;
    
    midiAccess.inputs.forEach(input => {
      input.onmidimessage = null;
    });

    const selectedInput = midiAccess.inputs.get(deviceId);
    if (selectedInput) {
      selectedInput.onmidimessage = onMIDIMessage;
      selectedInputDevice = deviceId;
    }
  }

  function connectToOutputDevice(deviceId: string) {
    if (!midiAccess) return;
    
    selectedOutputDevice = deviceId;
    const selectedOutput = midiAccess.outputs.get(deviceId);
    if (selectedOutput) {
      synchronizeKeyboardColors();
    }
  }
</script>

<div class="App" data-theme={theme}>
  <header class="App-header">
    <h1>MIDI Controller</h1>
    <ThemeToggle theme={theme} on:themeChange={(e) => handleThemeChange(e.detail)} />
  </header>
  <div class="section">
    <h3>MIDI Devices</h3>
    <div class="device-selector">
      <div class="device-group">
        <label for="input-device">Input Device:</label>
        <select
          id="input-device"
          value={selectedInputDevice}
          on:change={(e) => connectToInputDevice((e.target as HTMLSelectElement).value)}
        >
          <option value="">-- Select an input device --</option>
          {#each inputDevices as device}
            <option value={device.id}>
              {device.name} ({device.manufacturer})
            </option>
          {/each}
        </select>
      </div>
      <div class="device-group">
        <label for="output-device">Output Device:</label>
        <select
          id="output-device"
          value={selectedOutputDevice}
          on:change={(e) => connectToOutputDevice((e.target as HTMLSelectElement).value)}
        >
          <option value="">-- Select an output device --</option>
          {#each outputDevices as device}
            <option value={device.id}>
              {device.name} ({device.manufacturer})
            </option>
          {/each}
        </select>
      </div>
      <div class="device-controls">
        <button on:click={() => updateDeviceList(midiAccess!)}>Refresh Devices</button>
      </div>
    </div>

    {#if inputDevices.length === 0 && outputDevices.length === 0}
      <p>No MIDI devices detected. Connect a device and click Refresh.</p>
    {/if}
  </div>

  <div class="section">
    <h3>Sound Generator</h3>
    <SoundGenerator
      settings={soundSettings}
      onSettingsChange={(newSettings) => soundSettings = newSettings}
    />
  </div>

  <div class="section">
    <h3>Isomorphic Keyboard Layout</h3>
    <IsomorphicKeyboardGenerator 
      on:updateMapping={(e) => setNoteMap(e.detail)}
      onNotePress={(note) => controllerPlayNote(note)}
      onNoteRelease={(note) => controllerStopNote(note)}
    />
  </div>

  <div class="section">
    <h3>Launchpad Layout</h3>
    <GridKeyboard
      on:keyPress={(e) => controllerPlayNote(e.detail)}
      on:keyRelease={(e) => controllerStopNote(e.detail)}
      on:updateMapping={(e) => setNoteMap(e.detail)}
      onNotePress={(note) => controllerPlayNote(note)}
      onNoteRelease={(note) => controllerStopNote(note)}
    />
    <p class="note">Click note label to edit, click pad edges to play, right-click to open color picker</p>
  </div>

  <div class="section">
    <div class="color-settings-container">
      <h3>Default Colors</h3>
      <DefaultColorsSettings
        settings={colorSettings}
        on:colorSettingsChange={(e) => colorSettings = e.detail}
        on:propagateColors={propagateDefaultColors}
      />
    </div>
  </div>
  
  <div class="section">
    <div class="mapping-container">
      <h3>Settings</h3>
      <div class="color-controls">
        <label>
          <input type="checkbox" bind:checked={showSameNotePressed} />
          Show same note pressed
        </label>
      </div>
      <div class="color-controls">
        <button on:click={synchronizeKeyboardColors}>Sync Keyboard</button>
      </div>
    </div>
  </div>

  <div class="section">
    <div class="mapping-container">
      <MIDINoteMap
        {noteMap}
        on:updateMapping={(e) => setNoteMap(e.detail)}
      />
      <div class="color-controls">
        <button on:click={() => setNoteMap(DEFAULT_MAPPINGS)}>Reset Keyboard Layout</button>
      </div>
    </div>
  </div>
  
  <div class="section">
    <h3>Direct Keyboard Layout</h3>
    <DirectKeyboardGenerator 
      on:updateMapping={(e) => setNoteMap(e.detail)}
      noteMap={noteMap}
      onNotePress={(note) => controllerPlayNote(note)}
      onNoteRelease={(note) => controllerStopNote(note)}
    />
  </div>
</div>

<style>
  .App {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen,
      Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
    text-align: center;
    padding: 20px;
    min-height: 100vh;
    transition: background-color 0.3s ease, color 0.3s ease;
  }

  .App[data-theme="dark"] {
    background-color: #1a1a1a;
    color: #ffffff;
  }

  .App[data-theme="light"] {
    background-color: #ffffff;
    color: #333333;
  }

  .App-header {
    margin-bottom: 2rem;
  }

  .section {
    background: var(--bg-secondary);
    padding: 1.5rem;
    border-radius: 8px;
    margin-bottom: 1.5rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }

  .device-selector {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .device-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .device-group label {
    font-weight: bold;
  }

  .device-group select {
    padding: 0.5rem;
    border-radius: 4px;
    border: 1px solid var(--border-color);
    background: var(--bg-primary);
    color: var(--text-primary);
  }

  .device-controls {
    margin-top: 1rem;
  }

  button {
    padding: 0.5rem 1rem;
    background: var(--accent-color);
    color: var(--text-on-accent);
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-weight: bold;
    transition: background-color 0.2s;
  }

  button:hover {
    background: var(--accent-color-hover);
  }

  .note {
    font-size: 0.9rem;
    color: var(--text-secondary);
    margin-top: 0.5rem;
  }

  .color-settings-container {
    background: var(--bg-secondary);
    padding: 1rem;
    border-radius: 8px;
  }

  .mapping-container {
    background: var(--bg-secondary);
    padding: 1rem;
    border-radius: 8px;
  }

  .color-controls {
    margin-top: 1rem;
  }

  .color-controls label {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .color-controls input[type="checkbox"] {
    width: 1rem;
    height: 1rem;
  }
</style>
