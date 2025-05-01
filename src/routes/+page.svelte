<script lang="ts">
  import '../static/app.css';

  import { onMount } from "svelte";
  import MIDINoteMap from "$lib/MIDINoteMap.svelte";
  import SoundGenerator from "$lib/SoundGenerator.svelte";
  import DefaultColorsSettings from "$lib/DefaultColorsSettings.svelte";
  import ThemeToggle from "$lib/ThemeToggle.svelte";
  import GridKeyboard from "$lib/GridKeyboard.svelte";
  import IsomorphicKeyboardGenerator from "$lib/IsomorphicKeyboardGenerator.svelte";
  import { type Note, type NoteMap, noteToString, DEFAULT_MAPPINGS, areSameNote, niceNoteMapToNoteMap, noteMapToNiceNoteMapFormat, type Key, type LaunchpadColor, type Controller } from "../types/notes";
  import { applyColorsToMap, colorFromSettings, type NoteState, type ShowSameNote, type SoundSettings, isActiveNote, isLastNote, increaseNoteMut, decreaseNoteMut } from '../types/ui';
  import { emptySoundState, initializeSoundState, pressAudioNote, releaseAudioNote, stopEverythingAudio, type SoundState } from '../types/sound';
  import { browser } from '$app/environment';
  import { SvelteMap } from 'svelte/reactivity';
    
  let midiAccess: MIDIAccess | null = null;
  let selectedInputDevice: string | null = null;
  let selectedOutputDevice: string | null = null;
  let inputDevices: MIDIInput[] = [];
  let outputDevices: MIDIOutput[] = [];

  let showSameNotePressed: ShowSameNote = 'yes';
  let noteMap: NoteMap = DEFAULT_MAPPINGS;
  let activeNotes: NoteState = new SvelteMap();
  let controller: Controller = new SvelteMap();
  
  let theme: "light" | "dark" = "dark";
  let colorSettings = {
    isUniform: true,
    whiteRest: 0x4e,
    whitePressed: 0x15,
    blackRest: 0x5f,
    blackPressed: 0x15,
    uniformRest: 0x4e,
    uniformPressed: 0x15
  };

  let soundState: SoundState = emptySoundState()
  let soundSettings: SoundSettings = {
    volume: 0.5,
    waveform: 'sine',
    enabled: true,
  }

  onMount(() => { 
    soundState = initializeSoundState(); 
  });

  onMount(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    theme = savedTheme ? savedTheme : new Date().getHours() >= 18 || new Date().getHours() < 6 ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", theme);
    document.body.setAttribute("data-theme", theme);
  });

  onMount(() => {
    const savedNoteMap = localStorage.getItem("noteMap");
    if(savedNoteMap) {
      const maybeMap = niceNoteMapToNoteMap(savedNoteMap);
      console.log("SESSION: ", maybeMap, savedNoteMap);
      if(typeof maybeMap !== 'string') {
        noteMap = maybeMap;
      }
    }
  });

  $: if (browser) { localStorage.setItem("noteMap", noteMapToNiceNoteMapFormat(noteMap)); }
  $: if (browser) { localStorage.setItem("showSameNotePressed", showSameNotePressed); }
  $: if (browser) { localStorage.setItem("colorSettings", JSON.stringify(colorSettings)); }
  $: if (browser) { localStorage.setItem("soundSettings", JSON.stringify(soundSettings)); }
  $: if (browser) { localStorage.setItem("theme", theme); }
  $: if (browser) { localStorage.setItem("midiInputDevice", selectedInputDevice ?? ""); }
  $: if (browser) { localStorage.setItem("midiOutputDevice", selectedOutputDevice ?? ""); }
  
  /* MIDI logic */
  function connectToInputDevice(deviceId: string) {
    if (!midiAccess) return 'No midi access to connect to input device';
    const selectedInput = midiAccess.inputs.get(deviceId);
    if (selectedInput) {
      console.log("Connecting to input device", deviceId);
      stopEverything();
      midiAccess.inputs.forEach((input) => {
        input.onmidimessage = null;
      });
      selectedInput.onmidimessage = onMIDIMessage;
      selectedInputDevice = deviceId;
    } else {
      console.log("Requested input device not found", deviceId);
      return 'Requested input device not found';
    }
  }

  function connectToOutputDevice(deviceId: string) {
    if (!midiAccess) return "No midi access";
    const selectedOutput = midiAccess.outputs.get(deviceId);
    if (selectedOutput) {
      stopEverything();
      selectedOutputDevice = deviceId;
      sendAllKeyboardColors();
    } else {
      console.log("Requested output device not found", deviceId);
      return 'Requested output device not found';
    }
  }

  async function initializeMIDIAccess() {
    if (navigator.requestMIDIAccess) {
      midiAccess = await navigator.requestMIDIAccess({ sysex: true });
      if(!midiAccess) {
        return 'Failed to initialize MIDI access';
      }
      function onStateChange() {
        if (!midiAccess) return;

        inputDevices = [...midiAccess.inputs.values()].reverse();
        outputDevices = [...midiAccess.outputs.values()].reverse();

        if (selectedInputDevice === null && inputDevices.length > 0) {
          if(localStorage.getItem("midiInputDevice")) {
            connectToInputDevice(localStorage.getItem("midiInputDevice") as string);
          } else {
            connectToInputDevice(inputDevices[inputDevices.length - 1].id)
          }
        }
        if (selectedOutputDevice === null && outputDevices.length > 0) {
          if(localStorage.getItem("midiOutputDevice")) {
            connectToOutputDevice(localStorage.getItem("midiOutputDevice") as string);
          } else {
            connectToOutputDevice(outputDevices[outputDevices.length - 1].id);
          }
        }
      }
      onStateChange();
      midiAccess.addEventListener("statechange", onStateChange);
    } else {
      return 'MIDI access not supported';
    }
  }

  // Initialize MIDI access and devices
  onMount(() => { initializeMIDIAccess() });

  function handleThemeChange(newTheme: "light" | "dark") {
    theme = newTheme;
    document.documentElement.setAttribute("data-theme", newTheme);
    document.body.setAttribute("data-theme", newTheme);
  }

  function sendMIDIPacket(message: number[]): string | null {
    if (!midiAccess) return "No midi access";
    if (!selectedOutputDevice) return "No selected device";

    const output = midiAccess.outputs.get(selectedOutputDevice);
    if (!output) return "No selected output device";

    try {
      output.send(new Uint8Array(message));
      return null
    } catch (error) {
      return "Could not send MIDI packet";
    }
  }

  function controllerChangeColor(key: Note, isPressed: boolean): string | null {
    console.log("Controller change color", key, isPressed);
    const mapping = noteMap.get(key);
    if (!mapping) return 'No mapping to send color';
    const color = isPressed ? mapping.color.pressed : mapping.color.rest;
    controller.set(key, { active: controller.get(key)?.active ?? false, color });
    return sendMIDIPacket([0x90, key, color]);
  }

  function colorNote(key: Note, isPressed: boolean) {
    const map = noteMap.get(key);
    if (showSameNotePressed === 'yes') {
      noteMap.forEach((otherMap, otherKey) => {
        if (map && map.target == otherMap.target) {
          return controllerChangeColor(otherKey, isPressed);
        }
      });
    } else if (showSameNotePressed === 'octave') {
      noteMap.forEach((otherMap, otherKey) => {
        if (map && areSameNote(map.target, otherMap.target)) {
          return controllerChangeColor(otherKey, isPressed);
        }
      });
    } else {
      return controllerChangeColor(key, isPressed);
    }
  }

  function playKey(key: Key, velocity: number = 1.0) {
    console.log("Playing key", key);
    const map = noteMap.get(key);
    if (!map) throw 'No mapping to play note';
    const k = controller.get(key);
    if (k !== undefined && !k.active) {
      console.log("Playing key, active", key);
      colorNote(key, true);
      controller.set(key, { ...k, active: true });
      increaseNoteMut(activeNotes, map.target);
      pressAudioNote(soundState, soundSettings, map.target, velocity);
    }
  }

  function stopKey(key: Key) {
    const map = noteMap.get(key);
    if (!map) throw 'No mapping to play note';
    const k = controller.get(key);
    if (k !== undefined && k.active) {
      colorNote(key, false);
      controller.set(key, { ...k, active: false });
      decreaseNoteMut(activeNotes, map.target);
      releaseAudioNote(soundState, map.target);
    }
  }

  function onMIDIMessage(event: MIDIMessageEvent) {
    if (!event.data) { return; }

    const [status, note, velocity] = Array.from(event.data);

    let description = "Unknown MIDI message";

    const channel = status & 0x0f;
    const messageType = status & 0xf0;

    if (messageType === 0x90 && velocity > 0) {
      playKey(note, velocity / 127);
      description = `Note On:  ${noteToString(note)} (${note}), Velocity: ${velocity}, Channel: ${channel + 1}`;
    } else if (
      messageType === 0x80 ||
      (messageType === 0x90 && velocity === 0)
    ) {
      stopKey(note);
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
      console.error(
        "Unrecognized MIDI message type:",
        `0x${messageType.toString(16).toUpperCase()}`,
      );
    }
    console.log(description);
  }

  function sendAllKeyboardColors() {
    noteMap.forEach((mapping, note) => {
      controllerChangeColor(note, false);
    });
  }

  function setNoteMap(newNoteMap: NoteMap) {
    noteMap = newNoteMap;
    sendAllKeyboardColors();
    stopEverythingAudio(soundState);
  }

  function stopEverything() {
    stopEverythingAudio(soundState);
    activeNotes.clear();
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
              let str = connectToInputDevice(target.value);
              if (str) { console.error(`Connecting to input device ${target.value} failed: ${str}`); }
              else { console.log(`Selected and connected to input device ${target.value}`); }
            }
          }}
        >
          {#each inputDevices as device}
            <option value={device.id}>{device.name}</option>
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
              let str = connectToOutputDevice(target.value);
              if (str) { console.error(`Connecting to output device ${target.value} failed: ${str}`); }
              else { console.log(`Connected to output device ${target.value}`); }
            }
          }}
        >
          {#each outputDevices as device}
            <option value={device.id}>{device.name}</option>
          {/each}
        </select>
      </div>
      <div class="device-controls">
        <button on:click={() => initializeMIDIAccess()} class="action"
          >Refresh access</button
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
      onSettingsChange={(settings) => {
        stopEverythingAudio(soundState);
        soundSettings = settings
      }}
    />
  </div>

  <div class="section">
    <h3>Isomorphic Keyboard Layout</h3>
    <IsomorphicKeyboardGenerator
       onUpdateMapping={setNoteMap} 
       getNoteColor={(note) => colorFromSettings(colorSettings, note)}
       />
  </div>

  <div class="section">
    <h3>Launchpad Layout</h3>
    <GridKeyboard
      onKeyPress={(k) => playKey(k)}
      onKeyRelease={stopKey}
      {setNoteMap}
      {controller}
      {noteMap}
    />
    <p class="launchpad-layout-tooltip">
      Click note label to edit, click pad edges to play, right-click to open
      color picker
    </p>
  </div>

  <div class="section">
    <h3>Default Colors</h3>
    <DefaultColorsSettings
      {colorSettings}
      onColorSettingsChange={(settings) => {
        (colorSettings = settings)
        setNoteMap(applyColorsToMap(settings, noteMap));
      }}
    />
  </div>

  <div class="section">
    <div class="mapping-container">
      <h3>Settings</h3>
      <div class="settings-controls">
        <div style="display: flex; flex-direction: column; align-items: flex-start; margin-bottom: 10px;">
          <label>
            <input type="radio" name="show-same-note-pressed" checked={showSameNotePressed === 'no'} on:change={() => showSameNotePressed = 'no'} />
            Light up only the physical button
          </label>
          <label>
            <input type="radio" name="show-same-note-pressed" checked={showSameNotePressed === 'yes'} on:change={() => showSameNotePressed = 'yes'} />
            Light up any occurrence of the note
          </label>
          <label>
            <input type="radio" name="show-same-note-pressed" checked={showSameNotePressed === 'octave'} on:change={() => showSameNotePressed = 'octave'} />
            Light up any occurrence of the note in any octave
          </label>
        </div>
      </div>
      <button on:click={sendAllKeyboardColors} class="action" style="margin-left: 24px;">Sync Keyboard</button>
    </div>
  </div>

  <div class="section">
    <MIDINoteMap {noteMap} onUpdateMap={setNoteMap} />
    <button style="margin-top: 10px;" on:click={() => setNoteMap(DEFAULT_MAPPINGS)} class="action"
      >Reset Keyboard Layout</button
    >
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

  .mapping-container {
    display: flex;
    flex-direction: column;
    align-items: center;
  }

  .settings-controls {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 32px;
  }

</style>
