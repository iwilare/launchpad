<script lang="ts">
  import '../static/app.css';

  import { onMount } from "svelte";
  import MIDINoteMap from "$lib/MIDINoteMap.svelte";
  import SoundGenerator from "$lib/SoundGenerator.svelte";
  import DefaultColorsSettings from "$lib/DefaultColorsSettings.svelte";
  import ThemeToggle from "$lib/ThemeToggle.svelte";
  import GridKeyboard from "$lib/GridKeyboard.svelte";
  import IsomorphicKeyboardGenerator from "$lib/IsomorphicKeyboardGenerator.svelte";
  import DirectKeyboardGenerator from "$lib/DirectKeyboardGenerator.svelte";
  import {
    type Note,
    type NoteMap,
    noteToString,
    isBlackNote,
    DEFAULT_MAPPINGS,
  } from "../types/notes";

  interface SoundSettings {
    volume: number;
    waveform: OscillatorType;
  }

  interface MIDIDevice {
    id: string;
    name: string;
    manufacturer: string;
    state: "connected" | "disconnected";
    connection: "closed" | "open" | "pending";
    type: "input" | "output";
  }

  interface NoteState {
    [key: number]: number; // number of times the note is being pressed
  }

  const addNote = (noteState: NoteState, note: number) => {
    return { ...noteState, [note]: (noteState[note] || 0) + 1 };
  };

  const removeNote = (noteState: NoteState, note: number) => {
    return noteState[note]
      ? { ...noteState, [note]: Math.max(0, noteState[note] - 1) }
      : noteState;
  };

  const isActiveNote = (noteState: NoteState, note: number) => {
    return noteState[note] && noteState[note] > 0;
  };

  const isLastNote = (noteState: NoteState, note: number) => {
    return noteState[note] && noteState[note] == 1;
  };

  interface KeyState {
    [key: Note]: boolean;
  }

  let midiAccess: WebMidi.MIDIAccess | null = null;
  let inputDevices: MIDIDevice[] = [];
  let outputDevices: MIDIDevice[] = [];
  let selectedInputDevice = "";
  let selectedOutputDevice = "";
  let activeNotes: NoteState = {};
  let activeKeys: KeyState = {};
  let showSameNotePressed = true;
  let noteMap: NoteMap = DEFAULT_MAPPINGS;

  let theme: "light" | "dark" = "dark";
  let soundSettings: SoundSettings = {
    volume: 0.2,
    waveform: "square",
  };
  let audioContext: AudioContext | null = null;
  let gainNodes: { [key: Note]: GainNode } = {};
  let oscillators: { [key: Note]: OscillatorNode } = {};
  let colorSettings = {
    whiteRest: 0x4e,
    whitePressed: 0x15,
    blackRest: 0x5f,
    blackPressed: 0x15,
  };

  // Handle theme change
  function handleThemeChange(newTheme: "light" | "dark") {
    theme = newTheme;
    document.documentElement.setAttribute("data-theme", newTheme);
    document.body.setAttribute("data-theme", newTheme);
    localStorage.setItem("theme", newTheme);
  }

  // Initialize theme on component mount
  onMount(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;

    if (savedTheme) {
      theme = savedTheme;
      document.documentElement.setAttribute("data-theme", savedTheme);
      document.body.setAttribute("data-theme", savedTheme);
    } else {
      const isDark = new Date().getHours() >= 18 || new Date().getHours() < 6;
      const initialTheme = isDark ? "dark" : "light";
      theme = initialTheme;
      document.documentElement.setAttribute("data-theme", initialTheme);
      document.body.setAttribute("data-theme", initialTheme);
    }
  });

  onMount(() => {
    const savedNoteMap = sessionStorage.getItem("noteMap");
    noteMap = savedNoteMap ? JSON.parse(savedNoteMap) : DEFAULT_MAPPINGS;
  });

  // Initialize MIDI access and devices
  onMount(() => {
    const init = async () => {
      try {
        audioContext = new (window.AudioContext ||
          (window as any).webkitAudioContext)();

        if (navigator.requestMIDIAccess) {
          const midiAccess = await navigator.requestMIDIAccess({ sysex: true });

          // Get all devices
          const inputs: MIDIDevice[] = [];
          const outputs: MIDIDevice[] = [];

          midiAccess.inputs.forEach((input) => {
            inputs.push(createMIDIDevice(input));
          });

          midiAccess.outputs.forEach((output) => {
            outputs.push(createMIDIDevice(output));
          });

          // Update device lists in reverse order
          inputDevices = [...inputs].reverse();
          outputDevices = [...outputs].reverse();

          // Connect to first available devices
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

          // Listen for device changes
          midiAccess.addEventListener("statechange", () => {
            updateDeviceList(midiAccess);
          });
        }
      } catch (err) {
        console.error("MIDI initialization error:", err);
      }
    };

    init();

    return () => {
      if (audioContext?.state !== "closed") {
        audioContext?.close();
      }
    };
  });

  function updateDeviceList(midiAccess: WebMidi.MIDIAccess) {
    const inputs: MIDIDevice[] = [];
    const outputs: MIDIDevice[] = [];

    midiAccess.inputs.forEach((input) => {
      inputs.push(createMIDIDevice(input));
    });

    midiAccess.outputs.forEach((output) => {
      outputs.push(createMIDIDevice(output));
    });

    inputDevices = [...inputs].reverse();
    outputDevices = [...outputs].reverse();
  }

  function sendMIDIPacket(message: number[]): string | null {
    if (!midiAccess) return "No midi access";
    if (!selectedOutputDevice) return "No device name";

    const output = midiAccess.outputs.get(selectedOutputDevice);
    if (!output) return "No selected output device";

    try {
      output.send(new Uint8Array(message));
      return null;
    } catch (error) {
      return "Try error";
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
      audioContext.currentTime,
    );

    gainNode.gain.setValueAtTime(
      velocity * soundSettings.volume * 0.3,
      audioContext.currentTime,
    );

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

    let description = "Unknown MIDI message";

    const channel = status & 0x0f;
    const messageType = status & 0xf0;

    if (messageType === 0x90 && velocity > 0) {
      controllerPlayNote(note, velocity / 127);
      description = `Note On:  ${noteToString(note)} (${note}), Velocity: ${velocity}, Channel: ${channel + 1}`;
    } else if (
      messageType === 0x80 ||
      (messageType === 0x90 && velocity === 0)
    ) {
      controllerStopNote(note);
      description = `Note Off: ${noteToString(note)} (${note}), Velocity: ${velocity}, Channel: ${channel + 1}`;
    } else if (messageType === 0xb0) {
      description = `Control Change: Controller: ${note}, Value: ${velocity}, Channel: ${channel + 1}`;
    } else if (messageType === 0xc0) {
      description = `Program Change: Program: ${note}, Channel: ${channel + 1}`;
    } else if (messageType === 0xe0) {
      const bendValue = ((velocity << 7) | note) - 8192;
      description = `Pitch Bend: Value: ${bendValue}, Channel: ${channel + 1}`;
    } else if (messageType === 0xa0) {
      description = `Aftertouch: Note: ${note}, Pressure: ${velocity}, Channel: ${channel + 1}`;
    } else if (messageType === 0xd0) {
      description = `Channel Pressure: Pressure: ${note}, Channel: ${channel + 1}`;
    } else {
      console.log(
        "Unrecognized MIDI message type:",
        `0x${messageType.toString(16).toUpperCase()}`,
      );
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
    sessionStorage.setItem("noteMap", JSON.stringify(newNoteMap));
  }

  function synchronizeKeyboardColors() {
    sendAllKeyboardColors(noteMap);
  }

  function propagateDefaultColors() {
    const newNoteMap = { ...noteMap };

    Object.keys(newNoteMap).forEach((noteStr) => {
      const note = parseInt(noteStr);
      const isBlack = isBlackNote(note);

      newNoteMap[note] = {
        ...newNoteMap[note],
        restColor: isBlack ? colorSettings.blackRest : colorSettings.whiteRest,
        pressedColor: isBlack
          ? colorSettings.blackPressed
          : colorSettings.whitePressed,
      };
    });

    setNoteMap(newNoteMap);
  }

  function createMIDIDevice(
    device: WebMidi.MIDIInput | WebMidi.MIDIOutput,
  ): MIDIDevice {
    const state = device.state === "connected" ? "connected" : "disconnected";
    const type = device.type === "input" ? "input" : "output";
    return {
      id: device.id,
      name: device.name || "Unknown Device",
      manufacturer: device.manufacturer || "Unknown",
      state,
      connection: device.connection,
      type,
    };
  }

  function connectToInputDevice(deviceId: string) {
    if (!midiAccess) return;

    midiAccess.inputs.forEach((input) => {
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
    <ThemeToggle onThemeChange={handleThemeChange} />
  </header>
  <div class="section">
    <h3>MIDI Devices</h3>
    <div class="device-selector">
      <div class="device-group">
        <label for="input-device">Input Device:</label>
        <select
          id="input-device"
          value={selectedInputDevice}
          on:change={(e) => {
            const target = e.target as HTMLSelectElement;
            if (target) {
              connectToInputDevice(target.value);
            }
          }}
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
          on:change={(e) => {
            const target = e.target as HTMLSelectElement;
            if (target) {
              connectToOutputDevice(target.value);
            }
          }}
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
        <button on:click={() => updateDeviceList(midiAccess!)}
          >Refresh Devices</button
        >
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
      onSettingsChange={(settings) => (soundSettings = settings)}
    />
  </div>

  <div class="section">
    <h3>Isomorphic Keyboard Layout</h3>
    <IsomorphicKeyboardGenerator onUpdateMapping={setNoteMap} {colorSettings} />
  </div>

  <div class="section">
    <h3>Launchpad Layout</h3>
    <GridKeyboard
      onKeyPress={(k) => controllerPlayNote(k)}
      onKeyRelease={controllerStopNote}
      {setNoteMap}
      {activeNotes}
      {activeKeys}
      {noteMap}
      {showSameNotePressed}
    />
    <p class="launchpad-layout-tooltip">
      Click note label to edit, click pad edges to play, right-click to open
      color picker
    </p>
  </div>

  <div class="section">
    <div class="color-settings-container">
      <h3>Default Colors</h3>
      <DefaultColorsSettings
        {colorSettings}
        onColorSettingsChange={(settings) => (colorSettings = settings)}
        onPropagateColors={propagateDefaultColors}
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
      <MIDINoteMap {noteMap} onUpdateMapping={setNoteMap} />
      <div class="color-controls">
        <button on:click={() => setNoteMap(DEFAULT_MAPPINGS)}
          >Reset Keyboard Layout</button
        >
      </div>
    </div>
  </div>

  <div class="section">
    <h3>Direct Keyboard Layout</h3>
    <DirectKeyboardGenerator onUpdateMapping={setNoteMap} {colorSettings} />
  </div>
</div>

<style>
  .App {
    text-align: center;
    min-height: 100vh;
    min-width: 1000px;
    display: flex;
    flex-direction: column;
    background-color: var(--bg-color);
    color: var(--text-color);
    transition:
      background-color var(--transition-speed),
      color var(--transition-speed);
    width: 45%;
  }

  .App-header {
    background-color: var(--card-bg);
    padding: 15px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    font-size: calc(8px + 1.5vmin);
    color: var(--text-color);
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    position: relative;
    transition:
      background-color var(--transition-speed),
      color var(--transition-speed);
    min-height: 60px;
    margin-bottom: 20px;
    background: linear-gradient(
      135deg,
      var(--card-bg) 0%,
      var(--section-bg) 100%
    );
  }

  h1 {
    margin: 0;
    font-size: 1.4rem;
    font-weight: 500;
    color: var(--text-color);
    transition: color var(--transition-speed);
  }

  h3 {
    margin-top: 0;
    margin-bottom: 15px;
  }

  .section {
    margin-bottom: 30px;
    padding: 15px;
    border: 1px solid var(--border-color);
    border-radius: 5px;
    background-color: var(--section-bg);
    color: var(--text-color);
  }

  .device-selector {
    display: flex;
    flex-direction: row;
    gap: 20px;
    margin-bottom: 15px;
  }

  .device-group {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 5px;
    justify-content: flex-end;
  }

  .device-group label {
    font-weight: bold;
    color: var(--text-color);
  }
  .device-selector {
    display: flex;
    flex-direction: row;
    gap: 20px;
    margin-bottom: 15px;
    align-items: flex-end; /* This aligns all children at the bottom */
  }

  .device-group {
    flex: 1;
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .device-group select {
    flex: 1;
    padding: 8px;
    border: 1px solid var(--border-color);
    border-radius: 4px;
    background-color: var(--select-bg);
    color: var(--text-color);
  }

  .launchpad-layout-tooltip {
    font-size: 12px;
    color: var(--launchpad-layout-tooltip);
    margin-top: 5px;
  }

  @media (max-width: 768px) {
    .device-selector {
      flex-direction: column;
    }

    .App-header h1 {
      font-size: 1.5rem;
    }

    .App {
      width: 100%;
      padding: 0 10px;
    }
  }
</style>
