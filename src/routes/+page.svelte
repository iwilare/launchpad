<script lang="ts">
  import "../static/app.css";

  import { onMount } from "svelte";
  import MIDINoteMap from "$lib/MIDINoteMap.svelte";
  import SoundGenerator from "$lib/SoundGenerator.svelte";
  import DefaultColorsSettings from "$lib/DefaultColorsSettings.svelte";
  import ThemeToggle from "$lib/ThemeToggle.svelte";
  import GridKeyboard from "$lib/GridKeyboard.svelte";
  import IsomorphicKeyboardGenerator from "$lib/IsomorphicKeyboardGenerator.svelte";
  import { type Note, type NoteMap, noteToString, DEFAULT_MAPPINGS, noteMapToNiceNoteMapFormat, type Key, type LaunchpadColor, type Controller, areSameNote, niceNoteMapToNoteMap, } from "../types/notes";
  import { applyColorsToMap, colorFromSettings, type NoteState, type ShowSameNote, type SoundSettings, isActiveNote, isLastNote, increaseNoteMut, decreaseNoteMut, type ColorSettings, } from "../types/ui";
  import { emptySoundState, initializeSoundState, pressNoteAudioSynth, releaseNoteAudioSynth, stopEverythingAudioSynth, type SoundState, } from "../types/sound";
  import { SvelteMap } from "svelte/reactivity";

  let midiAccess: MIDIAccess | null = null;
  let selectedInputDevice: string | null = null;
  let selectedColorDevice: string | null = null;
  let selectedOutputDevice: string | 42 | null = null;
  let inputDevices: MIDIInput[] = [];
  let outputDevices: MIDIOutput[] = [];

  let showSameNotePressed: ShowSameNote = "yes";
  let noteMap: NoteMap = DEFAULT_MAPPINGS;

  let activeNotes: NoteState = new SvelteMap();
  let controller: Controller = new SvelteMap();

  let theme: "light" | "dark" = "dark";
  let colorSettings: ColorSettings = {
    singleColor: true,
    whiteRest: 0x4e,
    whitePressed: 0x15,
    blackRest: 0x5f,
    blackPressed: 0x15
  };

  let soundState: SoundState = emptySoundState();
  let soundSettings: SoundSettings = {
    volume: 0.5,
    waveform: "sine"
  };

  onMount(() => {
    soundState = initializeSoundState();
  });

  onMount(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    theme = savedTheme
      ? savedTheme
      : new Date().getHours() >= 18 || new Date().getHours() < 6
        ? "dark"
        : "light";
    document.documentElement.setAttribute("data-theme", theme);
    document.body.setAttribute("data-theme", theme);
  });

  onMount(() => {
    const savedNoteMap = localStorage.getItem("noteMap");
    if (savedNoteMap) {
      const maybeMap = niceNoteMapToNoteMap(savedNoteMap);
      if (typeof maybeMap !== "string") {
        noteMap = maybeMap;
      }
    }
  });

  /* MIDI logic */
  function connectToInputDevice(deviceId: string) {
    if (!midiAccess) { 
      console.error("No midi access to connect to input device");
      return "No midi access to connect to input device";
    }
    const selectedInput = midiAccess.inputs.get(deviceId);
    if (selectedInput) {
      console.log("Connecting to input device", deviceId);
      stopEverythingAudio();
      midiAccess.inputs.forEach((input) => {
        input.onmidimessage = null;
      });
      selectedInput.onmidimessage = onMIDIMessage;
      selectedInputDevice = deviceId;
      localStorage.setItem("midiInputDevice", selectedInputDevice);
    } else {
      console.error("Requested input device not found", deviceId);
      return "Requested input device not found";
    }
  }

  function connectToColorDevice(deviceId: string) {
    if (!midiAccess) {
      console.error("No midi access to connect to color device");
      return "No midi access to connect to color device";
    }
    const selectedColor = midiAccess.outputs.get(deviceId);
    if (selectedColor) {
      console.log("Connecting to color device", deviceId);
      selectedColorDevice = deviceId;
      sendAllKeyboardColors();
      localStorage.setItem("midiColorDevice", selectedColorDevice);
    } else {
      console.error("Requested color device not found", deviceId);
      return "Requested color device not found";
    }
  }

  function connectToOutputDevice(deviceId: string | 42) {
    if(typeof deviceId === 'string') {
      if (!midiAccess) { 
        console.error("No midi access to connect to output device");
        return "No midi access to connect to output device";
      }
      const selectedColor = midiAccess.outputs.get(deviceId);
      if (selectedColor) {
        console.log("Connecting to output device", deviceId);
        stopEverythingAudio();
        selectedOutputDevice = deviceId;
        localStorage.setItem("midiOutputDevice", selectedOutputDevice);
      } else {
        console.error("Requested output device not found", deviceId);
        return "Requested output device not found";
      }
    } else {
      selectedOutputDevice = 42;
      console.log("Connecting to default output device");
      localStorage.setItem("midiOutputDevice", 'default');
      return;
    }
  }

  async function initializeMIDIAccess() {
    if (navigator.requestMIDIAccess) {
      midiAccess = await navigator.requestMIDIAccess({ sysex: true });
      if (!midiAccess) {
        return "Failed to initialize MIDI access";
      }
      function onMIDIStateChange() {
        if (!midiAccess) return;

        console.log("MIDI state change");

        inputDevices = [...midiAccess.inputs.values()].reverse();
        outputDevices = [...midiAccess.outputs.values()].reverse();

        if (selectedInputDevice === null && inputDevices.length > 0) {
          if (localStorage.getItem("midiInputDevice")) {
            connectToInputDevice(localStorage.getItem("midiInputDevice") as string);
          } else {
            connectToInputDevice(inputDevices[inputDevices.length - 1].id);
          }
        }
        if (selectedColorDevice === null && outputDevices.length > 0) {
          if (localStorage.getItem("midiColorDevice")) {
            connectToColorDevice(localStorage.getItem("midiColorDevice") as string);
          } else {
            connectToColorDevice(outputDevices[outputDevices.length - 1].id);
          }
        }
        if (selectedOutputDevice === null) {
          const output = localStorage.getItem("midiOutputDevice")
          if (output) {
            connectToOutputDevice(output === 'default' ? 42 : output);
          }
        }
      }
      onMIDIStateChange();
      midiAccess.addEventListener("statechange", onMIDIStateChange);
    } else {
      return "MIDI access not supported";
    }
  }

  // Initialize MIDI access and devices
  onMount(() => {
    initializeMIDIAccess();
  });

  function handleThemeChange(newTheme: "light" | "dark") {
    theme = newTheme;
    document.documentElement.setAttribute("data-theme", newTheme);
    document.body.setAttribute("data-theme", newTheme);
  }

  function sendMIDIPacket(deviceId: string, message: number[]): string | null {
    if (!midiAccess) return "No midi access";
    const output = midiAccess.outputs.get(deviceId);
    if (!output) return "No selected device when trying to send packet";
    try {
      output.send(new Uint8Array(message));
      return null;
    } catch (error) {
      return "Could not send MIDI packet";
    }
  }

  function controllerChangeColor(key: Note, isPressed: boolean): string | null {
    const mapping = noteMap.get(key);
    if (!mapping) return "No mapping to send color";
    const color = isPressed ? mapping.color.pressed : mapping.color.rest;
    controller.set(key, {
      active: controller.get(key)?.active ?? false,
      color,
    });
    if (selectedColorDevice) {
      return sendMIDIPacket(selectedColorDevice, [0x90, key, color]);
    } else {
      console.error("No selected color device");
      return null;
    }
  }

  function handleNoteColor(key: Note, isPressed: boolean) {
    const map = noteMap.get(key);
    if (!map) return;
    if (showSameNotePressed === "yes") {
      const wouldBeAffectedNotes = activeNotes.get(map.target) ?? 0; 
      const needsChange = isPressed && wouldBeAffectedNotes === 0 || !isPressed && wouldBeAffectedNotes === 1;
      if(needsChange) {
        noteMap.forEach((otherMap, otherKey) => {
          if (map.target == otherMap.target) { return controllerChangeColor(otherKey, isPressed); }
        });
      }
    } else if (showSameNotePressed === "octave") {
      let wouldBeAffectedNotes = 0;
      activeNotes.forEach((n, k) => { if (n > 0 && areSameNote(map.target, k)) { wouldBeAffectedNotes += n; } });
      const needsChange = isPressed && wouldBeAffectedNotes === 0 || !isPressed && wouldBeAffectedNotes === 1;
      if(needsChange) {
        noteMap.forEach((otherMap, otherKey) => {
          if (areSameNote(map.target, otherMap.target)) { return controllerChangeColor(otherKey, isPressed); }
        });
      }
    } else {
      return controllerChangeColor(key, isPressed);
    }
  }

  function stopEverythingAudio() {
    if(selectedOutputDevice) {
      if(typeof selectedOutputDevice === 'string') {
        controller.forEach((_, key) => {
          releaseNoteAudio(key);
        });
      } else {
        stopEverythingAudioSynth(soundState);
      }
    }
  }

  function pressNoteAudio(note: Note, velocity: number = 1.0) {
    if(selectedOutputDevice) {
      if(typeof selectedOutputDevice === 'string') {
        sendMIDIPacket(selectedOutputDevice, [0x90, note, velocity]);
      } else {
        pressNoteAudioSynth(soundState, soundSettings, note, velocity);
      }
    } 
  }

  function releaseNoteAudio(note: Note) {
    if(selectedOutputDevice) {
      if(typeof selectedOutputDevice === 'string') {
        sendMIDIPacket(selectedOutputDevice, [0x80, note, 0]);
      } else {
        releaseNoteAudioSynth(soundState, note);
      }
    }
  }

  function playKey(key: Key, velocity: number = 1.0) {
    const map = noteMap.get(key);
    if (!map) throw "No mapping to play note";
    const k = controller.get(key);
    if (k !== undefined && !k.active) {
      controller.set(key, { ...k, active: true });
      handleNoteColor(key, true);
      increaseNoteMut(activeNotes, map.target);
      pressNoteAudio(map.target, velocity);
    }
  }

  function stopKey(key: Key) {
    const map = noteMap.get(key);
    if (!map) throw "No mapping to play note";
    const k = controller.get(key);
    if (k !== undefined && k.active) {
      controller.set(key, { ...k, active: false });
      handleNoteColor(key, false);
      decreaseNoteMut(activeNotes, map.target);
      releaseNoteAudio(map.target);
    }
  }

  function onMIDIMessage(event: MIDIMessageEvent) {
    if (!event.data) {
      return;
    }

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
    console.log("Sending all keyboard colors");
    noteMap.forEach((_, note) => {
      controllerChangeColor(note, false);
    });
  }

  function setNoteMap(newNoteMap: NoteMap) {
    stopEverythingAudio();
    noteMap = newNoteMap;
    sendAllKeyboardColors();
    localStorage.setItem("noteMap", noteMapToNiceNoteMapFormat(noteMap));
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
            if (target) { connectToInputDevice(target.value); }
          }}
        >
          {#each inputDevices as device}
            <option value={device.id}>{device.name}</option>
          {/each}
        </select>
      </div>
      <div class="device-group">
        <label for="output-device">Color Device:</label>
        <select
          id="output-device"
          value={selectedColorDevice}
          on:change={(e) => {
            const target = e.target as HTMLSelectElement;
            if (target) { connectToColorDevice(target.value); }
          }}
        >
          {#each outputDevices as device}
            <option value={device.id}>{device.name}</option>
          {/each}
        </select>
      </div>
      <div class="device-group">
        <label for="output-device">Output Device:</label>
        <select
          id="output-device"
          value={typeof selectedOutputDevice === 'string' ? selectedOutputDevice : 'default'}
          on:change={(e) => {
            const target = e.target as HTMLSelectElement;
            if (target) { connectToOutputDevice(target.value === 'default' ? 42 : target.value); }
          }}
        >
          <option value="default">Built-in synth</option>
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

  {#if typeof selectedOutputDevice !== 'string'}
  <div class="section">
    <h3>Sound Generator</h3>
    <SoundGenerator
      settings={soundSettings}
      onSettingsChange={(settings) => { soundSettings = settings; }}
      />
    </div>
  {/if}

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
    <h3>Default colors</h3>
    <DefaultColorsSettings
      {colorSettings}
      onColorSettingsChange={(settings) => {
        colorSettings = settings;
        setNoteMap(applyColorsToMap(settings, noteMap));
      }}
    />
  </div>

  <div class="section">
    <div class="mapping-container">
      <h3>Settings</h3>
      <div class="settings-controls">
        <div
          style="display: flex; flex-direction: column; align-items: flex-start; margin-bottom: 10px;"
        >
          <label>
            <input
              type="radio"
              name="show-same-note-pressed"
              checked={showSameNotePressed === "no"}
              on:change={() => (showSameNotePressed = "no")}
            />
            Light up only the physical button
          </label>
          <label>
            <input
              type="radio"
              name="show-same-note-pressed"
              checked={showSameNotePressed === "yes"}
              on:change={() => (showSameNotePressed = "yes")}
            />
            Light up any occurrence of the note
          </label>
          <label>
            <input
              type="radio"
              name="show-same-note-pressed"
              checked={showSameNotePressed === "octave"}
              on:change={() => (showSameNotePressed = "octave")}
            />
            Light up any occurrence of the note in any octave
          </label>
        </div>
      </div>
      <button
        on:click={sendAllKeyboardColors}
        class="action"
        style="margin-left: 24px;">Sync Keyboard</button
      >
    </div>
  </div>

  <div class="section">
    <MIDINoteMap {noteMap} onUpdateMap={setNoteMap} />
    <button
      style="margin-top: 10px;"
      on:click={() => setNoteMap(DEFAULT_MAPPINGS)}
      class="action">Reset Keyboard Layout</button
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
